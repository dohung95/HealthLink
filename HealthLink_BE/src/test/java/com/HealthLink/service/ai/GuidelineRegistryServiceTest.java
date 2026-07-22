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
        String documentId = "who-hearts-d-type-2-diabetes-2020";
        String checksum = "71b216b19a227e73e0e624274974571a3530e30a0db37a3d10b6d179eefac008";
        when(documents.findByDocumentIdAndVersionAndChecksumAndCorpusVersionAndStatus(
                documentId, "2020", checksum, "student-demo-2026.1", "ACTIVE_STUDENT_DEMO"))
                .thenReturn(Optional.of(GuidelineDocument.builder().documentId(documentId).build()));

        assertThat(registry.isActiveStudentDemoCitation(documentId, "2020", checksum, "student-demo-2026.1"))
                .isTrue();
        assertThat(registry.isActiveStudentDemoCitation(documentId, "2021", checksum, "student-demo-2026.1"))
                .isFalse();
    }

    @Test
    void rejectsIncompleteCitationWithoutQueryingTheRegistry() {
        assertThat(registry.isActiveStudentDemoCitation("who-hearts-d-type-2-diabetes-2020", "2026.1", null, "student-demo-2026.1"))
                .isFalse();
    }

    @Test
    void rejectsNonCanonicalDocumentIdentifierWithoutQueryingTheRegistry() {
        assertThat(registry.isActiveStudentDemoCitation("WHO HEARTS D", "2020", "a".repeat(64), "student-demo-2026.1"))
                .isFalse();
    }
}
