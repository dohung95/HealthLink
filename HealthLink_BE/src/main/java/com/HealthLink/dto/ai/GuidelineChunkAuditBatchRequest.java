package com.HealthLink.dto.ai;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record GuidelineChunkAuditBatchRequest(
        @NotEmpty @Size(max = 100) List<@Valid GuidelineChunkAuditRequest> chunks) {
}
