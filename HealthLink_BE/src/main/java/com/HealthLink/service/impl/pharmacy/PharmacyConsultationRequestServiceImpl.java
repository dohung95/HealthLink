package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.*;
import com.HealthLink.dto.prescription.PrescriptionItemResponse;
import com.HealthLink.dto.prescription.PrescriptionResponse;
import com.HealthLink.entity.*;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.entity.enums.PrescriptionTiming;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.medicine.MedicineRepository;
import com.HealthLink.repository.notification.DeviceTokenRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.repository.pharmacy.PharmacyConsultationRequestRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.notification.NotificationService;
import com.HealthLink.service.pharmacy.PharmacyConsultationRequestService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PharmacyConsultationRequestServiceImpl implements PharmacyConsultationRequestService {

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_IN_REVIEW = "IN_REVIEW";
    private static final String STATUS_NEED_MORE_INFO = "NEED_MORE_INFO";
    private static final String STATUS_PRESCRIPTION_CREATED = "PRESCRIPTION_CREATED";
    private static final String STATUS_ORDER_CREATED = "ORDER_CREATED";
    private static final String STATUS_CANCELLED = "CANCELLED";

    private static final String PRESCRIPTION_STATUS_ISSUED = "ISSUED";

    private final PharmacyConsultationRequestRepository consultationRequestRepository;
    private final PatientRepository patientRepository;
    private final PharmacyRepository pharmacyRepository;
    private final MedicineRepository medicineRepository;
    private final PrescriptionHeaderRepository prescriptionHeaderRepository;
    private final NotificationService notificationService;
    private final DeviceTokenRepository deviceTokenRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public PharmacyConsultationRequestResponse createRequest(PharmacyConsultationRequestCreateRequest request) {
        validateRequestContent(request.getSymptoms(), request.getDescription());

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", request.getPatientId()));

        Pharmacy pharmacy = pharmacyRepository.findById(request.getPharmacyId())
                .orElseThrow(() -> new ResourceNotFoundException("Pharmacy", "id", request.getPharmacyId()));

        PharmacyConsultationRequest consultationRequest = PharmacyConsultationRequest.builder()
                .patient(patient)
                .pharmacy(pharmacy)
                .symptoms(trimToNull(request.getSymptoms()))
                .description(trimToNull(request.getDescription()))
                .allergies(trimToNull(request.getAllergies()))
                .attachments(serializeAttachments(request.getAttachments()))
                .additionalNotes(trimToNull(request.getAdditionalNotes()))
                .preferredDeliveryType(normalizeDeliveryType(request.getPreferredDeliveryType()))
                .status(STATUS_PENDING)
                .build();

        PharmacyConsultationRequest saved = consultationRequestRepository.save(consultationRequest);
        notifyPharmacyAboutNewRequestAfterCommit(saved);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PharmacyConsultationRequestResponse> getRequestsByPharmacy(String pharmacyId, String status) {
        List<PharmacyConsultationRequest> requests = (status != null && !status.isBlank())
                ? consultationRequestRepository.findByPharmacy_PharmacyIdAndStatusOrderByCreatedAtDesc(
                        pharmacyId,
                        normalizeStatus(status)
                )
                : consultationRequestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc(pharmacyId);

        return requests.stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PharmacyConsultationRequestResponse> getRequestsByPatient(String patientId) {
        return consultationRequestRepository.findByPatient_PatientIdOrderByCreatedAtDesc(patientId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PharmacyConsultationRequestResponse getRequestById(Integer requestId) {
        return toResponse(getRequestOrThrow(requestId));
    }

    @Override
    @Transactional
    public PharmacyConsultationRequestResponse updateRequestStatus(
            Integer requestId,
            PharmacyConsultationRequestStatusUpdateRequest request
    ) {
        PharmacyConsultationRequest consultationRequest = getRequestOrThrow(requestId);
        String targetStatus = normalizeStatus(request.getStatus());
        String currentStatus = normalizeStatus(consultationRequest.getStatus());

        validateManualStatusUpdate(currentStatus, targetStatus);

        consultationRequest.setStatus(targetStatus);
        if (request.getPharmacyNotes() != null) {
            consultationRequest.setPharmacyNotes(trimToNull(request.getPharmacyNotes()));
        }
        if (request.getPatientFollowUpNotes() != null) {
            consultationRequest.setPatientFollowUpNotes(trimToNull(request.getPatientFollowUpNotes()));
        }

        PharmacyConsultationRequest updated = consultationRequestRepository.save(consultationRequest);
        notifyPatientAboutRequestStatusAfterCommit(updated);
        return toResponse(updated);
    }

    @Override
    @Transactional
    public PharmacyPrescriptionCreationResponse createPrescription(
            Integer requestId,
            PharmacyPrescriptionRequest request
    ) {
        PharmacyConsultationRequest consultationRequest = getRequestOrThrow(requestId);
        validatePrescriptionCreation(consultationRequest);

        PrescriptionHeader header = PrescriptionHeader.builder()
                .appointment(null)
                .patient(consultationRequest.getPatient())
                .doctor(null)
                .issueDate(LocalDateTime.now())
                .diagnosis(trimToNull(request.getDiagnosis()))
                .notes(trimToNull(request.getNotes()))
                .validUntil(request.getValidUntil())
                .status(PRESCRIPTION_STATUS_ISSUED)
                .prescriptionItems(new ArrayList<>())
                .build();

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<PrescriptionItem> items = new ArrayList<>();

        for (PharmacyPrescriptionItemRequest itemRequest : request.getItems()) {
            Medicine medicine = medicineRepository.findById(itemRequest.getMedicineId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Medicine",
                            "id",
                            itemRequest.getMedicineId()
                    ));

            BigDecimal unitPrice = itemRequest.getUnitPrice() != null
                    ? itemRequest.getUnitPrice()
                    : medicine.getReferencePrice();

            BigDecimal totalPrice = BigDecimal.ZERO;
            if (unitPrice != null && itemRequest.getQuantity() != null) {
                totalPrice = unitPrice.multiply(BigDecimal.valueOf(itemRequest.getQuantity()));
            }

            PrescriptionItem item = PrescriptionItem.builder()
                    .prescriptionHeader(header)
                    .medicine(medicine)
                    .medicationName(medicine.getName())
                    .dosage(buildDosage(medicine))
                    .instructions(buildInstructions(medicine))
                    .totalSupplyDays(itemRequest.getTotalSupplyDays())
                    .quantity(itemRequest.getQuantity())
                    .unit(itemRequest.getUnit() != null ? itemRequest.getUnit() : medicine.getUnit())
                    .frequency(itemRequest.getFrequency())
                    .timing(normalizeTiming(itemRequest.getTimings(), itemRequest.getTiming()))
                    .route(itemRequest.getRoute())
                    .unitPrice(unitPrice)
                    .totalPrice(totalPrice)
                    .notes(itemRequest.getNotes())
                    .build();

            items.add(item);
            totalAmount = totalAmount.add(totalPrice);
        }

        header.getPrescriptionItems().addAll(items);
        header.setTotalAmount(totalAmount);

        PrescriptionHeader savedHeader = prescriptionHeaderRepository.save(header);

        consultationRequest.setPrescriptionHeader(savedHeader);
        consultationRequest.setStatus(STATUS_PRESCRIPTION_CREATED);
        PharmacyConsultationRequest savedRequest = consultationRequestRepository.save(consultationRequest);
        savedHeader.setConsultationRequest(savedRequest);
        notifyPatientAboutPrescriptionAfterCommit(savedRequest, savedHeader);

        return PharmacyPrescriptionCreationResponse.builder()
                .request(toResponse(savedRequest))
                .prescription(toPrescriptionResponse(savedHeader))
                .build();
    }

    private PharmacyConsultationRequest getRequestOrThrow(Integer requestId) {
        return consultationRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "PharmacyConsultationRequest",
                        "id",
                        requestId
                ));
    }

    private PharmacyConsultationRequestResponse toResponse(PharmacyConsultationRequest request) {
        return PharmacyConsultationRequestResponse.builder()
                .requestId(request.getRequestId())
                .patientId(request.getPatient() != null ? request.getPatient().getPatientId() : null)
                .patientName(request.getPatient() != null ? request.getPatient().getFullName() : null)
                .pharmacyId(request.getPharmacy() != null ? request.getPharmacy().getPharmacyId() : null)
                .pharmacyName(request.getPharmacy() != null ? request.getPharmacy().getName() : null)
                .symptoms(request.getSymptoms())
                .description(request.getDescription())
                .allergies(request.getAllergies())
                .attachments(deserializeAttachments(request.getAttachments()))
                .additionalNotes(request.getAdditionalNotes())
                .preferredDeliveryType(request.getPreferredDeliveryType())
                .status(request.getStatus())
                .pharmacyNotes(request.getPharmacyNotes())
                .patientFollowUpNotes(request.getPatientFollowUpNotes())
                .prescriptionHeaderId(request.getPrescriptionHeader() != null
                        ? request.getPrescriptionHeader().getPrescriptionHeaderId()
                        : null)
                .pharmacyOrderId(request.getOrder() != null ? request.getOrder().getOrderId() : null)
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }

    private PrescriptionResponse toPrescriptionResponse(PrescriptionHeader header) {
        return PrescriptionResponse.builder()
                .prescriptionHeaderId(header.getPrescriptionHeaderId())
                .appointmentId(null)
                .pharmacyRequestId(header.getConsultationRequest() != null
                        ? header.getConsultationRequest().getRequestId() : null)
                .patientId(header.getPatient() != null ? header.getPatient().getPatientId() : null)
                .patientName(header.getPatient() != null ? header.getPatient().getFullName() : null)
                .doctorId(null)
                .doctorName(null)
                .pharmacyId(header.getConsultationRequest() != null
                        && header.getConsultationRequest().getPharmacy() != null
                        ? header.getConsultationRequest().getPharmacy().getPharmacyId() : null)
                .pharmacyName(header.getConsultationRequest() != null
                        && header.getConsultationRequest().getPharmacy() != null
                        ? header.getConsultationRequest().getPharmacy().getName() : null)
                .issueDate(header.getIssueDate())
                .diagnosis(header.getDiagnosis())
                .notes(header.getNotes())
                .validUntil(header.getValidUntil())
                .status(header.getStatus())
                .totalAmount(header.getTotalAmount())
                .items(header.getPrescriptionItems() == null
                        ? List.of()
                        : header.getPrescriptionItems().stream().map(this::toItemResponse).toList())
                .build();
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
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .notes(item.getNotes())
                .build();
    }

    private void validateRequestContent(String symptoms, String description) {
        if (trimToNull(symptoms) == null && trimToNull(description) == null) {
            throw new BadRequestException("Symptoms or description is required");
        }
    }

    private void validateManualStatusUpdate(String currentStatus, String targetStatus) {
        if (STATUS_PRESCRIPTION_CREATED.equals(currentStatus)
                || STATUS_ORDER_CREATED.equals(currentStatus)
                || STATUS_CANCELLED.equals(currentStatus)) {
            throw new BadRequestException("Request can no longer be updated from status " + currentStatus);
        }

        if (STATUS_PRESCRIPTION_CREATED.equals(targetStatus) || STATUS_ORDER_CREATED.equals(targetStatus)) {
            throw new BadRequestException(targetStatus + " can only be set by the system");
        }

        if (!List.of(STATUS_PENDING, STATUS_IN_REVIEW, STATUS_NEED_MORE_INFO, STATUS_CANCELLED)
                .contains(targetStatus)) {
            throw new BadRequestException("Unsupported request status: " + targetStatus);
        }
    }

    private void validatePrescriptionCreation(PharmacyConsultationRequest request) {
        String status = normalizeStatus(request.getStatus());
        if (STATUS_CANCELLED.equals(status)) {
            throw new BadRequestException("Cannot create prescription for a cancelled request");
        }

        if (STATUS_ORDER_CREATED.equals(status) || request.getOrder() != null) {
            throw new BadRequestException("This request already follows the direct order flow");
        }

        if (STATUS_PRESCRIPTION_CREATED.equals(status) || request.getPrescriptionHeader() != null) {
            throw new BadRequestException("Prescription has already been created for this request");
        }
    }

    private String normalizeStatus(String status) {
        String normalized = trimToNull(status);
        if (normalized == null) {
            throw new BadRequestException("Status is required");
        }

        return normalized.toUpperCase();
    }

    private String normalizeDeliveryType(String deliveryType) {
        String normalized = trimToNull(deliveryType);
        return normalized != null ? normalized : "Delivery";
    }

    private String normalizeTiming(List<String> timings, String timing) {
        try {
            if (timings != null && !timings.isEmpty()) {
                return PrescriptionTiming.normalizeJoined(timings);
            }
            return PrescriptionTiming.normalizeJoined(timing);
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String serializeAttachments(List<String> attachments) {
        if (attachments == null || attachments.isEmpty()) {
            return null;
        }

        try {
            return objectMapper.writeValueAsString(attachments);
        } catch (Exception ex) {
            throw new BadRequestException("Unable to serialize attachments");
        }
    }

    private List<String> deserializeAttachments(String attachments) {
        if (attachments == null || attachments.isBlank()) {
            return List.of();
        }

        try {
            return objectMapper.readValue(attachments, new TypeReference<>() {
            });
        } catch (Exception ex) {
            log.warn("Failed to deserialize request attachments for pharmacy consultation request");
            return List.of();
        }
    }

    private void notifyPharmacyAboutNewRequestAfterCommit(PharmacyConsultationRequest request) {
        User pharmacyUser = request.getPharmacy() != null ? request.getPharmacy().getUser() : null;
        if (pharmacyUser == null) {
            return;
        }

        String title = "New pharmacy request";
        String patientName = request.getPatient() != null ? request.getPatient().getFullName() : "Unknown patient";
        String message = String.format(
                "%s sent a new consultation request to your pharmacy.",
                patientName
        );

        runAfterCommit("new pharmacy request notification", () ->
                notificationService.sendWebSocketNotification(
                        pharmacyUser,
                        NotificationType.NEW_PHARMACY_REQUEST,
                        title,
                        message,
                        request.getRequestId(),
                        "/pharmacy-requests/" + request.getRequestId()
                ));
    }

    private void notifyPatientAboutRequestStatusAfterCommit(PharmacyConsultationRequest request) {
        User patientUser = request.getPatient() != null ? request.getPatient().getUser() : null;
        if (patientUser == null) {
            return;
        }

        String title = "Pharmacy request updated";
        String message = String.format(
                "Request %s is now %s.",
                request.getRequestId(),
                request.getStatus()
        );

        boolean hasActiveMobileToken = !deviceTokenRepository
                .findByUser_IdAndActiveTrue(patientUser.getId())
                .isEmpty();

        runAfterCommit("pharmacy request status notification", () -> {
            notificationService.sendWebSocketNotification(
                    patientUser,
                    NotificationType.ORDER_STATUS,
                    title,
                    message,
                    request.getRequestId(),
                    "/pharmacy-requests/" + request.getRequestId()
            );

            if (hasActiveMobileToken) {
                notificationService.sendMobilePushNotification(
                        patientUser,
                        NotificationType.ORDER_STATUS,
                        title,
                        message,
                        NotificationPriority.NORMAL,
                        request.getRequestId(),
                        "/pharmacy-requests/" + request.getRequestId()
                );
            }
        });
    }

    private void notifyPatientAboutPrescriptionAfterCommit(
            PharmacyConsultationRequest request,
            PrescriptionHeader prescriptionHeader
    ) {
        User patientUser = request.getPatient() != null ? request.getPatient().getUser() : null;
        if (patientUser == null) {
            return;
        }

        String pharmacyName = request.getPharmacy() != null ? request.getPharmacy().getName() : "Pharmacy";
        String title = "Prescription ready";
        String message = String.format(
                "%s created prescription %s for your request %s.",
                pharmacyName,
                prescriptionHeader.getPrescriptionHeaderId(),
                request.getRequestId()
        );

        boolean hasActiveMobileToken = !deviceTokenRepository
                .findByUser_IdAndActiveTrue(patientUser.getId())
                .isEmpty();

        runAfterCommit("new prescription notification", () -> {
            notificationService.sendWebSocketNotification(
                    patientUser,
                    NotificationType.NEW_PRESCRIPTION,
                    title,
                    message,
                    prescriptionHeader.getPrescriptionHeaderId(),
                    "/prescriptions/" + prescriptionHeader.getPrescriptionHeaderId()
            );

            if (hasActiveMobileToken) {
                notificationService.sendMobilePushNotification(
                        patientUser,
                        NotificationType.NEW_PRESCRIPTION,
                        title,
                        message,
                        NotificationPriority.NORMAL,
                        prescriptionHeader.getPrescriptionHeaderId(),
                        "/prescriptions/" + prescriptionHeader.getPrescriptionHeaderId()
                );
            }
        });
    }

    private void runAfterCommit(String context, Runnable task) {
        Runnable safeTask = () -> {
            try {
                task.run();
            } catch (Exception ex) {
                log.error("Failed to send {} after commit: {}", context, ex.getMessage(), ex);
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    safeTask.run();
                }
            });
            return;
        }

        safeTask.run();
    }
}
