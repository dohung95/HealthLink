package com.HealthLink.service.impl.prescription;

import com.HealthLink.dto.prescription.PrescriptionItemRequest;
import com.HealthLink.dto.prescription.PrescriptionItemResponse;
import com.HealthLink.dto.prescription.PrescriptionOpenedResponse;
import com.HealthLink.dto.prescription.PrescriptionRequest;
import com.HealthLink.dto.prescription.PrescriptionResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Medicine;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.PrescriptionItem;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.entity.enums.PrescriptionTiming;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ForbiddenException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.repository.medicine.MedicineRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.notification.NotificationService;
import com.HealthLink.service.prescription.PrescriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrescriptionServiceImpl implements PrescriptionService {

    private final PrescriptionHeaderRepository headerRepository;
    private final MedicineRepository medicineRepository;
    private final AppointmentRepository appointmentRepository;
    private final ConsultationRepository consultationRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public PrescriptionResponse createPrescription(PrescriptionRequest request) {
        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Appointment", "id", request.getAppointmentId()));

        if ("CANCELLED".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Cannot create prescription for a cancelled appointment");
        }
        if ("COMPLETED".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Cannot create prescription for a completed appointment");
        }
        Consultation consultation = appointment.getConsultation();
        if (consultation == null) {
            consultation = consultationRepository.findByAppointment_AppointmentId(request.getAppointmentId())
                    .orElse(null);
        }
        if (consultation == null || consultation.getStartTime() == null) {
            throw new BadRequestException("Consultation must be started before a prescription can be created");
        }

        if (!headerRepository.findByAppointment_AppointmentId(request.getAppointmentId()).isEmpty()) {
            throw new BadRequestException("A prescription already exists for this appointment");
        }

        String diagnosis = request.getDiagnosis();
        if (diagnosis == null || diagnosis.isBlank()) {
            diagnosis = consultation != null ? consultation.getDiagnosis() : null;
        }

        String notes = request.getNotes();
        if (notes == null || notes.isBlank()) {
            notes = consultation != null ? consultation.getDoctorNotes() : null;
        }

        PrescriptionHeader header = PrescriptionHeader.builder()
                .appointment(appointment)
                .patient(appointment.getPatient())
                .doctor(appointment.getDoctor())
                .issueDate(LocalDateTime.now())
                .diagnosis(diagnosis)
                .notes(notes)
                .validUntil(request.getValidUntil())
                .status("ISSUED")
                .prescriptionItems(new ArrayList<>())
                .build();

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<PrescriptionItem> items = new ArrayList<>();

        for (PrescriptionItemRequest itemReq : request.getItems()) {
            Medicine medicine = medicineRepository.findById(itemReq.getMedicineId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Medicine", "id", itemReq.getMedicineId()));

            BigDecimal itemTotal = BigDecimal.ZERO;
            if (medicine.getPrice() != null && itemReq.getQuantity() != null) {
                itemTotal = medicine.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            }

            PrescriptionItem item = PrescriptionItem.builder()
                    .prescriptionHeader(header)
                    .medicine(medicine)
                    .medicationName(medicine.getName())
                    .dosage(buildDosage(medicine))
                    .instructions(buildInstructions(medicine))
                    .totalSupplyDays(itemReq.getTotalSupplyDays())
                    .quantity(itemReq.getQuantity())
                    .unit(itemReq.getUnit() != null ? itemReq.getUnit() : medicine.getUnit())
                    .frequency(itemReq.getFrequency())
                    .timing(normalizeTimingRequired(itemReq.getTimings(), itemReq.getTiming()))
                    .route(itemReq.getRoute())
                    .notes(itemReq.getNotes())
                    .build();

            items.add(item);
            totalAmount = totalAmount.add(itemTotal);
        }

        header.getPrescriptionItems().addAll(items);
        header.setTotalAmount(totalAmount);

        PrescriptionHeader saved = headerRepository.save(header);

        notifyPatientAboutNewPrescription(saved);

        return toResponse(saved, null);
    }

    @Override
    @Transactional(readOnly = true)
    public PrescriptionResponse getPrescriptionById(Integer prescriptionHeaderId, String timing) {
        PrescriptionHeader header = getPrescriptionOrThrow(prescriptionHeaderId);
        String normalizedTiming = normalizeTimingOptional(timing);
        return toResponse(header, normalizedTiming);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPrescriptionsByPatient(String patientId) {
        return headerRepository.findByPatient_PatientId(patientId)
                .stream()
                .map(header -> toResponse(header, null))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPrescriptionsByDoctor(String doctorId) {
        return headerRepository.findByDoctor_DoctorId(doctorId)
                .stream()
                .map(header -> toResponse(header, null))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PrescriptionOpenedResponse markPrescriptionAsOpened(Integer prescriptionHeaderId, String patientId) {
        PrescriptionHeader header = getPrescriptionOrThrow(prescriptionHeaderId);

        if (header.getPatient() == null || !patientId.equals(header.getPatient().getPatientId())) {
            throw new ForbiddenException("You are not allowed to mark this prescription as opened");
        }

        if (header.getOpenedAt() != null) {
            return buildOpenedResponse(header);
        }

        LocalDateTime openedAt = LocalDateTime.now().withNano(0);
        headerRepository.markOpenedIfNeeded(prescriptionHeaderId, patientId, openedAt);

        PrescriptionHeader refreshed = headerRepository
                .findByPrescriptionHeaderIdAndPatient_PatientId(prescriptionHeaderId, patientId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "PrescriptionHeader", "id", prescriptionHeaderId));

        return buildOpenedResponse(refreshed);
    }

    private PrescriptionOpenedResponse buildOpenedResponse(PrescriptionHeader header) {
        return PrescriptionOpenedResponse.builder()
                .message("Prescription marked as opened")
                .prescriptionHeaderId(header.getPrescriptionHeaderId())
                .openedAt(header.getOpenedAt())
                .build();
    }

    private void notifyPatientAboutNewPrescription(PrescriptionHeader prescription) {
        try {
            User patientUser = prescription.getPatient() != null ? prescription.getPatient().getUser() : null;
            if (patientUser == null) {
                log.warn("Cannot notify about prescription {}: patient user is missing",
                        prescription.getPrescriptionHeaderId());
                return;
            }

            String doctorName = prescription.getDoctor() != null
                    ? prescription.getDoctor().getFullName()
                    : "your doctor";
            Integer prescriptionId = prescription.getPrescriptionHeaderId();
            String title = "New Prescription";
            String message = String.format(
                    "You have a new prescription from Dr. %s. You can now order from a pharmacy.",
                    doctorName
            );
            String actionUrl = "/prescriptions/" + prescriptionId;

            notificationService.sendWebSocketNotification(
                    patientUser,
                    NotificationType.PRESCRIPTION_ISSUED,
                    title,
                    message,
                    prescriptionId,
                    actionUrl
            );

            log.info("Prescription notification sent to patientUserId={}, prescriptionId={}",
                    patientUser.getId(), prescriptionId);
        } catch (Exception ex) {
            log.error("Failed to send prescription notification: {}", ex.getMessage(), ex);
        }
    }

    private PrescriptionHeader getPrescriptionOrThrow(Integer prescriptionHeaderId) {
        return headerRepository.findById(prescriptionHeaderId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "PrescriptionHeader", "id", prescriptionHeaderId));
    }

    private PrescriptionResponse toResponse(PrescriptionHeader header, String timingFilter) {
        List<PrescriptionItemResponse> itemResponses = header.getPrescriptionItems() == null
                ? List.of()
                : header.getPrescriptionItems().stream()
                .filter(item -> matchesTiming(item, timingFilter))
                .map(this::toItemResponse)
                .collect(Collectors.toList());

        return PrescriptionResponse.builder()
                .prescriptionHeaderId(header.getPrescriptionHeaderId())
                .appointmentId(header.getAppointment() != null ? header.getAppointment().getAppointmentId() : null)
                .pharmacyRequestId(null)
                .patientId(header.getPatient() != null ? header.getPatient().getPatientId() : null)
                .patientName(header.getPatient() != null ? header.getPatient().getFullName() : null)
                .doctorId(header.getDoctor() != null ? header.getDoctor().getDoctorId() : null)
                .doctorName(header.getDoctor() != null ? header.getDoctor().getFullName() : null)
                .specialty(header.getDoctor() != null ? header.getDoctor().getSpecialty() : null)
                .pharmacyId(null)
                .pharmacyName(null)
                .issueDate(header.getIssueDate())
                .diagnosis(header.getDiagnosis())
                .notes(header.getNotes())
                .validUntil(header.getValidUntil())
                .status(header.getStatus())
                .sourceAppointmentId(header.getSourceAppointmentId())
                .sourcePrescriptionHeaderId(header.getSourcePrescriptionHeaderId())
                .totalAmount(header.getTotalAmount())
                .items(itemResponses)
                .build();
    }

    private boolean matchesTiming(PrescriptionItem item, String timingFilter) {
        if (timingFilter == null) {
            return true;
        }

        return PrescriptionTiming.containsTiming(item.getTiming(), timingFilter);
    }

    private PrescriptionItemResponse toItemResponse(PrescriptionItem item) {
        return PrescriptionItemResponse.builder()
                .prescriptionItemId(item.getPrescriptionItemId())
                .medicineId(item.getMedicine() != null ? item.getMedicine().getMedicineId() : null)
                .medicationName(item.getMedicationName())
                .dosage(item.getDosage())
                .instructions(item.getInstructions())
                .totalSupplyDays(item.getTotalSupplyDays())
                .quantity(item.getQuantity())
                .unit(item.getUnit())
                .frequency(item.getFrequency())
                .timing(normalizeTimingForResponse(item.getTiming()))
                .timings(timingsForResponse(item.getTiming()))
                .route(item.getRoute())
                .notes(item.getNotes())
                .build();
    }

    private String normalizeTimingRequired(List<String> timings, String timing) {
        try {
            if (timings != null && !timings.isEmpty()) {
                return PrescriptionTiming.normalizeJoined(timings);
            }
            return PrescriptionTiming.normalizeJoined(timing);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException(ex.getMessage());
        }
    }

    private String normalizeTimingRequired(String timing) {
        return normalizeTimingRequired(null, timing);
    }

    private String normalizeTimingOptional(String timing) {
        if (timing == null || timing.isBlank()) {
            return null;
        }

        try {
            return PrescriptionTiming.normalize(timing);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException(ex.getMessage());
        }
    }

    private String normalizeTimingForResponse(String timing) {
        if (PrescriptionTiming.isSupported(timing)) {
            return PrescriptionTiming.normalizeJoined(timing);
        }
        return timing;
    }

    private List<String> timingsForResponse(String timing) {
        try {
            return PrescriptionTiming.splitNormalized(timing);
        } catch (IllegalArgumentException ex) {
            return List.of();
        }
    }

    @Override
    @Transactional
    public PrescriptionResponse requestRefill(String patientId, Integer prescriptionHeaderId) {
        PrescriptionHeader original = headerRepository.findById(prescriptionHeaderId)
                .orElseThrow(() -> new ResourceNotFoundException("PrescriptionHeader", "id", prescriptionHeaderId));

        if (original.getPatient() == null || !patientId.equals(original.getPatient().getPatientId())) {
            throw new com.HealthLink.exception.ForbiddenException("Prescription does not belong to this patient");
        }

        if (!"ISSUED".equalsIgnoreCase(original.getStatus())) {
            throw new com.HealthLink.exception.BadRequestException("Only ISSUED prescriptions can be refilled");
        }

        if (original.getValidUntil() != null && original.getValidUntil().isBefore(LocalDateTime.now())) {
            throw new com.HealthLink.exception.BadRequestException("Prescription has expired and cannot be refilled");
        }

        PrescriptionHeader refill = PrescriptionHeader.builder()
                .patient(original.getPatient())
                .doctor(original.getDoctor())
                .issueDate(LocalDateTime.now())
                .diagnosis(original.getDiagnosis())
                .notes(original.getNotes())
                .validUntil(original.getValidUntil())
                .status("ISSUED")
                .sourceAppointmentId(original.getSourceAppointmentId())
                .sourcePrescriptionHeaderId(original.getPrescriptionHeaderId())
                .totalAmount(original.getTotalAmount())
                .prescriptionItems(new ArrayList<>())
                .build();

        List<PrescriptionItem> items = new ArrayList<>();
        if (original.getPrescriptionItems() != null) {
            for (PrescriptionItem item : original.getPrescriptionItems()) {
                PrescriptionItem copy = PrescriptionItem.builder()
                        .prescriptionHeader(refill)
                        .medicine(item.getMedicine())
                        .medicationName(item.getMedicationName())
                        .dosage(item.getDosage())
                        .instructions(item.getInstructions())
                        .totalSupplyDays(item.getTotalSupplyDays())
                        .quantity(item.getQuantity())
                        .unit(item.getUnit())
                        .frequency(item.getFrequency())
                        .timing(item.getTiming())
                        .route(item.getRoute())
                        .notes(item.getNotes())
                        .build();
                items.add(copy);
            }
        }
        refill.getPrescriptionItems().addAll(items);

        PrescriptionHeader saved = headerRepository.save(refill);
        notifyPatientAboutNewPrescription(saved);

        log.info("Prescription {} refilled as new prescription {}", prescriptionHeaderId, saved.getPrescriptionHeaderId());
        return toResponse(saved, null);
    }

    private String buildDosage(Medicine medicine) {
        if (medicine.getStrength() == null && medicine.getUnit() == null) {
            return medicine.getName();
        }
        if (medicine.getStrength() == null) {
            return medicine.getUnit();
        }
        if (medicine.getUnit() == null) {
            return medicine.getStrength();
        }
        return medicine.getStrength() + " " + medicine.getUnit();
    }

    private String buildInstructions(Medicine medicine) {
        if (medicine.getDescription() != null && !medicine.getDescription().isBlank()) {
            return medicine.getDescription();
        }
        if (medicine.getIndications() != null && !medicine.getIndications().isBlank()) {
            return medicine.getIndications();
        }
        return "Use as directed";
    }
}
