package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.chat.CreateRoomRequest;
import com.HealthLink.dto.pharmacy.*;
import com.HealthLink.dto.prescription.PrescriptionItemResponse;
import com.HealthLink.dto.prescription.PrescriptionResponse;
import com.HealthLink.entity.*;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.entity.enums.PrescriptionTiming;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ForbiddenException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.notification.DeviceTokenRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.repository.pharmacy.PharmacyConsultationRequestRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.chat.ChatService;
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

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class PharmacyConsultationRequestServiceImpl implements PharmacyConsultationRequestService {

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_IN_REVIEW = "IN_REVIEW";
    private static final String STATUS_ORDER_CREATED = "ORDER_CREATED";
    private static final String STATUS_CANCELLED = "CANCELLED";

    private final PharmacyConsultationRequestRepository consultationRequestRepository;
    private final PatientRepository patientRepository;
    private final PharmacyRepository pharmacyRepository;
    private final PrescriptionHeaderRepository prescriptionHeaderRepository;
    private final NotificationService notificationService;
    private final DeviceTokenRepository deviceTokenRepository;
    private final ObjectMapper objectMapper;
    private final ChatService chatService;

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
        attachRequestPrescriptions(
                consultationRequest,
                resolveRequestPrescriptions(patient, request.getPrescriptionHeaderIds())
        );

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

        // Auto-create ChatRoom when status moves to IN_REVIEW
        if (STATUS_IN_REVIEW.equals(targetStatus) && updated.getChatRoomId() == null) {
            try {
                String pharmacyUserId = updated.getPharmacy().getUser().getId();
                String patientUserId = updated.getPatient().getUser().getId();
                CreateRoomRequest roomRequest = CreateRoomRequest.builder()
                        .user1Id(pharmacyUserId)
                        .user2Id(patientUserId)
                        .build();
                com.HealthLink.dto.chat.ChatRoomDTO chatRoom = chatService.getOrCreateRoom(roomRequest);
                updated.setChatRoomId(chatRoom.getChatRoomId());
                consultationRequestRepository.save(updated);
            } catch (Exception ex) {
                log.warn("Failed to auto-create ChatRoom for consultation request {}: {}",
                        updated.getRequestId(), ex.getMessage());
            }
        }

        notifyPatientAboutRequestStatusAfterCommit(updated);
        return toResponse(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getRequestPrescriptions(Integer requestId, String pharmacyId) {
        PharmacyConsultationRequest consultationRequest = getRequestOrThrow(requestId);
        validatePharmacyOwnsRequest(consultationRequest, pharmacyId);

        return requestPrescriptionHeaders(consultationRequest).stream()
                .map(header -> toPrescriptionResponse(header, consultationRequest))
                .toList();
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
                .pharmacyUserId(request.getPharmacy() != null && request.getPharmacy().getUser() != null
                        ? request.getPharmacy().getUser().getId() : null)
                .symptoms(request.getSymptoms())
                .description(request.getDescription())
                .allergies(request.getAllergies())
                .attachments(deserializeAttachments(request.getAttachments()))
                .additionalNotes(request.getAdditionalNotes())
                .preferredDeliveryType(request.getPreferredDeliveryType())
                .status(request.getStatus())
                .chatRoomId(request.getChatRoomId())
                .pharmacyNotes(request.getPharmacyNotes())
                .patientFollowUpNotes(request.getPatientFollowUpNotes())
                .prescriptionHeaderIds(requestPrescriptionHeaders(request).stream()
                        .map(PrescriptionHeader::getPrescriptionHeaderId)
                        .toList())
                .pharmacyOrderId(request.getOrder() != null ? request.getOrder().getOrderId() : null)
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }

    private PrescriptionResponse toPrescriptionResponse(
            PrescriptionHeader header,
            PharmacyConsultationRequest request
    ) {
        return PrescriptionResponse.builder()
                .prescriptionHeaderId(header.getPrescriptionHeaderId())
                .appointmentId(null)
                .pharmacyRequestId(request != null ? request.getRequestId() : null)
                .patientId(header.getPatient() != null ? header.getPatient().getPatientId() : null)
                .patientName(header.getPatient() != null ? header.getPatient().getFullName() : null)
                .doctorId(null)
                .doctorName(null)
                .pharmacyId(request != null && request.getPharmacy() != null
                        ? request.getPharmacy().getPharmacyId() : null)
                .pharmacyName(request != null && request.getPharmacy() != null
                        ? request.getPharmacy().getName() : null)
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

    private List<PrescriptionHeader> resolveRequestPrescriptions(
            Patient patient,
            List<Integer> prescriptionHeaderIds
    ) {
        if (prescriptionHeaderIds == null || prescriptionHeaderIds.isEmpty()) {
            return List.of();
        }

        List<PrescriptionHeader> prescriptions = new ArrayList<>();
        for (Integer prescriptionHeaderId : new LinkedHashSet<>(prescriptionHeaderIds)) {
            if (prescriptionHeaderId == null) {
                continue;
            }
            PrescriptionHeader prescription = prescriptionHeaderRepository.findById(prescriptionHeaderId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "PrescriptionHeader",
                            "id",
                            prescriptionHeaderId
                    ));
            validatePatientOwnsPrescription(patient, prescription);
            prescriptions.add(prescription);
        }
        return prescriptions;
    }

    private void validatePatientOwnsPrescription(Patient patient, PrescriptionHeader prescription) {
        if (prescription.getPatient() == null
                || patient == null
                || !Objects.equals(prescription.getPatient().getPatientId(), patient.getPatientId())) {
            throw new ForbiddenException("Prescription does not belong to this patient");
        }
    }

    private void attachRequestPrescriptions(
            PharmacyConsultationRequest request,
            List<PrescriptionHeader> prescriptions
    ) {
        request.getRequestPrescriptions().clear();
        for (PrescriptionHeader prescription : prescriptions) {
            request.getRequestPrescriptions().add(PharmacyConsultationRequestPrescription.builder()
                    .consultationRequest(request)
                    .prescriptionHeader(prescription)
                    .build());
        }
    }

    private List<PrescriptionHeader> requestPrescriptionHeaders(PharmacyConsultationRequest request) {
        if (request.getRequestPrescriptions() == null) {
            return List.of();
        }
        return request.getRequestPrescriptions().stream()
                .map(PharmacyConsultationRequestPrescription::getPrescriptionHeader)
                .filter(Objects::nonNull)
                .toList();
    }

    private void validateManualStatusUpdate(String currentStatus, String targetStatus) {
        if (STATUS_ORDER_CREATED.equals(currentStatus) || STATUS_CANCELLED.equals(currentStatus)) {
            throw new BadRequestException("Request can no longer be updated from status " + currentStatus);
        }

        if (STATUS_ORDER_CREATED.equals(targetStatus)) {
            throw new BadRequestException(targetStatus + " can only be set by the system");
        }

        if (!List.of(STATUS_PENDING, STATUS_IN_REVIEW, STATUS_CANCELLED)
                .contains(targetStatus)) {
            throw new BadRequestException("Unsupported request status: " + targetStatus);
        }
    }

    private void validatePharmacyOwnsRequest(PharmacyConsultationRequest request, String pharmacyId) {
        if (request == null
                || request.getPharmacy() == null
                || request.getPharmacy().getPharmacyId() == null
                || !request.getPharmacy().getPharmacyId().equals(pharmacyId)) {
            throw new ForbiddenException("You are not allowed to view prescriptions for this request");
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
