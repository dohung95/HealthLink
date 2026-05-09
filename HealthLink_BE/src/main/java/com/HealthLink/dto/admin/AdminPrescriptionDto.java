package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPrescriptionDto {
    private Integer prescriptionHeaderID;
    private Integer appointmentID;
    private LocalDateTime issueDate;
    private String doctorName;
    private String specialty;
    private String diagnosis;
    private String notes;
    private LocalDateTime validUntil;
    private String status;
    private BigDecimal totalAmount;
    private List<AdminPrescriptionItemDto> medications;
}
