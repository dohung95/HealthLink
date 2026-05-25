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
public class AdminAppointmentDto {
    private Integer appointmentID;
    private String date;       // Formatted: "MMM dd, yyyy"
    private String time;       // Formatted: "hh:mm a"
    private String rawDate;    // For input: "yyyy-MM-dd"
    private String rawTime;    // For input: "HH:mm"
    private LocalDateTime appointmentTime;
    private String consultationType;
    private String status;
    private String symptoms;
    private String notes;
    private BigDecimal fee;

    // Patient info
    private String patientId;
    private String patientName;
    private String patientEmail;
    private String patientPhone;

    // Doctor info
    private String doctorId;
    private String doctorName;
    private String doctorEmail;
    private String department;

    // Consultation info (from related Consultation entity)
    private Integer consultationId;
    private LocalDateTime consultationStartTime;
    private LocalDateTime consultationEndTime;
    private String diagnosis;
    private String doctorNotes;
    private LocalDateTime followUpDate;
    private Integer followUpAppointmentId;
    private String treatmentPlan;

    // Additional info
    private String cancelReason;
    private String cancelledBy;
    private LocalDateTime cancelledAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime createdAt;
}
