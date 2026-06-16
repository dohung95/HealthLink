package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAppointmentSummaryDto {
    private Integer appointmentID;
    private LocalDateTime appointmentTime;
    private String consultationType;
    private String status;
    private String symptoms;
    private String notes;
    private BigDecimal fee;

    // Doctor info
    private String doctorId;
    private String doctorName;
    private String doctorSpecialty;

    // Consultation info
    private String diagnosis;
    private String doctorNotes;
    private String treatmentPlan;
    private LocalDateTime followUpDate;
}
