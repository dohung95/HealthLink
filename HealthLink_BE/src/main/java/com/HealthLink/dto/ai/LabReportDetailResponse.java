package com.HealthLink.dto.ai;

import java.time.LocalDateTime;
import java.util.UUID;

public record LabReportDetailResponse(UUID reportId, Integer appointmentId, String originalFileName,
                                      String mimeType, long fileSize, int pageCount, String status,
                                      LocalDateTime uploadedAt) {
}
