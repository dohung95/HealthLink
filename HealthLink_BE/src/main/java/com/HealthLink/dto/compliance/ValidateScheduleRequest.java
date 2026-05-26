package com.HealthLink.dto.compliance;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ValidateScheduleRequest {
    private String targetMonth; // Optional, defaults to current month
    private List<Integer> scheduleIds; // Optional, validate specific schedules
}
