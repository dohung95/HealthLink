package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyWorkItemResponse;
import com.HealthLink.entity.PharmacyConsultationRequest;
import com.HealthLink.entity.PharmacyDeliveryContactChangeRequest;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.repository.pharmacy.PharmacyConsultationRequestRepository;
import com.HealthLink.repository.pharmacy.PharmacyDeliveryContactChangeRequestRepository;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.HealthLink.service.impl.pharmacy.PharmacyServiceHelper;
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
@Transactional(readOnly = true)
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

    private static final String REQUEST_TYPE_CONSULTATION = "CONSULTATION";
    private static final String REQUEST_TYPE_ORDER_REQUEST = "ORDER_REQUEST";
    private static final String SOURCE_ORDER_REQUEST = "ORDER_REQUEST";

    private static final String SOURCE_CONSULTATION_REQUEST = "CONSULTATION_REQUEST";
    private static final String SOURCE_DIRECT_ORDER = "DIRECT_ORDER";
    private static final String SOURCE_RETAIL_ORDER = "RETAIL_ORDER";
    private static final String SOURCE_DELIVERY_CONTACT_CHANGE_REQUEST = "DELIVERY_CONTACT_CHANGE_REQUEST";
    private static final String SOURCE_DELIVERY_QUOTE_REQUEST = "DELIVERY_QUOTE_REQUEST";
    private static final String SOURCE_PICKUP_ORDER_REVIEW = "PICKUP_ORDER_REVIEW";

    private static final String STAGE_DELIVERY_CONTACT_REVIEW = "DELIVERY_CONTACT_REVIEW";

    private static final String ACTION_ACCEPT_REQUEST = "ACCEPT_REQUEST";
    private static final String ACTION_APPROVE_DELIVERY_CONTACT_CHANGE = "APPROVE_DELIVERY_CONTACT_CHANGE";
    private static final String ACTION_REJECT_DELIVERY_CONTACT_CHANGE = "REJECT_DELIVERY_CONTACT_CHANGE";
    private static final String ACTION_REJECT_REQUEST = "REJECT_REQUEST";
    private static final String ACTION_CHAT = "CHAT";
    private static final String ACTION_VIDEO_CALL = "VIDEO_CALL";
    private static final String ACTION_CREATE_ORDER = "CREATE_ORDER";
    private static final String ACTION_SEND_DELIVERY_QUOTE = "SEND_DELIVERY_QUOTE";
    private static final String ACTION_UPDATE_ORDER_STATUS = "UPDATE_ORDER_STATUS";
    private static final String ACTION_CANCEL_ORDER = "CANCEL_ORDER";
    private static final String ACTION_VIEW_ONLY = "VIEW_ONLY";
    private static final String ACTION_UPDATE_QUOTE = "UPDATE_QUOTE";

    private static final String PAYMENT_STATUS_PAID = "PAID";

    private final PharmacyConsultationRequestRepository requestRepository;
    private final PharmacyOrderRepository orderRepository;
    private final PharmacyDeliveryContactChangeRequestRepository deliveryContactChangeRequestRepository;
    private final ObjectMapper objectMapper;

    private boolean isClosedRequestStatus(String requestStatus) {
        return Set.of("CANCELLED", "REJECTED").contains(normalize(requestStatus));
    }

    private boolean isTerminalOrderStatus(PharmacyOrder order) {
        if (order == null) {
            return false;
        }
        return Set.of("DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED")
                .contains(normalize(order.getStatus()));
    }

    private boolean shouldIncludeRequestWorkItem(PharmacyConsultationRequest request) {
        if (request == null || isClosedRequestStatus(request.getStatus())) {
            return false;
        }

        PharmacyOrder order = request.getOrder();
        String requestStatus = normalize(request.getStatus());
        String requestType = PharmacyServiceHelper.requestTypeOf(request);

        if (order == null) {
            return Set.of("PENDING", "NEED_MORE_INFO", "IN_REVIEW").contains(requestStatus);
        }

        if (isTerminalOrderStatus(order)) {
            return false;
        }

        String orderStatus = normalize(order.getStatus());
        if ("REVISION_REQUESTED".equals(orderStatus)) {
            return true;
        }

        if (REQUEST_TYPE_ORDER_REQUEST.equals(requestType) && "PENDING".equals(requestStatus)) {
            return true;
        }

        return false;
    }

    private boolean shouldIncludeDirectOrderWorkItem(PharmacyOrder order) {
        if (order == null || isTerminalOrderStatus(order)) {
            return false;
        }

        String orderStatus = normalize(order.getStatus());
        return "REVISION_REQUESTED".equals(orderStatus)
                || isDeliveryPendingQuoteOrder(order)
                || isPickupPendingReviewOrder(order)
                || isRetailPendingDirectOrder(order);
    }

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
            if (!shouldIncludeRequestWorkItem(request)) {
                continue;
            }
            PharmacyWorkItemResponse item = toWorkItem(request);
            if (seenCaseIds.add(item.getCaseId())) {
                items.add(item);
            }
        }

        for (PharmacyOrder order : directOrders) {
            if (!shouldIncludeDirectOrderWorkItem(order)) {
                continue;
            }
            String caseId = "ORD-" + order.getOrderId();
            if (seenCaseIds.add(caseId)) {
                items.add(toDirectOrderWorkItem(order));
            }
        }

        // Append pending delivery contact change requests
        List<PharmacyDeliveryContactChangeRequest> deliveryChangeRequests = deliveryContactChangeRequestRepository
                .findByOrder_Pharmacy_PharmacyIdAndStatus(pharmacyId, "PENDING");
        for (PharmacyDeliveryContactChangeRequest changeRequest : deliveryChangeRequests) {
            String caseId = "DELIVERY-CHANGE-" + changeRequest.getRequestId();
            if (seenCaseIds.add(caseId)) {
                items.add(toDeliveryContactChangeWorkItem(changeRequest));
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
        String requestType = PharmacyServiceHelper.requestTypeOf(request);
        String sourceType = REQUEST_TYPE_ORDER_REQUEST.equals(requestType)
                ? SOURCE_ORDER_REQUEST
                : SOURCE_CONSULTATION_REQUEST;
        String displayId = REQUEST_TYPE_ORDER_REQUEST.equals(requestType)
                ? "Order Request #" + request.getRequestId()
                : "Request #" + request.getRequestId();
        List<String> actions = deriveActions(workflowStage, request, order, requestType);
        String caseId = "REQ-" + request.getRequestId();
        LocalDateTime sortAt = order != null && order.getCreatedAt() != null
                ? order.getCreatedAt() : request.getCreatedAt();

        PharmacyWorkItemResponse.PharmacyWorkItemResponseBuilder builder = PharmacyWorkItemResponse.builder()
                .requestId(request.getRequestId())
                .workItemId(caseId)
                .caseId(caseId)
                .sourceType(sourceType)
                .displayId(displayId)
                .requestType(requestType)
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
                .attachments(PharmacyServiceHelper.deserializeAttachments(request.getAttachments(), objectMapper))
                .additionalNotes(request.getAdditionalNotes())
                .preferredDeliveryType(request.getPreferredDeliveryType())
                .deliveryType(request.getDeliveryType())
                .deliveryAddress(request.getDeliveryAddress())
                .deliveryLatitude(request.getDeliveryLatitude())
                .deliveryLongitude(request.getDeliveryLongitude())
                .deliveryPhoneNumber(request.getDeliveryPhoneNumber())
                .deliveryAddressSource(request.getDeliveryAddressSource())
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
                    .orderStatus(order.getStatus())
                    .paymentStatus(order.getPaymentStatus())
                    .patientConfirmedAt(order.getPatientConfirmedAt())
                    .requiresPatientConfirmation(order.getPatientConfirmationRequestedAt() != null
                            && order.getPatientConfirmedAt() == null)
                    .patientConfirmationRequestedAt(order.getPatientConfirmationRequestedAt())
                    .patientConfirmationReason(order.getPatientConfirmationReason())
                    .medicineAmount(order.getMedicineAmount())
                    .deliveryFee(order.getDeliveryFee())
                    .totalAmount(order.getTotalAmount())
                    .deliveryType(order.getDeliveryType())
                    .deliveryAddress(order.getDeliveryAddress())
                    .deliveryLatitude(order.getDeliveryLatitude())
                    .deliveryLongitude(order.getDeliveryLongitude())
                    .deliveryPhoneNumber(order.getDeliveryPhoneNumber())
                    .deliveryAddressSource(order.getDeliveryAddressSource())
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
        String workflowStage = deriveOrderStage(order, false);
        List<String> actions = deriveOrderActions(workflowStage, order);
        boolean retailOrder = isRetailPendingDirectOrder(order);
        boolean isDeliveryPending = isDeliveryPendingQuoteOrder(order);
        boolean isPickupReview = isPickupPendingReviewOrder(order);
        String sourceType;
        String displayId;
        if (isDeliveryPending) {
            sourceType = SOURCE_DELIVERY_QUOTE_REQUEST;
            displayId = "Delivery Quote #" + order.getOrderId();
        } else if (isPickupReview) {
            sourceType = SOURCE_PICKUP_ORDER_REVIEW;
            displayId = "Pickup Review #" + order.getOrderId();
        } else if (retailOrder) {
            sourceType = SOURCE_RETAIL_ORDER;
            displayId = "Retail Order #" + order.getOrderId();
        } else {
            sourceType = SOURCE_DIRECT_ORDER;
            displayId = "Order #" + order.getOrderId();
        }

        return PharmacyWorkItemResponse.builder()
                .caseId(caseId)
                .workItemId(caseId)
                .sourceType(sourceType)
                .displayId(displayId)
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
                .requiresPatientConfirmation(order.getPatientConfirmationRequestedAt() != null
                        && order.getPatientConfirmedAt() == null)
                .patientConfirmationRequestedAt(order.getPatientConfirmationRequestedAt())
                .patientConfirmationReason(order.getPatientConfirmationReason())
                .medicineAmount(order.getMedicineAmount())
                .deliveryFee(order.getDeliveryFee())
                .totalAmount(order.getTotalAmount())
                .deliveryType(order.getDeliveryType())
                .deliveryAddress(order.getDeliveryAddress())
                .deliveryLatitude(order.getDeliveryLatitude())
                .deliveryLongitude(order.getDeliveryLongitude())
                .deliveryPhoneNumber(order.getDeliveryPhoneNumber())
                .deliveryAddressSource(order.getDeliveryAddressSource())
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

    private boolean isDeliveryPendingQuoteOrder(PharmacyOrder order) {
        return order != null
                && "Delivery".equalsIgnoreCase(order.getDeliveryType())
                && "PENDING".equals(normalize(order.getStatus()))
                && order.getDeliveryFee() == null
                && order.getPrescriptionHeader() == null
                && !PAYMENT_STATUS_PAID.equals(normalize(order.getPaymentStatus()));
    }

    private boolean isPickupPendingReviewOrder(PharmacyOrder order) {
        return order != null
                && "Pickup".equalsIgnoreCase(order.getDeliveryType())
                && "PENDING".equals(normalize(order.getStatus()))
                && order.getPrescriptionHeader() == null;
    }

    private PharmacyWorkItemResponse toDeliveryContactChangeWorkItem(PharmacyDeliveryContactChangeRequest request) {
        String caseId = "DELIVERY-CHANGE-" + request.getRequestId();
        PharmacyOrder order = request.getOrder();

        return PharmacyWorkItemResponse.builder()
                .workItemId(caseId)
                .caseId(caseId)
                .sourceType(SOURCE_DELIVERY_CONTACT_CHANGE_REQUEST)
                .requestType(null)
                .workflowStage(STAGE_DELIVERY_CONTACT_REVIEW)
                .availableActions(List.of(ACTION_APPROVE_DELIVERY_CONTACT_CHANGE, ACTION_REJECT_DELIVERY_CONTACT_CHANGE))
                .hasConsultationRequest(false)
                .hasOrder(true)
                .orderId(order != null ? order.getOrderId() : null)
                .orderNumber(order != null ? order.getOrderNumber() : null)
                .patientId(order != null && order.getPatient() != null ? order.getPatient().getPatientId() : null)
                .patientName(order != null && order.getPatient() != null ? order.getPatient().getFullName() : null)
                .sortAt(request.getRequestedAt())
                .createdAt(request.getCreatedAt())
                .deliveryContactChangeRequestId(request.getRequestId())
                .oldDeliveryAddress(request.getOldDeliveryAddress())
                .oldDeliveryLatitude(request.getOldDeliveryLatitude())
                .oldDeliveryLongitude(request.getOldDeliveryLongitude())
                .oldDeliveryPhoneNumber(request.getOldDeliveryPhoneNumber())
                .oldDeliveryAddressSource(request.getOldDeliveryAddressSource())
                .newDeliveryAddress(request.getNewDeliveryAddress())
                .newDeliveryLatitude(request.getNewDeliveryLatitude())
                .newDeliveryLongitude(request.getNewDeliveryLongitude())
                .newDeliveryPhoneNumber(request.getNewDeliveryPhoneNumber())
                .newDeliveryAddressSource(request.getNewDeliveryAddressSource())
                .deliveryContactChangeStatus(request.getStatus())
                .deliveryContactChangeReason(request.getPatientReason())
                .deliveryContactChangeRequestedAt(request.getRequestedAt())
                .oldDeliveryFee(request.getOldDeliveryFee())
                .newDeliveryFee(request.getNewDeliveryFee())
                .oldTotalAmount(request.getOldTotalAmount())
                .newTotalAmount(request.getNewTotalAmount())
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
        return deriveOrderStage(order, true);
    }

    private String deriveOrderStage(PharmacyOrder order) {
        return deriveOrderStage(order, false);
    }

    private String deriveOrderStage(PharmacyOrder order, boolean linkedToConsultationRequest) {
        String orderStatus = normalize(order.getStatus());

        if ("CANCELLED".equals(orderStatus) || "REFUNDED".equals(orderStatus)) {
            return STAGE_CANCELLED;
        }

        if ("REVISION_REQUESTED".equals(orderStatus)) {
            return STAGE_REVISION_REQUESTED;
        }

        if (!linkedToConsultationRequest && isDeliveryPendingQuoteOrder(order)) {
            return STAGE_NEW_REQUEST;
        }

        if (!linkedToConsultationRequest && isPickupPendingReviewOrder(order)) {
            return STAGE_NEW_REQUEST;
        }

        if (!linkedToConsultationRequest && isRetailPendingDirectOrder(order)) {
            return STAGE_NEW_REQUEST;
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

    private List<String> deriveConsultationActions(String stage, PharmacyConsultationRequest request, PharmacyOrder order) {
        return switch (stage) {
            case STAGE_NEW_REQUEST -> List.of(ACTION_ACCEPT_REQUEST, ACTION_REJECT_REQUEST);
            case STAGE_CONSULTING -> {
                List<String> actions = new ArrayList<>(communicationActionsForConsulting(request));
                actions.add(ACTION_CREATE_ORDER);
                yield List.copyOf(actions);
            }
            case STAGE_REVISION_REQUESTED -> List.of(ACTION_UPDATE_QUOTE);
            case STAGE_AWAITING_PAYMENT -> List.of(ACTION_VIEW_ONLY);
            case STAGE_PREPARING -> cancellableOrderActions(order);
            case STAGE_READY -> cancellableOrderActions(order);
            case STAGE_SHIPPING -> List.of(ACTION_UPDATE_ORDER_STATUS);
            case STAGE_DELIVERED, STAGE_COMPLETED, STAGE_CANCELLED -> List.of(ACTION_VIEW_ONLY);
            default -> List.of(ACTION_VIEW_ONLY);
        };
    }

    private List<String> deriveActions(
            String stage,
            PharmacyConsultationRequest request,
            PharmacyOrder order,
            String requestType
    ) {
        if (REQUEST_TYPE_ORDER_REQUEST.equals(requestType)) {
            return deriveOrderRequestActions(stage, order);
        }
        return deriveConsultationActions(stage, request, order);
    }

    private List<String> deriveOrderRequestActions(String stage, PharmacyOrder order) {
        if (order == null) {
            return switch (stage) {
                case STAGE_NEW_REQUEST -> List.of(ACTION_CREATE_ORDER, ACTION_REJECT_REQUEST);
                case STAGE_CANCELLED -> List.of(ACTION_VIEW_ONLY);
                default -> List.of(ACTION_CREATE_ORDER);
            };
        }
        return deriveOrderActions(stage, order);
    }

    private boolean isPaid(PharmacyOrder order) {
        return order != null && PAYMENT_STATUS_PAID.equals(normalize(order.getPaymentStatus()));
    }

    private List<String> cancellableOrderActions(PharmacyOrder order) {
        if (isPaid(order)) {
            return List.of(ACTION_UPDATE_ORDER_STATUS);
        }
        return List.of(ACTION_UPDATE_ORDER_STATUS, ACTION_CANCEL_ORDER);
    }

    // requestTypeOf moved to PharmacyServiceHelper

    private List<String> communicationActionsForConsulting(PharmacyConsultationRequest request) {
        if (request == null || request.getChatRoomId() == null) {
            return List.of();
        }
        return List.of(ACTION_CHAT, ACTION_VIDEO_CALL);
    }

    private List<String> actionsWithChatIfAvailable(
            List<String> baseActions,
            PharmacyConsultationRequest request
    ) {
        List<String> actions = new ArrayList<>(baseActions);
        if (request != null
                && request.getChatRoomId() != null
                && !actions.contains(ACTION_CHAT)) {
            actions.add(ACTION_CHAT);
        }
        return List.copyOf(actions);
    }

    private List<String> deriveOrderActions(String stage, PharmacyOrder order) {
        return switch (stage) {
            case STAGE_NEW_REQUEST -> {
                if (isDeliveryPendingQuoteOrder(order)) {
                    yield List.of(ACTION_SEND_DELIVERY_QUOTE, ACTION_CANCEL_ORDER);
                }
                if (isPickupPendingReviewOrder(order)) {
                    yield List.of(ACTION_UPDATE_ORDER_STATUS, ACTION_CANCEL_ORDER);
                }
                if (isRetailPendingDirectOrder(order)) {
                    yield List.of(ACTION_UPDATE_ORDER_STATUS, ACTION_CANCEL_ORDER);
                }
                yield List.of(ACTION_VIEW_ONLY);
            }
            case STAGE_REVISION_REQUESTED -> List.of(ACTION_UPDATE_QUOTE);
            case STAGE_PREPARING -> cancellableOrderActions(order);
            case STAGE_READY -> cancellableOrderActions(order);
            case STAGE_SHIPPING -> List.of(ACTION_UPDATE_ORDER_STATUS);
            case STAGE_DELIVERED, STAGE_COMPLETED, STAGE_CANCELLED -> List.of(ACTION_VIEW_ONLY);
            default -> List.of(ACTION_VIEW_ONLY);
        };
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }

    private boolean isRetailPendingDirectOrder(PharmacyOrder order) {
        return order != null
                && order.getConsultationRequest() == null
                && order.getPrescriptionHeader() == null
                && "PENDING".equals(normalize(order.getStatus()));
    }
}
