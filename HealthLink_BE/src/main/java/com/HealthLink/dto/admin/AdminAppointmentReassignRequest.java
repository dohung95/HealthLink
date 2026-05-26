package com.HealthLink.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAppointmentReassignRequest {

    @NotNull(message = "Appointment ID is required")
    private Integer appointmentId;

    @NotBlank(message = "New doctor ID is required")
    private String newDoctorId;

    // Optional: Nếu cần đổi thời gian
    private LocalDateTime newAppointmentTime;

    @NotBlank(message = "Reason is required")
    private String reason;

    // Optional: Notify settings
    private boolean notifyPatient = true;
    private boolean notifyOldDoctor = true;
    private boolean notifyNewDoctor = true;
}
