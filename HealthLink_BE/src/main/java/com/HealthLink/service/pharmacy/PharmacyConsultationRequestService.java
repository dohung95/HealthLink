package com.HealthLink.service.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyConsultationRequestCreateRequest;
import com.HealthLink.dto.pharmacy.PharmacyConsultationRequestResponse;
import com.HealthLink.dto.pharmacy.PharmacyConsultationRequestStatusUpdateRequest;
import com.HealthLink.dto.pharmacy.PharmacyPrescriptionCreationResponse;
import com.HealthLink.dto.pharmacy.PharmacyPrescriptionRequest;

import java.util.List;

public interface PharmacyConsultationRequestService {

    PharmacyConsultationRequestResponse createRequest(PharmacyConsultationRequestCreateRequest request);

    List<PharmacyConsultationRequestResponse> getRequestsByPharmacy(String pharmacyId, String status);

    List<PharmacyConsultationRequestResponse> getRequestsByPatient(String patientId);

    PharmacyConsultationRequestResponse getRequestById(Integer requestId);

    PharmacyConsultationRequestResponse updateRequestStatus(
            Integer requestId,
            PharmacyConsultationRequestStatusUpdateRequest request
    );

    PharmacyPrescriptionCreationResponse createPrescription(
            Integer requestId,
            PharmacyPrescriptionRequest request
    );
}
