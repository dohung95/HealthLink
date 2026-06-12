package com.HealthLink.dto.doctor.schedule;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorScheduleChangeRequestRequest {

    @NotNull(message = "Appointment ID is required")
    private Integer appointmentId;

    @NotBlank(message = "Reason is required")
    private String reason;
}
