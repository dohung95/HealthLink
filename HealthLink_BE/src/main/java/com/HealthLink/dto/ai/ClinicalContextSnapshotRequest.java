package com.HealthLink.dto.ai;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record ClinicalContextSnapshotRequest(List<UUID> verifiedLabReportIds, @NotNull @Min(0) Long expectedContextVersion) {
}
