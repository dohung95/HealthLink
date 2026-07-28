package com.HealthLink.service.ai;

import com.HealthLink.entity.ai.CdsAuditEvent;
import com.HealthLink.entity.ai.CdsSuggestionRun;
import com.HealthLink.repository.ai.CdsAuditEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CdsAuditTrailServiceTest {
    @Test
    void appendBuildsVerifiableHashChainAndDetectsTampering() {
        CdsAuditEventRepository repository = mock(CdsAuditEventRepository.class);
        CdsAuditTrailService service = new CdsAuditTrailService(repository, new ObjectMapper());
        CdsSuggestionRun run = CdsSuggestionRun.builder().runId(UUID.randomUUID())
                .status("NEEDS_DOCTOR_REVIEW").createdAt(Instant.now()).build();
        List<CdsAuditEvent> stored = new ArrayList<>();
        when(repository.findTopByRun_RunIdOrderByTimestampDescEventIdDesc(run.getRunId()))
                .thenAnswer(invocation -> stored.isEmpty() ? Optional.empty() : Optional.of(stored.getLast()));
        when(repository.save(any())).thenAnswer(invocation -> {
            CdsAuditEvent event = invocation.getArgument(0);
            stored.add(event);
            return event;
        });

        service.append(run, null, "DECISION_APPROVED_AS_IS", Map.of("version", 0));
        service.append(run, null, "APPLY_SUCCEEDED", Map.of("targetId", 41));

        assertNull(stored.getFirst().getPreviousHash());
        assertEquals(stored.getFirst().getEventHash(), stored.getLast().getPreviousHash());
        assertTrue(service.verify(stored));

        stored.getFirst().setActorType("PATIENT");
        assertFalse(service.verify(stored));
        stored.getFirst().setActorType("SYSTEM");
        assertTrue(service.verify(stored));

        stored.getFirst().setMetadataJson("{\"version\":99}");
        assertFalse(service.verify(stored));
    }
}
