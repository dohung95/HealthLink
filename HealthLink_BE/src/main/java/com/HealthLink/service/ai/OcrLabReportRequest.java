package com.HealthLink.service.ai;

import java.util.UUID;

public record OcrLabReportRequest(UUID jobId, UUID reportId, String objectGrant, String mimeType, String sha256,
                                  UUID correlationId) {
}
