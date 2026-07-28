package com.HealthLink.dto.ai;

import java.util.List;
import java.util.Map;

public record ClinicalContextPreviewResponse(Integer appointmentId, long contextVersion, boolean ready,
                                             List<ClinicalContextBlockerResponse> blockers,
                                             Map<String, ClinicalContextFieldResponse> fields) {
}
