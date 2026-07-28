package com.HealthLink.dto.ai;

import java.util.List;
import java.util.UUID;

public record LabReportVerifyRequest(Long expectedVersion, List<UUID> observationIds) { }
