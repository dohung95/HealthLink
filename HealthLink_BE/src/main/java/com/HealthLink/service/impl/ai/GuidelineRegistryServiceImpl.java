package com.HealthLink.service.impl.ai;

import com.HealthLink.entity.ai.GuidelineDocument;
import com.HealthLink.entity.ai.GuidelineChunk;
import com.HealthLink.dto.ai.GuidelineChunkAuditRequest;
import com.HealthLink.repository.ai.GuidelineChunkRepository;
import com.HealthLink.repository.ai.GuidelineDocumentRepository;
import com.HealthLink.service.ai.GuidelineRegistryService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class GuidelineRegistryServiceImpl implements GuidelineRegistryService {
    private final GuidelineDocumentRepository documents;
    @SuppressWarnings("unused")
    private final GuidelineChunkRepository chunks;

    public GuidelineRegistryServiceImpl(GuidelineDocumentRepository documents, GuidelineChunkRepository chunks) {
        this.documents = documents;
        this.chunks = chunks;
    }

    @Override
    public boolean isActiveStudentDemoCitation(String documentId, String version, String checksum, String corpusVersion) {
        if (!canonicalDocumentId(documentId) || blank(version) || checksum == null
                || !checksum.matches("[0-9a-f]{64}") || blank(corpusVersion)) {
            return false;
        }
        return documents.findByDocumentIdAndVersionAndChecksumAndCorpusVersionAndStatus(
                documentId, version, checksum, corpusVersion, GuidelineDocument.ACTIVE_STUDENT_DEMO).isPresent();
    }

    @Override
    @Transactional
    public int registerChunkAudits(List<GuidelineChunkAuditRequest> requests) {
        if (requests == null || requests.isEmpty() || requests.size() > 100) {
            throw new IllegalArgumentException("guideline chunk audit batch must contain one to one hundred rows");
        }
        int persisted = 0;
        for (GuidelineChunkAuditRequest request : requests) {
            validate(request);
            GuidelineDocument document = documents.findByDocumentIdAndVersionAndChecksumAndCorpusVersionAndStatus(
                    request.documentId(), request.version(), request.checksum(), request.corpusVersion(),
                    GuidelineDocument.ACTIVE_STUDENT_DEMO).orElseThrow(
                            () -> new IllegalArgumentException("guideline chunk does not belong to an active student-demo document"));
            var existing = chunks.findById(request.chunkId());
            if (existing.isPresent()) {
                if (!matches(existing.get(), request)) {
                    throw new IllegalArgumentException("guideline chunk id conflicts with immutable audit metadata");
                }
                continue;
            }
            chunks.save(GuidelineChunk.builder().chunkId(request.chunkId()).document(document)
                    .sectionPath(request.sectionPath()).page(request.page()).checksum(request.checksum())
                    .textHash(request.textHash()).corpusVersion(request.corpusVersion()).indexedAt(Instant.now()).build());
            persisted++;
        }
        return persisted;
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static boolean canonicalDocumentId(String value) {
        return value != null && value.matches("[a-z0-9]+(?:-[a-z0-9]+)*");
    }

    private static void validate(GuidelineChunkAuditRequest request) {
        if (request == null || !canonicalDocumentId(request.documentId()) || blank(request.version())
                || request.chunkId() == null || blank(request.sectionPath()) || request.sectionPath().length() > 1000
                || request.page() < 1 || request.page() > 10000 || !sha256(request.checksum())
                || !sha256(request.textHash()) || blank(request.corpusVersion()) || request.corpusVersion().length() > 100) {
            throw new IllegalArgumentException("invalid guideline chunk audit metadata");
        }
    }

    private static boolean matches(GuidelineChunk existing, GuidelineChunkAuditRequest request) {
        return existing.getDocument().getDocumentId().equals(request.documentId())
                && existing.getSectionPath().equals(request.sectionPath()) && existing.getPage() == request.page()
                && existing.getChecksum().equals(request.checksum()) && existing.getTextHash().equals(request.textHash())
                && existing.getCorpusVersion().equals(request.corpusVersion());
    }

    private static boolean sha256(String value) {
        return value != null && value.matches("[0-9a-f]{64}");
    }
}
