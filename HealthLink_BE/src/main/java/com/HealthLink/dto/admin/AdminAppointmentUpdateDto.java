package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminAppointmentUpdateDto {
    private LocalDateTime appointmentTime;
    private String consultationType;
    private String status;
    private LocalDateTime followUpDate;
    private String doctorNotes;
    private String diagnosis;
    private String notes;
}
