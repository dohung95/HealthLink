package com.HealthLink.service.ai;

import com.HealthLink.entity.ai.GuidelineDocument;
import com.HealthLink.repository.ai.GuidelineDocumentRepository;
import com.HealthLink.repository.ai.GuidelineChunkRepository;
import com.HealthLink.service.impl.ai.GuidelineRegistryServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GuidelineRegistryServiceTest {
    @Mock
    private GuidelineDocumentRepository documents;
    @Mock
    private GuidelineChunkRepository chunks;
    @InjectMocks
    private GuidelineRegistryServiceImpl registry;

    @Test
    void acceptsCitationOnlyWhenItsExactDocumentVersionChecksumAndCorpusAreActive() {
        UUID documentId = UUID.randomUUID();
        when(documents.findByDocumentIdAndVersionAndChecksumAndCorpusVersionAndStatus(
                documentId, "2026.1", "a".repeat(64), "student-demo-2026.1", "ACTIVE_STUDENT_DEMO"))
                .thenReturn(Optional.of(GuidelineDocument.builder().documentId(documentId).build()));

        assertThat(registry.isActiveStudentDemoCitation(documentId, "2026.1", "a".repeat(64), "student-demo-2026.1"))
                .isTrue();
        assertThat(registry.isActiveStudentDemoCitation(documentId, "2026.2", "a".repeat(64), "student-demo-2026.1"))
                .isFalse();
    }

    @Test
    void rejectsIncompleteCitationWithoutQueryingTheRegistry() {
        assertThat(registry.isActiveStudentDemoCitation(UUID.randomUUID(), "2026.1", null, "student-demo-2026.1"))
                .isFalse();
    }
}
