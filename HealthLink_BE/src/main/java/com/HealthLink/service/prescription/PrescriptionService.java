package com.HealthLink.service.prescription;

import com.HealthLink.dto.prescription.PrescriptionOpenedResponse;
import com.HealthLink.dto.prescription.PrescriptionRequest;
import com.HealthLink.dto.prescription.PrescriptionResponse;

import java.util.List;

public interface PrescriptionService {

    PrescriptionResponse createPrescription(PrescriptionRequest request);

    PrescriptionResponse getPrescriptionById(Integer prescriptionHeaderId, String timing);

    List<PrescriptionResponse> getPrescriptionsByPatient(String patientId);

    List<PrescriptionResponse> getPrescriptionsByDoctor(String doctorId);

    PrescriptionOpenedResponse markPrescriptionAsOpened(Integer prescriptionHeaderId, String patientId);
}
