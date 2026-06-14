package com.HealthLink.dto.pharmacy;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class PharmacyConsultationRequestCreateRequest {

    @NotBlank(message = "Patient ID is required")
    private String patientId;

    @NotBlank(message = "Pharmacy ID is required")
    private String pharmacyId;

    private String symptoms;
    private String description;
    private String allergies;
    private List<String> attachments;
    private List<Integer> prescriptionHeaderIds;
    private String additionalNotes;
    private String preferredDeliveryType = "Delivery";
    private String requestType = "CONSULTATION";
    private String deliveryType;
    private String deliveryAddress;
    private Double deliveryLatitude;
    private Double deliveryLongitude;
    private String deliveryPhoneNumber;
    private String deliveryAddressSource;
}
