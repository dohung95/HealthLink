package com.HealthLink.service.impl.ai;

import com.HealthLink.entity.ai.GuidelineDocument;
import com.HealthLink.repository.ai.GuidelineChunkRepository;
import com.HealthLink.repository.ai.GuidelineDocumentRepository;
import com.HealthLink.service.ai.GuidelineRegistryService;
import org.springframework.stereotype.Service;

import java.util.UUID;

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
    public boolean isActiveStudentDemoCitation(UUID documentId, String version, String checksum, String corpusVersion) {
        if (documentId == null || blank(version) || checksum == null || !checksum.matches("[0-9a-f]{64}") || blank(corpusVersion)) {
            return false;
        }
        return documents.findByDocumentIdAndVersionAndChecksumAndCorpusVersionAndStatus(
                documentId, version, checksum, corpusVersion, GuidelineDocument.ACTIVE_STUDENT_DEMO).isPresent();
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
