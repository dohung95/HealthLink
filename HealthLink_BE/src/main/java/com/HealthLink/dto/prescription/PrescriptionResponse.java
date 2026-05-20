package com.HealthLink.dto.prescription;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PrescriptionResponse {
    private Integer prescriptionHeaderId;
    private Integer appointmentId;
    private Integer pharmacyRequestId;
    private String patientId;
    private String patientName;
    private String doctorId;
    private String doctorName;
    private String pharmacyId;
    private String pharmacyName;
    private LocalDateTime issueDate;
    private String diagnosis;
    private String notes;
    private LocalDateTime validUntil;
    private String status;
    private BigDecimal totalAmount;
    private List<PrescriptionItemResponse> items;
}
