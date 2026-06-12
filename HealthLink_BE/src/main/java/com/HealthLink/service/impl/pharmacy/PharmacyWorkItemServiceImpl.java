package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyWorkItemResponse;
import com.HealthLink.entity.PharmacyConsultationRequest;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.repository.pharmacy.PharmacyConsultationRequestRepository;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.HealthLink.service.pharmacy.PharmacyWorkItemService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class PharmacyWorkItemServiceImpl implements PharmacyWorkItemService {

    private static final String STAGE_NEW_REQUEST = "NEW_REQUEST";
    private static final String STAGE_CONSULTING = "CONSULTING";
    private static final String STAGE_REVISION_REQUESTED = "REVISION_REQUESTED";
    private static final String STAGE_AWAITING_PAYMENT = "AWAITING_PAYMENT";
    private static final String STAGE_PREPARING = "PREPARING";
    private static final String STAGE_READY = "READY";
    private static final String STAGE_SHIPPING = "SHIPPING";
    private static final String STAGE_DELIVERED = "DELIVERED";
    private static final String STAGE_COMPLETED = "COMPLETED";
    private static final String STAGE_CANCELLED = "CANCELLED";

    private static final String SOURCE_CONSULTATION_REQUEST = "CONSULTATION_REQUEST";
    private static final String SOURCE_DIRECT_ORDER = "DIRECT_ORDER";

    private static final String ACTION_ACCEPT_REQUEST = "ACCEPT_REQUEST";
    private static final String ACTION_REJECT_REQUEST = "REJECT_REQUEST";
    private static final String ACTION_CHAT = "CHAT";
    private static final String ACTION_VIDEO_CALL = "VIDEO_CALL";
    private static final String ACTION_CREATE_ORDER = "CREATE_ORDER";
    private static final String ACTION_UPDATE_ORDER_STATUS = "UPDATE_ORDER_STATUS";
    private static final String ACTION_CANCEL_ORDER = "CANCEL_ORDER";
    private static final String ACTION_VIEW_ONLY = "VIEW_ONLY";

    private static final String PAYMENT_STATUS_PAID = "PAID";

    private final PharmacyConsultationRequestRepository requestRepository;
    private final PharmacyOrderRepository orderRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public List<PharmacyWorkItemResponse> getWorkItemsByPharmacy(String pharmacyId) {
        List<PharmacyConsultationRequest> requests = requestRepository
                .findByPharmacy_PharmacyIdOrderByCreatedAtDesc(pharmacyId);

        List<PharmacyOrder> directOrders = orderRepository
                .findByPharmacy_PharmacyIdAndConsultationRequestIsNull(pharmacyId);

        Set<String> seenCaseIds = new HashSet<>();
        List<PharmacyWorkItemResponse> items = new ArrayList<>();

        for (PharmacyConsultationRequest request : requests) {
            PharmacyWorkItemResponse item = toWorkItem(request);
            if (seenCaseIds.add(item.getCaseId())) {
                items.add(item);
            }
        }

        for (PharmacyOrder order : directOrders) {
            String caseId = "ORD-" + order.getOrderId();
            if (seenCaseIds.add(caseId)) {
                items.add(toDirectOrderWorkItem(order));
            }
        }

        items.sort(Comparator.comparing(PharmacyWorkItemResponse::getSortAt,
                Comparator.nullsLast(Comparator.reverseOrder())));
        return items;
    }

    private PharmacyWorkItemResponse toWorkItem(PharmacyConsultationRequest request) {
        PharmacyOrder order = request.getOrder();
        String requestStatus = normalize(request.getStatus());
        String workflowStage = deriveStage(requestStatus, order);
        List<String> actions = deriveActions(workflowStage, request, order);
        String caseId = "REQ-" + request.getRequestId();
        LocalDateTime sortAt = order != null && order.getCreatedAt() != null
                ? order.getCreatedAt() : request.getCreatedAt();

        PharmacyWorkItemResponse.PharmacyWorkItemResponseBuilder builder = PharmacyWorkItemResponse.builder()
                .requestId(request.getRequestId())
                .workItemId(caseId)
                .caseId(caseId)
                .sourceType(SOURCE_CONSULTATION_REQUEST)
                .displayId("Request #" + request.getRequestId())
                .workflowStage(workflowStage)
                .availableActions(actions)
                .sortAt(sortAt)
                .hasConsultationRequest(true)
                .hasOrder(order != null)
                .patientId(request.getPatient() != null ? request.getPatient().getPatientId() : null)
                .patientName(request.getPatient() != null ? request.getPatient().getFullName() : null)
                .symptoms(request.getSymptoms())
                .description(request.getDescription())
                .allergies(request.getAllergies())
                .attachments(deserializeAttachments(request.getAttachments()))
                .additionalNotes(request.getAdditionalNotes())
                .preferredDeliveryType(request.getPreferredDeliveryType())
                .requestStatus(requestStatus)
                .chatRoomId(request.getChatRoomId())
                .pharmacyNotes(request.getPharmacyNotes())
                .patientFollowUpNotes(request.getPatientFollowUpNotes())
                .prescriptionHeaderIds(request.getRequestPrescriptions() != null
                        ? request.getRequestPrescriptions().stream()
                        .map(rp -> rp.getPrescriptionHeader() != null
                                ? rp.getPrescriptionHeader().getPrescriptionHeaderId() : null)
                        .filter(java.util.Objects::nonNull)
                        .toList()
                        : List.of())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt());

        if (order != null) {
            builder.orderId(order.getOrderId())
                    .orderNumber(order.getOrderNumber())
                    .displayId("Order #" + order.getOrderId())
                    .orderStatus(order.getStatus())
                    .paymentStatus(order.getPaymentStatus())
                    .patientConfirmedAt(order.getPatientConfirmedAt())
                    .medicineAmount(order.getMedicineAmount())
                    .deliveryFee(order.getDeliveryFee())
                    .totalAmount(order.getTotalAmount())
                    .deliveryType(order.getDeliveryType())
                    .deliveryAddress(order.getDeliveryAddress())
                    .itemCount(order.getOrderItems() != null ? order.getOrderItems().size() : 0)
                    .confirmedAt(order.getConfirmedAt())
                    .preparingAt(order.getPreparingAt())
                    .shippedAt(order.getShippedAt())
                    .deliveredAt(order.getDeliveredAt())
                    .cancelledAt(order.getCancelledAt())
                    .cancelReason(order.getCancelReason())
                    .cancelledBy(order.getCancelledBy())
                    .revisionRequestedAt(order.getRevisionRequestedAt())
                    .revisionRequestNotes(order.getRevisionRequestNotes())
                    .revisionResolvedAt(order.getRevisionResolvedAt())
                    .platformFee(order.getPlatformFee())
                    .pharmacyEarning(order.getPharmacyEarning());
        }

        return builder.build();
    }

    private PharmacyWorkItemResponse toDirectOrderWorkItem(PharmacyOrder order) {
        String caseId = "ORD-" + order.getOrderId();
        String workflowStage = deriveOrderStage(order);
        List<String> actions = deriveOrderActions(workflowStage, order);

        return PharmacyWorkItemResponse.builder()
                .caseId(caseId)
                .workItemId(caseId)
                .sourceType(SOURCE_DIRECT_ORDER)
                .displayId("Order #" + order.getOrderId())
                .workflowStage(workflowStage)
                .availableActions(actions)
                .sortAt(order.getCreatedAt())
                .hasConsultationRequest(false)
                .hasOrder(true)
                .patientId(order.getPatient() != null ? order.getPatient().getPatientId() : null)
                .patientName(order.getPatient() != null ? order.getPatient().getFullName() : null)
                .orderId(order.getOrderId())
                .orderNumber(order.getOrderNumber())
                .orderStatus(order.getStatus())
                .paymentStatus(order.getPaymentStatus())
                .patientConfirmedAt(order.getPatientConfirmedAt())
                .medicineAmount(order.getMedicineAmount())
                .deliveryFee(order.getDeliveryFee())
                .totalAmount(order.getTotalAmount())
                .deliveryType(order.getDeliveryType())
                .deliveryAddress(order.getDeliveryAddress())
                .itemCount(order.getOrderItems() != null ? order.getOrderItems().size() : 0)
                .confirmedAt(order.getConfirmedAt())
                .preparingAt(order.getPreparingAt())
                .shippedAt(order.getShippedAt())
                .deliveredAt(order.getDeliveredAt())
                .cancelledAt(order.getCancelledAt())
                .cancelReason(order.getCancelReason())
                .cancelledBy(order.getCancelledBy())
                .platformFee(order.getPlatformFee())
                .pharmacyEarning(order.getPharmacyEarning())
                .createdAt(order.getCreatedAt())
                .build();
    }

    private String deriveStage(String requestStatus, PharmacyOrder order) {
        if (order == null) {
            return switch (requestStatus) {
                case "PENDING" -> STAGE_NEW_REQUEST;
                case "NEED_MORE_INFO" -> STAGE_CONSULTING;
                case "IN_REVIEW" -> STAGE_CONSULTING;
                case "ORDER_CREATED" -> STAGE_AWAITING_PAYMENT;
                case "CANCELLED" -> STAGE_CANCELLED;
                default -> STAGE_NEW_REQUEST;
            };
        }
        return deriveOrderStage(order);
    }

    private String deriveOrderStage(PharmacyOrder order) {
        String orderStatus = normalize(order.getStatus());

        if ("CANCELLED".equals(orderStatus) || "REFUNDED".equals(orderStatus)) {
            return STAGE_CANCELLED;
        }

        if ("REVISION_REQUESTED".equals(orderStatus)) {
            return STAGE_REVISION_REQUESTED;
        }

        String paymentStatus = normalize(order.getPaymentStatus());

        if (!PAYMENT_STATUS_PAID.equals(paymentStatus)) {
            return STAGE_AWAITING_PAYMENT;
        }

        return switch (orderStatus) {
            case "PREPARING" -> STAGE_PREPARING;
            case "READY" -> STAGE_READY;
            case "SHIPPING" -> STAGE_SHIPPING;
            case "DELIVERED" -> STAGE_DELIVERED;
            case "COMPLETED" -> STAGE_COMPLETED;
            case "CANCELLED" -> STAGE_CANCELLED;
            default -> STAGE_AWAITING_PAYMENT;
        };
    }

    private List<String> deriveActions(String stage, PharmacyConsultationRequest request, PharmacyOrder order) {
        return switch (stage) {
            case STAGE_NEW_REQUEST -> List.of(ACTION_ACCEPT_REQUEST, ACTION_REJECT_REQUEST);
            case STAGE_CONSULTING -> {
                List<String> a = new ArrayList<>();
                if (request.getChatRoomId() != null) {
                    a.add(ACTION_CHAT);
                    a.add(ACTION_VIDEO_CALL);
                }
                a.add(ACTION_CREATE_ORDER);
                yield a;
            }
            case STAGE_REVISION_REQUESTED -> {
                List<String> a = new ArrayList<>();
                a.add(ACTION_CREATE_ORDER);
                if (request != null && request.getChatRoomId() != null) {
                    a.add(ACTION_CHAT);
                    a.add(ACTION_VIDEO_CALL);
                }
                yield a;
            }
            case STAGE_AWAITING_PAYMENT -> {
                List<String> a = new ArrayList<>();
                a.add(ACTION_VIEW_ONLY);
                if (request != null && request.getChatRoomId() != null) {
                    a.add(ACTION_CHAT);
                    a.add(ACTION_VIDEO_CALL);
                }
                yield a;
            }
            case STAGE_PREPARING -> List.of(ACTION_UPDATE_ORDER_STATUS, ACTION_CANCEL_ORDER);
            case STAGE_READY -> List.of(ACTION_UPDATE_ORDER_STATUS, ACTION_CANCEL_ORDER);
            case STAGE_SHIPPING -> List.of(ACTION_UPDATE_ORDER_STATUS);
            case STAGE_DELIVERED -> List.of(ACTION_UPDATE_ORDER_STATUS);
            case STAGE_COMPLETED -> List.of(ACTION_VIEW_ONLY);
            case STAGE_CANCELLED -> List.of(ACTION_VIEW_ONLY);
            default -> List.of(ACTION_VIEW_ONLY);
        };
    }

    private List<String> deriveOrderActions(String stage, PharmacyOrder order) {
        return switch (stage) {
            case STAGE_PREPARING -> List.of(ACTION_UPDATE_ORDER_STATUS, ACTION_CANCEL_ORDER);
            case STAGE_READY -> List.of(ACTION_UPDATE_ORDER_STATUS, ACTION_CANCEL_ORDER);
            case STAGE_SHIPPING -> List.of(ACTION_UPDATE_ORDER_STATUS);
            case STAGE_DELIVERED -> List.of(ACTION_UPDATE_ORDER_STATUS);
            case STAGE_COMPLETED -> List.of(ACTION_VIEW_ONLY);
            case STAGE_CANCELLED -> List.of(ACTION_VIEW_ONLY);
            default -> List.of(ACTION_VIEW_ONLY);
        };
    }

    private List<String> deserializeAttachments(String attachments) {
        if (attachments == null || attachments.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(attachments, new TypeReference<>() {});
        } catch (Exception ex) {
            log.warn("Failed to deserialize request attachments");
            return List.of();
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }
}
