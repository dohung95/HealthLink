package com.HealthLink.repository.ai;

import com.HealthLink.entity.ai.CdsDecision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CdsDecisionRepository extends JpaRepository<CdsDecision, UUID> {
    Optional<CdsDecision> findByRun_RunId(UUID runId);
}
