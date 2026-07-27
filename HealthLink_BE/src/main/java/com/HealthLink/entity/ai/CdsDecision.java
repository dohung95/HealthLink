package com.HealthLink.entity.ai;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "CdsDecisions")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class CdsDecision {
    @Id
    @Column(name = "DecisionID", nullable = false, updatable = false)
    private UUID decisionId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RunID", nullable = false, updatable = false, unique = true)
    @ToString.Exclude
    private CdsSuggestionRun run;

    @Column(name = "DoctorID", nullable = false, length = 450, updatable = false)
    private String doctorId;

    @Column(name = "DecisionStatus", nullable = false, length = 40)
    private String decisionStatus;

    @Column(name = "OriginalOutputHash", nullable = false, length = 64, updatable = false)
    private String originalOutputHash;

    @Column(name = "EditedOutputJson", columnDefinition = "NVARCHAR(MAX)")
    private String editedOutputJson;

    @Column(name = "EditedOutputHash", length = 64)
    private String editedOutputHash;

    @Column(name = "Reason", length = 2000)
    private String reason;

    @Column(name = "DecidedAt", nullable = false, updatable = false)
    private Instant decidedAt;

    @Column(name = "ApplyStatus", nullable = false, length = 32)
    private String applyStatus;

    @Column(name = "AppliedAt")
    private Instant appliedAt;

    @Column(name = "TargetMedicalDocumentID")
    private Integer targetMedicalDocumentId;

    @Column(name = "ApplyIdempotencyKey", length = 128)
    private String applyIdempotencyKey;

    @Column(name = "BeforeHash", length = 64)
    private String beforeHash;

    @Column(name = "AfterHash", length = 64)
    private String afterHash;

    @Version
    @Column(name = "Version", nullable = false)
    private long version;
}
