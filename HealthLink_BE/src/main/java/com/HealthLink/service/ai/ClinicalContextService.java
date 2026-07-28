package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.*;
import com.HealthLink.entity.*;
import com.HealthLink.entity.ai.ClinicalContextSnapshot;
import com.HealthLink.entity.ai.EncounterClinicalContext;
import com.HealthLink.entity.ai.LabReport;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.exception.StaleClinicalContextVersionException;
import com.HealthLink.repository.ai.ClinicalContextSnapshotRepository;
import com.HealthLink.repository.ai.EncounterClinicalContextRepository;
import com.HealthLink.repository.ai.LabReportRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.repository.vitalsign.VitalSignRepository;
import com.HealthLink.utility.DoctorSecurityUtils;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.*;

@Service
public class ClinicalContextService {
    private final AppointmentRepository appointments;
    private final VitalSignRepository vitals;
    private final LabReportRepository reports;
    private final EncounterClinicalContextRepository contexts;
    private final ClinicalContextSnapshotRepository snapshots;
    private final ConsultationRepository consultations;
    private final DoctorSecurityUtils doctorSecurity;
    private final ObjectMapper canonicalMapper;

    public ClinicalContextService(AppointmentRepository appointments, VitalSignRepository vitals, LabReportRepository reports,
                                  EncounterClinicalContextRepository contexts, ClinicalContextSnapshotRepository snapshots,
                                  ConsultationRepository consultations, DoctorSecurityUtils doctorSecurity) {
        this.appointments = appointments;
        this.vitals = vitals;
        this.reports = reports;
        this.contexts = contexts;
        this.snapshots = snapshots;
        this.consultations = consultations;
        this.doctorSecurity = doctorSecurity;
        this.canonicalMapper = new ObjectMapper().registerModule(new JavaTimeModule())
                .configure(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY, true);
    }

    @Transactional(readOnly = true)
    public ClinicalContextPreviewResponse preview(Integer appointmentId) {
        Appointment appointment = authorized(appointmentId);
        return preview(appointment, contexts.findByAppointment_AppointmentId(appointmentId).orElse(null));
    }

    @Transactional
    public ClinicalContextPreviewResponse update(Integer appointmentId, ClinicalContextUpdateRequest request) {
        if (request == null || blank(request.symptoms()) || request.symptoms().trim().length() > 4000
                || (request.workingDiagnosis() != null && request.workingDiagnosis().trim().length() > 2000)
                || request.expectedContextVersion() == null || request.expectedContextVersion() < 0) {
            throw new BadRequestException("Invalid clinical context update request");
        }
        Appointment appointment = authorized(appointmentId);
        EncounterClinicalContext context = contexts.findByAppointment_AppointmentId(appointmentId).orElse(null);
        long actualVersion = context == null ? 0L : context.getRowVersion();
        if (actualVersion != request.expectedContextVersion()) throw new StaleClinicalContextVersionException();
        if (context == null) context = EncounterClinicalContext.builder().appointment(appointment).build();
        context.setDoctorSymptoms(request.symptoms().trim());
        context.setWorkingDiagnosis(trim(request.workingDiagnosis()));
        context.setFastingStatus(safetyStatus(request.fastingStatus(), "CONFIRMED", "UNKNOWN"));
        context.setPregnancyStatus(safetyStatus(request.pregnancyStatus(), "NOT_PREGNANT", "PREGNANT", "UNKNOWN"));
        context.setUpdatedAt(LocalDateTime.now());
        contexts.saveAndFlush(context);
        return preview(appointment, context);
    }

    @Transactional
    public ClinicalContextSnapshotResponse snapshot(Integer appointmentId, ClinicalContextSnapshotRequest request) {
        if (request == null || request.expectedContextVersion() == null || request.expectedContextVersion() < 0) {
            throw new BadRequestException("expectedContextVersion is required and must be non-negative");
        }
        Appointment appointment = authorized(appointmentId);
        EncounterClinicalContext context = contexts.findByAppointment_AppointmentId(appointmentId).orElse(null);
        long actualVersion = context == null ? 0L : context.getRowVersion();
        if (actualVersion != request.expectedContextVersion()) throw new StaleClinicalContextVersionException();
        ClinicalContextPreviewResponse preview = preview(appointment, context);
        List<LabReport> verifiedReports = verifiedReports(appointmentId);
        List<UUID> verifiedIds = verifiedReports.stream().map(LabReport::getReportId).toList();
        List<UUID> suppliedIds = request.verifiedLabReportIds() == null ? List.of() : request.verifiedLabReportIds();
        if (new LinkedHashSet<>(suppliedIds).size() != suppliedIds.size() || !new LinkedHashSet<>(verifiedIds).containsAll(suppliedIds)
                || suppliedIds.isEmpty()) {
            throw new BadRequestException("verifiedLabReportIds must contain only VERIFIED reports from this appointment");
        }
        if (!preview.ready()) throw new BadRequestException("Clinical context is incomplete: " + String.join(", ", preview.blockers().stream().map(ClinicalContextBlockerResponse::code).toList()));

        String canonicalJson = canonicalJson(preview, suppliedIds);
        String sha256 = sha256(canonicalJson);
        Instant createdAt = Instant.now();
        ClinicalContextSnapshot snapshot = ClinicalContextSnapshot.builder().snapshotId(UUID.randomUUID()).appointment(appointment)
                .contextVersion(actualVersion).canonicalJson(canonicalJson).sha256(sha256).createdByDoctor(appointment.getDoctor())
                .createdAt(createdAt).labReports(verifiedReports.stream()
                        .filter(report -> suppliedIds.contains(report.getReportId())).toList()).build();
        snapshots.save(snapshot);
        Map<String, Boolean> required = requiredFieldStatus(preview);
        Map<String, Object> provenance = new TreeMap<>();
        preview.fields().forEach((key, value) -> provenance.put(key, value.sourceType()));
        return new ClinicalContextSnapshotResponse(snapshot.getSnapshotId(), sha256, createdAt, required, provenance);
    }

    @Transactional(readOnly = true)
    public boolean isSnapshotCurrent(ClinicalContextSnapshot snapshot) {
        if (snapshot == null || snapshot.getAppointment() == null || snapshot.getSha256() == null) {
            return false;
        }
        Appointment appointment = snapshot.getAppointment();
        Integer appointmentId = appointment.getAppointmentId();
        EncounterClinicalContext context = contexts.findByAppointment_AppointmentId(appointmentId).orElse(null);
        ClinicalContextPreviewResponse currentPreview = preview(appointment, context);
        List<UUID> allVerifiedReportIds = verifiedReports(appointmentId).stream()
                .map(LabReport::getReportId)
                .toList();
        String currentSha256 = sha256(canonicalJson(currentPreview, allVerifiedReportIds));
        return snapshot.getSha256().equals(currentSha256);
    }

    private ClinicalContextPreviewResponse preview(Appointment appointment, EncounterClinicalContext context) {
        Patient patient = appointment.getPatient();
        VitalSign vital = vitals.findTopByAppointment_AppointmentIdOrderByMeasuredAtDesc(appointment.getAppointmentId()).orElse(null);
        Map<String, ClinicalContextFieldResponse> fields = new LinkedHashMap<>();
        fields.put("symptoms", fromContext(context == null ? null : context.getDoctorSymptoms(), context, "DOCTOR_INPUT"));
        fields.put("patientReportedSymptoms", appointmentValue(appointment.getSymptoms(), appointment));
        fields.put("workingDiagnosis", fromContext(context == null ? null : context.getWorkingDiagnosis(), context, "DOCTOR_INPUT"));
        fields.put("ageYears", age(patient, appointment));
        fields.put("sex", profile(patient == null ? null : patient.getGender(), patient, "sex"));
        fields.put("reasonForVisit", appointmentValue(appointment.getNotes(), appointment));
        fields.put("allergies", profile(patient == null ? null : patient.getAllergies(), patient, "allergies"));
        fields.put("chronicConditions", profile(patient == null ? null : patient.getChronicConditions(), patient, "chronicConditions"));
        fields.put("currentMedications", profile(patient == null ? null : patient.getCurrentMedications(), patient, "currentMedications"));
        fields.put("medicalHistorySummary", profile(patient == null ? null : patient.getMedicalHistorySummary(), patient, "medicalHistorySummary"));
        fields.put("heightCm", profile(patient == null ? null : patient.getHeightCm(), patient, "heightCm"));
        fields.put("weightKg", profile(patient == null ? null : patient.getWeightKg(), patient, "weightKg"));
        fields.put("bmi", bmi(patient));
        fields.put("bloodType", profile(patient == null ? null : patient.getBloodType(), patient, "bloodType"));
        fields.put("fastingStatus", fromContext(context == null ? null : context.getFastingStatus(), context, "DOCTOR_INPUT"));
        fields.put("pregnancyStatus", fromContext(context == null ? null : context.getPregnancyStatus(), context, "DOCTOR_INPUT"));
        fields.put("renalHepaticContext", unknown());
        fields.put("heartRate", vitalValue(vital == null ? null : vital.getHeartRate(), vital));
        fields.put("systolicBloodPressure", vitalValue(vital == null ? null : vital.getBloodPressureSystolic(), vital));
        fields.put("diastolicBloodPressure", vitalValue(vital == null ? null : vital.getBloodPressureDiastolic(), vital));
        fields.put("temperature", vitalValue(vital == null ? null : vital.getTemperature(), vital));
        fields.put("spo2", vitalValue(vital == null ? null : vital.getOxygenSaturation(), vital));
        fields.put("respiratoryRate", vitalValue(vital == null ? null : vital.getRespiratoryRate(), vital));
        fields.put("glucose", vitalValue(vital == null ? null : vital.getBloodGlucose(), vital));
        List<UUID> reportIds = verifiedReports(appointment.getAppointmentId()).stream().map(LabReport::getReportId).toList();
        fields.put("verifiedLabReportIds", reportIds.isEmpty() ? unknown() : new ClinicalContextFieldResponse(reportIds, "LAB_REPORT", null,
                null, "CURRENT", "VERIFIED"));
        List<ClinicalContextBlockerResponse> blockers = blockers(fields, vital, reportIds);
        return new ClinicalContextPreviewResponse(appointment.getAppointmentId(), context == null ? 0L : context.getRowVersion(),
                blockers.isEmpty(), blockers, fields);
    }

    private List<ClinicalContextBlockerResponse> blockers(Map<String, ClinicalContextFieldResponse> fields, VitalSign vital, List<UUID> reportIds) {
        List<ClinicalContextBlockerResponse> blockers = new ArrayList<>();
        if (fields.get("symptoms").value() == null) blockers.add(blocker("MISSING_SYMPTOMS"));
        if (vital == null) blockers.add(blocker("MISSING_APPOINTMENT_VITALS"));
        if (fields.get("ageYears").value() == null) blockers.add(blocker("MISSING_AGE"));
        if (fields.get("sex").value() == null) blockers.add(blocker("MISSING_SEX"));
        if (reportIds.isEmpty()) blockers.add(blocker("NO_VERIFIED_LABS"));
        return blockers;
    }

    private ClinicalContextBlockerResponse blocker(String code) { return new ClinicalContextBlockerResponse(code, code.replace('_', ' ').toLowerCase(Locale.ROOT)); }
    private Appointment authorized(Integer appointmentId) {
        Appointment appointment = appointments.findById(appointmentId).orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));
        doctorSecurity.requireAssignedDoctor(appointment);
        return appointment;
    }
    private List<LabReport> verifiedReports(Integer appointmentId) {
        return reports.findByAppointment_AppointmentIdOrderByUploadedAtDesc(appointmentId).stream().filter(report -> LabReport.VERIFIED.equals(report.getStatus())).toList();
    }
    private ClinicalContextFieldResponse age(Patient patient, Appointment appointment) {
        if (patient == null || patient.getDateOfBirth() == null || appointment.getAppointmentTime() == null) return unknown();
        int years = Period.between(patient.getDateOfBirth().toLocalDate(), appointment.getAppointmentTime().toLocalDate()).getYears();
        return years < 0 ? unknown() : new ClinicalContextFieldResponse(years, "PROFILE", patient.getPatientId(), patient.getDateOfBirth(), "CURRENT", "UNKNOWN");
    }
    private ClinicalContextFieldResponse bmi(Patient patient) {
        if (patient == null || patient.getHeightCm() == null || patient.getWeightKg() == null || patient.getHeightCm() <= 0 || patient.getWeightKg() <= 0) return unknown();
        double heightMeters = patient.getHeightCm() / 100.0d;
        double value = patient.getWeightKg() / (heightMeters * heightMeters);
        if (!Double.isFinite(value) || value < 5 || value > 150) return unknown();
        return new ClinicalContextFieldResponse(Math.round(value * 10d) / 10d, "DERIVED", patient.getPatientId(), null, "CURRENT", "UNKNOWN");
    }
    private ClinicalContextFieldResponse profile(Object value, Patient patient, String ignored) { return present(value) && patient != null ? new ClinicalContextFieldResponse(value, "PROFILE", patient.getPatientId(), null, "CURRENT", "UNKNOWN") : unknown(); }
    private ClinicalContextFieldResponse appointmentValue(String value, Appointment appointment) { return present(value) ? new ClinicalContextFieldResponse(value.trim(), "APPOINTMENT", String.valueOf(appointment.getAppointmentId()), appointment.getAppointmentTime(), "CURRENT", "UNKNOWN") : unknown(); }
    private ClinicalContextFieldResponse fromContext(String value, EncounterClinicalContext context, String sourceType) { return present(value) && context != null ? new ClinicalContextFieldResponse(value.trim(), sourceType, String.valueOf(context.getAppointmentId()), context.getUpdatedAt(), "CURRENT", "VERIFIED") : unknown(); }
    private ClinicalContextFieldResponse vitalValue(Object value, VitalSign vital) { return value != null && vital != null ? new ClinicalContextFieldResponse(value, "VITAL_SIGN", String.valueOf(vital.getVitalSignId()), vital.getMeasuredAt(), "CURRENT", "VERIFIED") : unknown(); }
    private ClinicalContextFieldResponse unknown() { return new ClinicalContextFieldResponse(null, "UNKNOWN", null, null, "UNKNOWN", "UNKNOWN"); }
    private static boolean present(Object value) { return value != null && (!(value instanceof String text) || !text.isBlank()); }
    private static boolean blank(String value) { return value == null || value.isBlank(); }
    private static String trim(String value) { return blank(value) ? null : value.trim(); }
    private static String safetyStatus(String value, String... allowed) {
        String normalized = blank(value) ? "UNKNOWN" : value.trim().toUpperCase(Locale.ROOT);
        return Arrays.asList(allowed).contains(normalized) ? normalized : "UNKNOWN";
    }
    private Map<String, Boolean> requiredFieldStatus(ClinicalContextPreviewResponse preview) {
        Map<String, Boolean> required = new LinkedHashMap<>();
        required.put("symptoms", preview.fields().get("symptoms").value() != null);
        required.put("appointmentVitals", preview.fields().get("heartRate").sourceType().equals("VITAL_SIGN") || preview.fields().get("systolicBloodPressure").sourceType().equals("VITAL_SIGN"));
        required.put("age", preview.fields().get("ageYears").value() != null);
        required.put("sex", preview.fields().get("sex").value() != null);
        required.put("verifiedLabs", preview.fields().get("verifiedLabReportIds").value() != null);
        return required;
    }
    private String canonicalJson(ClinicalContextPreviewResponse preview, List<UUID> reportIds) {
        try {
            Map<String, Object> canonical = new TreeMap<>();
            canonical.put("appointmentId", preview.appointmentId()); canonical.put("contextVersion", preview.contextVersion());
            canonical.put("fields", new TreeMap<>(preview.fields())); canonical.put("verifiedLabReportIds", reportIds.stream().map(UUID::toString).sorted().toList());
            return canonicalMapper.writeValueAsString(canonical);
        } catch (Exception exception) { throw new IllegalStateException("Unable to serialize clinical context snapshot", exception); }
    }
    private String sha256(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception exception) { throw new IllegalStateException("SHA-256 unavailable", exception); }
    }
}
