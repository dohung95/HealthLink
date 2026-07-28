package com.HealthLink.entity.ai;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ClinicalRuleEvaluations")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class ClinicalRuleEvaluation {
    @Id
    @Column(name = "EvaluationID", nullable = false, updatable = false)
    private UUID evaluationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SnapshotID", nullable = false, updatable = false)
    @ToString.Exclude
    private ClinicalContextSnapshot snapshot;

    @Column(name = "RuleSetVersion", nullable = false, length = 100, updatable = false)
    private String ruleSetVersion;

    @Column(name = "FindingsJson", nullable = false, columnDefinition = "NVARCHAR(MAX)", updatable = false)
    private String findingsJson;

    @Column(name = "InputHash", nullable = false, length = 64, updatable = false)
    private String inputHash;

    @Column(name = "EvaluatedAt", nullable = false, updatable = false)
    private Instant evaluatedAt;
}
