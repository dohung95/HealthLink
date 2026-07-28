package com.HealthLink.repository.ai;

import com.HealthLink.entity.ai.ClinicalRuleEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ClinicalRuleEvaluationRepository extends JpaRepository<ClinicalRuleEvaluation, UUID> {
}
