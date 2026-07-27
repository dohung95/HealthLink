package com.HealthLink.dto.ai;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record CdsSuggestionCreateRequest(@NotNull UUID snapshotId, @NotNull Long expectedContextVersion,
                                         List<UUID> verifiedLabReportIds) { }
