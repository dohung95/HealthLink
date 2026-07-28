package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.CreateLabReportResponse;
import com.HealthLink.dto.ai.LabObservationUpdateRequest;
import com.HealthLink.dto.ai.LabObservationVerificationResponse;
import com.HealthLink.dto.ai.LabReportVerificationResponse;
import com.HealthLink.dto.ai.LabReportVerifyRequest;
import com.HealthLink.dto.ai.LabWarningResponse;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.ai.AiJob;
import com.HealthLink.entity.ai.AiJobType;
import com.HealthLink.entity.ai.LabObservation;
import com.HealthLink.entity.ai.LabObservationRevision;
import com.HealthLink.entity.ai.LabReport;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.exception.StaleLabReportVersionException;
import com.HealthLink.repository.ai.LabObservationRepository;
import com.HealthLink.repository.ai.LabObservationRevisionRepository;
import com.HealthLink.repository.ai.LabReportRepository;
import com.HealthLink.utility.DoctorSecurityUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class LabReportVerificationService {
    private static final Set<String> RECOGNIZED_UNITS = Set.of("mg/dL", "g/dL", "g/L", "mmol/L", "umol/L", "µmol/L",
            "10^9/L", "10*9/L", "10^12/L", "10*12/L", "%", "fL", "pg", "U/L", "IU/L", "mEq/L", "ng/mL");
    private static final Set<String> COMPARATORS = Set.of("<=", ">=", "<", ">", "=");
    private static final Pattern DECIMAL = Pattern.compile("[-+]?\\d+(?:\\.\\d+)?");
    private static final Pattern UCUM = Pattern.compile("[A-Za-z0-9%µμ*/.^-]+");

    private final LabReportRepository reports;
    private final LabObservationRepository observations;
    private final DoctorSecurityUtils doctorSecurity;
    private final LabObservationRevisionRepository revisions;
    private final AiJobService jobs;
    private final LabReportStatusPublisher statusPublisher;
    private final ObjectMapper mapper;

    @Autowired
    public LabReportVerificationService(LabReportRepository reports, LabObservationRepository observations,
                                        DoctorSecurityUtils doctorSecurity, LabObservationRevisionRepository revisions,
                                        AiJobService jobs, LabReportStatusPublisher statusPublisher, ObjectMapper mapper) {
        this.reports = reports;
        this.observations = observations;
        this.doctorSecurity = doctorSecurity;
        this.revisions = revisions;
        this.jobs = jobs;
        this.statusPublisher = statusPublisher;
        this.mapper = mapper;
    }

    // Focused constructor keeps unit tests independent from enqueue/publish plumbing.
    public LabReportVerificationService(LabReportRepository reports, LabObservationRepository observations,
                                        DoctorSecurityUtils doctorSecurity, LabObservationRevisionRepository revisions) {
        this(reports, observations, doctorSecurity, revisions, null, null, new ObjectMapper());
    }

    @Transactional(readOnly = true)
    public LabReportVerificationResponse verification(UUID reportId) {
        LabReport report = authorized(reportId);
        List<LabObservationVerificationResponse> rows = observations.findByReport_ReportIdOrderByRowOrderAsc(reportId).stream()
                .map(this::response).toList();
        List<LabWarningResponse> warnings = rows.stream().flatMap(row -> row.warnings().stream()).distinct().toList();
        return new LabReportVerificationResponse(reportId, report.getAppointment().getAppointmentId(), report.getStatus(),
                report.getRowVersion(), "/api/doctor/lab-reports/" + reportId + "/file", warnings, rows);
    }

    @Transactional
    public LabReportVerificationResponse updateObservation(UUID reportId, UUID observationId, LabObservationUpdateRequest request) {
        requireExpectedVersion(request == null ? null : request.expectedVersion());
        LabReport report = authorizedForMutation(reportId);
        assertVersion(report, request.expectedVersion());
        requireNeedsVerification(report);
        LabObservation observation = observations.findById(observationId)
                .filter(row -> reportId.equals(row.getReport().getReportId()))
                .orElseThrow(() -> new ResourceNotFoundException("Lab observation", "id", observationId));
        validateRequest(request);
        Map<String, Object> before = auditValues(observation);
        apply(observation, request);
        if (LabObservation.VERIFIED.equals(request.decision()) && hasUnitWarning(observation)) {
            throw new BadRequestException("UNIT_NOT_RECOGNIZED must be corrected or the row rejected");
        }
        observation.setVerificationStatus(request.decision());
        observation.setDoctorCorrected(!before.equals(auditValues(observation)));
        observation.setUpdatedAt(LocalDateTime.now());
        observations.save(observation);
        audit(report, observation, before, auditValues(observation));
        reports.saveAndFlush(report);
        return verification(reportId);
    }

    @Transactional
    public LabReportVerificationResponse verify(UUID reportId, LabReportVerifyRequest request) {
        requireExpectedVersion(request == null ? null : request.expectedVersion());
        LabReport report = authorizedForMutation(reportId);
        assertVersion(report, request.expectedVersion());
        requireNeedsVerification(report);
        List<LabObservation> rows = observations.findByReport_ReportIdOrderByRowOrderAsc(reportId);
        Set<UUID> acknowledged = request.observationIds() == null ? Set.of() : new LinkedHashSet<>(request.observationIds());
        Set<UUID> actual = rows.stream().map(LabObservation::getObservationId).collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        if (!actual.equals(acknowledged)) {
            throw new BadRequestException("Every active observation must be acknowledged exactly once");
        }
        if (rows.stream().anyMatch(row -> LabObservation.UNVERIFIED.equals(row.getVerificationStatus()))) {
            throw new BadRequestException("All observations must be VERIFIED or REJECTED before report verification");
        }
        if (rows.stream().noneMatch(row -> LabObservation.VERIFIED.equals(row.getVerificationStatus()))) {
            throw new BadRequestException("At least one observation must be VERIFIED");
        }
        if (rows.stream().anyMatch(row -> LabObservation.VERIFIED.equals(row.getVerificationStatus())
                && hasUnitWarning(row))) {
            throw new BadRequestException("UNIT_NOT_RECOGNIZED must be corrected or rejected");
        }
        report.setStatus(LabReport.VERIFIED);
        report.setVerifiedByDoctor(report.getAppointment().getDoctor());
        report.setVerifiedAt(LocalDateTime.now());
        reports.saveAndFlush(report);
        publish(report);
        return verification(reportId);
    }

    @Transactional
    public CreateLabReportResponse reprocess(UUID reportId) {
        LabReport report = authorizedForMutation(reportId);
        if (observations.findByReport_ReportIdOrderByRowOrderAsc(reportId).stream()
                .anyMatch(row -> LabObservation.VERIFIED.equals(row.getVerificationStatus()))) {
            throw new BadRequestException("A report with VERIFIED observations cannot be reprocessed");
        }
        if (!(LabReport.NEEDS_VERIFICATION.equals(report.getStatus()) || LabReport.OCR_FAILED.equals(report.getStatus())
                || LabReport.UPLOADED.equals(report.getStatus()) || LabReport.OCR_PENDING.equals(report.getStatus()))) {
            throw new BadRequestException("Lab report cannot be reprocessed from its current status");
        }
        if (jobs == null) {
            throw new IllegalStateException("OCR job service is not configured");
        }
        report.setStatus(LabReport.OCR_PENDING);
        AiJob job = jobs.enqueue(AiJobType.OCR_LAB_REPORT, "LabReport", reportId.toString(), UUID.randomUUID(), 3);
        reports.saveAndFlush(report);
        publish(report);
        return new CreateLabReportResponse(reportId, job.getJobId(), report.getStatus(), report.getUploadedAt());
    }

    private LabReport authorized(UUID reportId) {
        LabReport report = reports.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Lab report", "id", reportId));
        doctorSecurity.requireAssignedDoctor(report.getAppointment());
        return report;
    }

    private LabReport authorizedForMutation(UUID reportId) {
        LabReport report = reports.findByIdForVerificationMutation(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Lab report", "id", reportId));
        doctorSecurity.requireAssignedDoctor(report.getAppointment());
        return report;
    }

    private void requireExpectedVersion(Long expectedVersion) {
        if (expectedVersion == null || expectedVersion < 0) {
            throw new BadRequestException("expectedVersion is required and must be non-negative");
        }
    }

    private void assertVersion(LabReport report, Long expectedVersion) {
        if (report.getRowVersion() != expectedVersion) {
            throw new StaleLabReportVersionException();
        }
    }

    private void requireNeedsVerification(LabReport report) {
        if (!LabReport.NEEDS_VERIFICATION.equals(report.getStatus())) {
            throw new BadRequestException("Lab report is not awaiting doctor verification");
        }
    }

    private void validateRequest(LabObservationUpdateRequest request) {
        if (request == null || !(LabObservation.VERIFIED.equals(request.decision()) || LabObservation.REJECTED.equals(request.decision()))
                || blank(request.testNameRaw()) || blank(request.valueText()) || exceeds(request.testNameRaw(), 500)
                || exceeds(request.valueText(), 500) || exceeds(request.comparator(), 8) || exceeds(request.unitRaw(), 100)
                || exceeds(request.unitUcum(), 100) || exceeds(request.referenceText(), 500)
                || exceeds(request.abnormalFlag(), 32) || exceeds(request.testNameNormalized(), 500)
                || exceeds(request.loincCode(), 32) || (!blank(request.comparator()) && !COMPARATORS.contains(request.comparator()))
                || (!blank(request.unitUcum()) && !UCUM.matcher(normalizeMicro(request.unitUcum())).matches())
                || (request.referenceLow() != null && request.referenceHigh() != null
                    && request.referenceLow().compareTo(request.referenceHigh()) > 0)
                || (!blank(request.comparator()) && request.numericValue() == null)
                || numericValueDoesNotMatchText(request)) {
            throw new BadRequestException("Invalid laboratory observation verification request");
        }
    }

    private void apply(LabObservation row, LabObservationUpdateRequest request) {
        row.setTestNameRaw(request.testNameRaw().trim());
        row.setValueText(request.valueText().trim());
        row.setNumericValue(request.numericValue());
        row.setComparator(trim(request.comparator()));
        row.setUnitRaw(normalizeMicro(trim(request.unitRaw())));
        row.setUnitUcum(normalizeMicro(trim(request.unitUcum())));
        row.setReferenceLow(request.referenceLow());
        row.setReferenceHigh(request.referenceHigh());
        row.setReferenceText(trim(request.referenceText()));
        row.setAbnormalFlag(trim(request.abnormalFlag()));
        row.setTestNameNormalized(trim(request.testNameNormalized()));
        row.setLoincCode(trim(request.loincCode()));
    }

    private LabObservationVerificationResponse response(LabObservation row) {
        return new LabObservationVerificationResponse(row.getObservationId(), row.getRowOrder(), row.getTestNameRaw(),
                row.getTestNameNormalized(), row.getLoincCode(), row.getValueText(), row.getNumericValue(), row.getComparator(),
                row.getUnitRaw(), row.getUnitUcum(), row.getReferenceLow(), row.getReferenceHigh(), row.getReferenceText(),
                row.getAbnormalFlag(), row.getVerificationStatus(), row.isDoctorCorrected(), row.getSourcePage(), bbox(row), warnings(row));
    }

    private LabObservationVerificationResponse.BoundingBox bbox(LabObservation row) {
        if (blank(row.getSourceBoundingBoxJson())) return null;
        try {
            Map<String, Double> box = mapper.readValue(row.getSourceBoundingBoxJson(), new TypeReference<>() { });
            return new LabObservationVerificationResponse.BoundingBox(box.getOrDefault("x", 0d), box.getOrDefault("y", 0d),
                    box.getOrDefault("width", 0d), box.getOrDefault("height", 0d));
        } catch (Exception exception) {
            return null;
        }
    }

    private List<LabWarningResponse> warnings(LabObservation row) {
        return hasUnitWarning(row) ? List.of(new LabWarningResponse("UNIT_NOT_RECOGNIZED", row.getObservationId(), row.getRowOrder())) : List.of();
    }

    private boolean hasUnitWarning(LabObservation row) {
        return row.getUnitRaw() != null && !row.getUnitRaw().isBlank()
                && !RECOGNIZED_UNITS.contains(normalizeMicro(row.getUnitRaw().trim()));
    }

    private boolean numericValueDoesNotMatchText(LabObservationUpdateRequest request) {
        String text = request.valueText() == null ? null : request.valueText().trim();
        if (text == null || !DECIMAL.matcher(text).matches()) return false;
        return request.numericValue() == null || new BigDecimal(text).compareTo(request.numericValue()) != 0;
    }

    private Map<String, Object> auditValues(LabObservation row) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("testNameRaw", row.getTestNameRaw()); values.put("valueText", row.getValueText());
        values.put("numericValue", row.getNumericValue()); values.put("comparator", row.getComparator());
        values.put("unitRaw", row.getUnitRaw()); values.put("unitUcum", row.getUnitUcum());
        values.put("referenceLow", row.getReferenceLow()); values.put("referenceHigh", row.getReferenceHigh());
        values.put("referenceText", row.getReferenceText()); values.put("abnormalFlag", row.getAbnormalFlag());
        values.put("testNameNormalized", row.getTestNameNormalized()); values.put("loincCode", row.getLoincCode());
        values.put("verificationStatus", row.getVerificationStatus());
        return values;
    }

    private void audit(LabReport report, LabObservation row, Map<String, Object> before, Map<String, Object> after) {
        List<String> changed = new ArrayList<>();
        before.forEach((key, value) -> { if (!java.util.Objects.equals(value, after.get(key))) changed.add(key); });
        if (changed.isEmpty()) return;
        Doctor doctor = report.getAppointment().getDoctor();
        revisions.save(LabObservationRevision.builder().revisionId(UUID.randomUUID()).reportId(report.getReportId())
                .observationId(row.getObservationId()).doctorId(doctor.getDoctorId())
                .changedFieldsJson(write(changed)).beforeHash(hash(write(before))).afterHash(hash(write(after))).build());
    }

    private String write(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (Exception exception) { throw new IllegalStateException("Unable to create audit hash", exception); }
    }

    private String hash(String value) {
        try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException exception) { throw new IllegalStateException("SHA-256 unavailable", exception); }
    }

    private void publish(LabReport report) {
        if (statusPublisher == null) return;
        try { statusPublisher.publish(report.getAppointment().getDoctor().getUser().getId(),
                new LabReportStatusEvent(report.getReportId(), report.getAppointment().getAppointmentId(), report.getStatus())); }
        catch (RuntimeException ignored) { }
    }

    private static boolean blank(String value) { return value == null || value.isBlank(); }
    private static String trim(String value) { return blank(value) ? null : value.trim(); }
    private static boolean exceeds(String value, int maximum) { return value != null && value.length() > maximum; }
    private static String normalizeMicro(String value) { return value == null ? null : value.replace('μ', 'µ'); }
}
