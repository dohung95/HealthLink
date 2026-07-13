package com.HealthLink.dto.pharmacy;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PharmacyWorkItemResponse {
    private Integer requestId;
    private String workItemId;
    private String caseId;
    private String sourceType;
    private String displayId;
    private String workflowStage;
    private List<String> availableActions;
    private LocalDateTime sortAt;
    private Boolean hasConsultationRequest;
    private Boolean hasOrder;

    private String patientId;
    private String patientName;
    private String symptoms;
    private String description;
    private String allergies;
    private List<String> attachments;
    private String additionalNotes;
    private String preferredDeliveryType;
    private String requestType;
    private String requestStatus;
    private String chatRoomId;
    private String pharmacyNotes;
    private String patientFollowUpNotes;
    private List<Integer> prescriptionHeaderIds;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Integer orderId;
    private String orderNumber;
    private String orderStatus;
    private String paymentStatus;
    private Boolean requiresPatientConfirmation;
    private LocalDateTime patientConfirmationRequestedAt;
    private String patientConfirmationReason;
    private LocalDateTime patientConfirmedAt;
    private BigDecimal medicineAmount;
    private BigDecimal deliveryFee;
    private BigDecimal totalAmount;
    private String deliveryType;
    private String deliveryAddress;
    private Double deliveryLatitude;
    private Double deliveryLongitude;
    private String deliveryPhoneNumber;
    private String deliveryAddressSource;
    private Integer itemCount;
    private LocalDateTime confirmedAt;
    private LocalDateTime preparingAt;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime cancelledAt;
    private String cancelReason;
    private String cancelledBy;
    private LocalDateTime revisionRequestedAt;
    private String revisionRequestNotes;
    private LocalDateTime revisionResolvedAt;
    private BigDecimal platformFee;
    private BigDecimal pharmacyEarning;

    private Integer deliveryContactChangeRequestId;
    private String oldDeliveryAddress;
    private Double oldDeliveryLatitude;
    private Double oldDeliveryLongitude;
    private String oldDeliveryPhoneNumber;
    private String oldDeliveryAddressSource;
    private String newDeliveryAddress;
    private Double newDeliveryLatitude;
    private Double newDeliveryLongitude;
    private String newDeliveryPhoneNumber;
    private String newDeliveryAddressSource;
    private String deliveryContactChangeStatus;
    private String deliveryContactChangeReason;
    private LocalDateTime deliveryContactChangeRequestedAt;
    private BigDecimal oldDeliveryFee;
    private BigDecimal newDeliveryFee;
    private BigDecimal oldTotalAmount;
    private BigDecimal newTotalAmount;
}
