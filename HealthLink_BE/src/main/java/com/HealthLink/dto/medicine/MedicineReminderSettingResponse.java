package com.HealthLink.dto.medicine;

import lombok.Builder;
import lombok.Data;

import java.time.LocalTime;

@Data
@Builder
public class MedicineReminderSettingResponse {
    private LocalTime morningTime;
    private LocalTime afternoonTime;
    private LocalTime eveningTime;
    private Boolean enabled;
}
