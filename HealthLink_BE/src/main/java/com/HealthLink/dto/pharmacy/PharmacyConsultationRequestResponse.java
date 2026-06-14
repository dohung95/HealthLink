package com.HealthLink.dto.pharmacy;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PharmacyConsultationRequestResponse {
    private Integer requestId;
    private String patientId;
    private String patientName;
    private String pharmacyId;
    private String pharmacyName;
    private String pharmacyUserId;
    private String symptoms;
    private String description;
    private String allergies;
    private List<String> attachments;
    private String additionalNotes;
    private String preferredDeliveryType;
    private String requestType;
    private String deliveryType;
    private String deliveryAddress;
    private Double deliveryLatitude;
    private Double deliveryLongitude;
    private String deliveryPhoneNumber;
    private String deliveryAddressSource;
    private String status;
    private String chatRoomId;
    private String pharmacyNotes;
    private String patientFollowUpNotes;
    private List<Integer> prescriptionHeaderIds;
    private Integer pharmacyOrderId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
