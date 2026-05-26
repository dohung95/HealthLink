package com.HealthLink.dto.doctor.schedule;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorScheduleExceptionRequest {

    @NotNull(message = "Exception date is required")
    private LocalDate exceptionDate;

    @NotBlank(message = "Exception type is required")
    private String exceptionType; // DayOff, Modified, AddSlot

    private LocalTime startTime; // Required for Modified/AddSlot

    private LocalTime endTime; // Required for Modified/AddSlot

    @NotBlank(message = "Reason is required")
    private String reason;

    @Builder.Default
    private boolean recurring = false;

    private LocalDate recurringUntil;
}
