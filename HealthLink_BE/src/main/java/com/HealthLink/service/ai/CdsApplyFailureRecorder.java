package com.HealthLink.service.ai;

import com.HealthLink.entity.ai.CdsDecision;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.ai.CdsDecisionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
public class CdsApplyFailureRecorder {
    private final CdsDecisionRepository decisions;
    private final CdsAuditTrailService audit;

    public CdsApplyFailureRecorder(CdsDecisionRepository decisions, CdsAuditTrailService audit) {
        this.decisions = decisions;
        this.audit = audit;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(UUID decisionId, String idempotencyKey, String failureCode) {
        CdsDecision decision = decisions.findById(decisionId)
                .orElseThrow(() -> new ResourceNotFoundException("CdsDecision", "id", decisionId));
        decision.setApplyStatus("APPLY_FAILED");
        decision.setApplyIdempotencyKey(idempotencyKey);
        decisions.saveAndFlush(decision);
        audit.append(decision.getRun(), decision, "APPLY_FAILED", Map.of(
                "failureCode", failureCode,
                "decisionVersion", decision.getVersion()));
    }
}
