package com.HealthLink.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDispatchSummary {
    private String job;
    private String effectiveNow;
    private int candidateCount;
    private int sentCount;
    private int skippedCount;
    private int failedCount;
    private String message;
}
