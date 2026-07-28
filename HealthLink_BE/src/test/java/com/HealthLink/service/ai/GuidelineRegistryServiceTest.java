package com.HealthLink.service.ai;

import com.HealthLink.entity.ai.GuidelineDocument;
import com.HealthLink.dto.ai.GuidelineChunkAuditRequest;
import com.HealthLink.entity.ai.GuidelineChunk;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

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

    @Test
    void persists_active_chunk_once_and_treats_a_matching_repeat_as_idempotent() {
        String checksum = "71b216b19a227e73e0e624274974571a3530e30a0db37a3d10b6d179eefac008";
        var request = new GuidelineChunkAuditRequest("who-hearts-d-type-2-diabetes-2020", "2020",
                java.util.UUID.randomUUID(), "Treatment > review", 13, checksum, "b".repeat(64), "student-demo-2026.1");
        GuidelineDocument document = GuidelineDocument.builder().documentId(request.documentId()).build();
        GuidelineChunk existing = GuidelineChunk.builder().chunkId(request.chunkId()).document(document)
                .sectionPath(request.sectionPath()).page(request.page()).checksum(request.checksum())
                .textHash(request.textHash()).corpusVersion(request.corpusVersion()).build();
        when(documents.findByDocumentIdAndVersionAndChecksumAndCorpusVersionAndStatus(
                request.documentId(), request.version(), request.checksum(), request.corpusVersion(), "ACTIVE_STUDENT_DEMO"))
                .thenReturn(Optional.of(document));
        when(chunks.findById(request.chunkId())).thenReturn(Optional.empty(), Optional.of(existing));

        assertThat(registry.registerChunkAudits(java.util.List.of(request))).isEqualTo(1);
        assertThat(registry.registerChunkAudits(java.util.List.of(request))).isZero();
        verify(chunks, times(1)).save(org.mockito.ArgumentMatchers.any(GuidelineChunk.class));
    }

    @Test
    void rejects_chunk_audit_when_its_exact_document_version_checksum_or_corpus_is_not_active() {
        var request = new GuidelineChunkAuditRequest("who-hearts-d-type-2-diabetes-2020", "2020",
                java.util.UUID.randomUUID(), "Treatment > review", 13, "a".repeat(64), "b".repeat(64), "student-demo-2026.1");
        when(documents.findByDocumentIdAndVersionAndChecksumAndCorpusVersionAndStatus(
                request.documentId(), request.version(), request.checksum(), request.corpusVersion(), "ACTIVE_STUDENT_DEMO"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> registry.registerChunkAudits(java.util.List.of(request)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("active student-demo document");
    }
}
