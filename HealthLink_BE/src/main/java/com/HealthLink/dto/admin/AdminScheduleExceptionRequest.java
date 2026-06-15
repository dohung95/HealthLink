package com.HealthLink.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminScheduleExceptionRequest {

    @NotBlank(message = "Doctor ID is required")
    private String doctorId;

    @NotNull(message = "Exception date is required")
    private LocalDate exceptionDate;

    @NotBlank(message = "Exception type is required")
    private String exceptionType; // DAY_OFF, MODIFIED, ADD_SLOT

    // Optional: Nếu exceptionType là Modified hoặc AddSlot
    private LocalTime startTime;
    private LocalTime endTime;

    @NotBlank(message = "Reason is required")
    private String reason;

    // Optional: Recurring exception
    private boolean recurring;
    private LocalDate recurringUntil;
}
