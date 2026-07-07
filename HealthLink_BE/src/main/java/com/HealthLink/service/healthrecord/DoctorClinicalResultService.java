package com.HealthLink.service.healthrecord;

import com.HealthLink.dto.request.healthrecord.ClinicalResultUpsertRequest;
import com.HealthLink.dto.response.healthrecord.MedicalDocumentResponse;

import java.util.List;

public interface DoctorClinicalResultService {
    List<MedicalDocumentResponse> getAppointmentResults(Integer appointmentId, String doctorId);

    MedicalDocumentResponse createResult(
            Integer appointmentId,
            String doctorId,
            ClinicalResultUpsertRequest request
    );

    MedicalDocumentResponse updateResult(
            Integer documentId,
            String doctorId,
            ClinicalResultUpsertRequest request
    );

    MedicalDocumentResponse publishResult(Integer documentId, String doctorId);

    void deleteResult(Integer documentId, String doctorId);
}
