package com.HealthLink.dto.appointment;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class RecommendedDoctorRequest {
    private String specialty;
    private Integer specialtyId;
    private LocalDateTime appointmentTime;
    private String consultationType;
}