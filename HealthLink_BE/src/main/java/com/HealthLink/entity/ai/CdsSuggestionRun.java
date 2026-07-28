package com.HealthLink.entity.ai;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "CdsSuggestionRuns")
@Getter @Setter @Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class CdsSuggestionRun {
    @Id @Column(name = "RunID", nullable = false, updatable = false) private UUID runId;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "SnapshotID", nullable = false, updatable = false)
    @ToString.Exclude private ClinicalContextSnapshot snapshot;
    @Column(name = "Status", nullable = false, length = 40) private String status;
    @Column(name = "RuleSetVersion", nullable = false, length = 100, updatable = false) private String ruleSetVersion;
    @Column(name = "CorpusVersion", nullable = false, length = 100, updatable = false) private String corpusVersion;
    @Column(name = "PromptVersion", nullable = false, length = 100, updatable = false) private String promptVersion;
    @Column(name = "ModelName", nullable = false, length = 200, updatable = false) private String modelName;
    @Column(name = "ModelDigest", nullable = false, length = 64, updatable = false) private String modelDigest;
    @Column(name = "ErrorCode", length = 80) private String errorCode;
    @Column(name = "ValidatedOutputJson", columnDefinition = "NVARCHAR(MAX)") private String validatedOutputJson;
    @Column(name = "CreatedAt", nullable = false, updatable = false) private Instant createdAt;
}
