package com.HealthLink.service;

import com.HealthLink.dto.prescription.PrescriptionRequest;
import com.HealthLink.dto.prescription.PrescriptionResponse;

import java.util.List;

public interface PrescriptionService {

    /**
     * Kê đơn thuốc mới (REQ-7).
     * Tự động tính totalPrice cho từng item và totalAmount cho toàn đơn.
     */
    PrescriptionResponse createPrescription(PrescriptionRequest request);

    /**
     * Lấy đơn thuốc theo ID.
     */
    PrescriptionResponse getPrescriptionById(Integer prescriptionHeaderId);

    /**
     * Lấy danh sách đơn thuốc theo bệnh nhân.
     */
    List<PrescriptionResponse> getPrescriptionsByPatient(String patientId);

    /**
     * Lấy danh sách đơn thuốc theo bác sĩ.
     */
    List<PrescriptionResponse> getPrescriptionsByDoctor(String doctorId);
}
