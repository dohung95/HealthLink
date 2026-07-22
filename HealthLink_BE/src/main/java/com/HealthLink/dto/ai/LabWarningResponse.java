package com.HealthLink.dto.ai;

import java.util.UUID;

public record LabWarningResponse(String code, UUID observationId, Integer rowOrder) { }
