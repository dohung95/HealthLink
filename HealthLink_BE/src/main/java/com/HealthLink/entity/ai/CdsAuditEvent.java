package com.HealthLink.entity.ai;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "CdsAuditEvents")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class CdsAuditEvent {
    @Id
    @Column(name = "EventID", nullable = false, updatable = false)
    private UUID eventId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RunID", nullable = false, updatable = false)
    @ToString.Exclude
    private CdsSuggestionRun run;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DecisionID", updatable = false)
    @ToString.Exclude
    private CdsDecision decision;

    @Column(name = "ActorType", nullable = false, length = 32, updatable = false)
    private String actorType;

    @Column(name = "ActorID", nullable = false, length = 450, updatable = false)
    private String actorId;

    @Column(name = "EventType", nullable = false, length = 64, updatable = false)
    private String eventType;

    @Column(name = "EventTimestamp", nullable = false, updatable = false)
    private Instant timestamp;

    @Column(name = "CorrelationID", nullable = false, length = 64, updatable = false)
    private String correlationId;

    @Column(name = "MetadataJson", nullable = false, columnDefinition = "NVARCHAR(MAX)", updatable = false)
    private String metadataJson;

    @Column(name = "PreviousHash", length = 64, updatable = false)
    private String previousHash;

    @Column(name = "EventHash", nullable = false, length = 64, updatable = false)
    private String eventHash;
}
