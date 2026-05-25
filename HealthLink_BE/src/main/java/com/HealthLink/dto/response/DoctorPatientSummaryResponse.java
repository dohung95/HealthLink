package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DoctorPatientSummaryResponse {
    private String patientId;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String gender;
    private LocalDateTime dateOfBirth;
    private String avatarUrl;
    private LocalDateTime lastAppointmentTime;
    private LocalDateTime nextAppointmentTime;
    private long totalAppointments;
    private long completedAppointments;
    private String latestStatus;
}
