package com.HealthLink.dto.ai;

import java.time.LocalDateTime;
import java.util.UUID;

public record CreateLabReportResponse(UUID reportId, UUID jobId, String status, LocalDateTime uploadedAt) {
}
