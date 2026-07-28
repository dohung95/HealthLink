package com.HealthLink.dto.ai;

import java.util.List;

public record ApplyCdsDecisionRequest(
        List<String> selectedSections,
        Integer targetClinicalResultId,
        Boolean createNew,
        Long expectedDecisionVersion
) {
}
