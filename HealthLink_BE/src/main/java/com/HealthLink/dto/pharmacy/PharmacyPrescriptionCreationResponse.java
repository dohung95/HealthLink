package com.HealthLink.dto.pharmacy;

import com.HealthLink.dto.prescription.PrescriptionResponse;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PharmacyPrescriptionCreationResponse {
    private PharmacyConsultationRequestResponse request;
    private PrescriptionResponse prescription;
    private PharmacyOrderResponse order;
}
