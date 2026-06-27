package com.HealthLink.dto.medicine;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalTime;

@Data
public class MedicineReminderSettingRequest {
    @NotNull
    private LocalTime morningTime;

    @NotNull
    private LocalTime afternoonTime;

    @NotNull
    private LocalTime eveningTime;

    @NotNull
    private Boolean enabled;
}
