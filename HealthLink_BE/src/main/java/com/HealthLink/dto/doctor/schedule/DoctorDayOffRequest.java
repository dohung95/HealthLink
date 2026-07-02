package com.HealthLink.dto.doctor.schedule;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorDayOffRequest {

    @NotNull(message = "Exception date is required")
    private LocalDate exceptionDate;

    @NotBlank(message = "Reason is required")
    private String reason;
}
