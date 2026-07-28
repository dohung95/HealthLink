package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.CdsAuditEventResponse;
import com.HealthLink.entity.ai.CdsAuditEvent;
import com.HealthLink.entity.ai.CdsDecision;
import com.HealthLink.entity.ai.CdsSuggestionRun;
import com.HealthLink.repository.ai.CdsAuditEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Service
public class CdsAuditTrailService {
    private final CdsAuditEventRepository events;
    private final ObjectMapper canonicalMapper;

    public CdsAuditTrailService(CdsAuditEventRepository events, ObjectMapper mapper) {
        this.events = events;
        this.canonicalMapper = mapper.copy().enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);
    }

    public CdsAuditEvent append(CdsSuggestionRun run, CdsDecision decision, String eventType,
                                Map<String, Object> safeMetadata) {
        CdsAuditEvent previous = events.findTopByRun_RunIdOrderByTimestampDescEventIdDesc(run.getRunId())
                .orElse(null);
        UUID eventId = UUID.randomUUID();
        Instant timestamp = Instant.now();
        String metadataJson = write(new TreeMap<>(safeMetadata == null ? Map.of() : safeMetadata));
        String correlationId = Optional.ofNullable(MDC.get("traceId"))
                .filter(value -> !value.isBlank())
                .orElseGet(() -> UUID.randomUUID().toString());
        String actorId = decision == null || decision.getDoctorId() == null
                ? "SYSTEM"
                : decision.getDoctorId();
        String previousHash = previous == null ? null : previous.getEventHash();
        String actorType = decision == null ? "SYSTEM" : "DOCTOR";
        String eventHash = hash(material(eventId, run.getRunId(),
                decision == null ? null : decision.getDecisionId(), actorType, actorId, eventType,
                timestamp, correlationId, metadataJson, previousHash));
        return events.save(CdsAuditEvent.builder()
                .eventId(eventId)
                .run(run)
                .decision(decision)
                .actorType(actorType)
                .actorId(actorId)
                .eventType(eventType)
                .timestamp(timestamp)
                .correlationId(correlationId)
                .metadataJson(metadataJson)
                .previousHash(previousHash)
                .eventHash(eventHash)
                .build());
    }

    public List<CdsAuditEventResponse> timeline(UUID runId) {
        return events.findByRun_RunIdOrderByTimestampAscEventIdAsc(runId).stream()
                .map(event -> new CdsAuditEventResponse(
                        event.getEventId(),
                        event.getRun().getRunId(),
                        event.getDecision() == null ? null : event.getDecision().getDecisionId(),
                        event.getActorType(),
                        event.getActorId(),
                        event.getEventType(),
                        event.getTimestamp(),
                        event.getCorrelationId(),
                        event.getMetadataJson(),
                        event.getPreviousHash(),
                        event.getEventHash()))
                .toList();
    }

    public boolean verify(List<CdsAuditEvent> orderedEvents) {
        String expectedPrevious = null;
        for (CdsAuditEvent event : orderedEvents) {
            if (!Objects.equals(expectedPrevious, event.getPreviousHash())) {
                return false;
            }
            String expected = hash(material(
                    event.getEventId(),
                    event.getRun().getRunId(),
                    event.getDecision() == null ? null : event.getDecision().getDecisionId(),
                    event.getActorType(),
                    event.getActorId(),
                    event.getEventType(),
                    event.getTimestamp(),
                    event.getCorrelationId(),
                    event.getMetadataJson(),
                    event.getPreviousHash()));
            if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                    event.getEventHash().getBytes(StandardCharsets.UTF_8))) {
                return false;
            }
            expectedPrevious = event.getEventHash();
        }
        return true;
    }

    private String material(UUID eventId, UUID runId, UUID decisionId, String actorType, String actorId,
                            String eventType, Instant timestamp, String correlationId,
                            String metadataJson, String previousHash) {
        return String.join("|",
                string(eventId), string(runId), string(decisionId), string(actorType), string(actorId),
                string(eventType), string(timestamp), string(correlationId),
                string(metadataJson), string(previousHash));
    }

    private String write(Object value) {
        try {
            return canonicalMapper.writeValueAsString(value);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to serialize CDS audit metadata", exception);
        }
    }

    static String hash(String value) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("SHA-256 unavailable", exception);
        }
    }

    private static String string(Object value) {
        return value == null ? "" : value.toString();
    }
}
