package com.HealthLink.repository.ai;

import com.HealthLink.entity.ai.GuidelineDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GuidelineDocumentRepository extends JpaRepository<GuidelineDocument, UUID> {
    Optional<GuidelineDocument> findByDocumentIdAndVersionAndChecksumAndCorpusVersionAndStatus(
            UUID documentId, String version, String checksum, String corpusVersion, String status);
}
