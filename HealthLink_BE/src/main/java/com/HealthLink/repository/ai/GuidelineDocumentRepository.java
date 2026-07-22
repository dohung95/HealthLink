package com.HealthLink.repository.ai;

import com.HealthLink.entity.ai.GuidelineDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GuidelineDocumentRepository extends JpaRepository<GuidelineDocument, String> {
    Optional<GuidelineDocument> findByDocumentIdAndVersionAndChecksumAndCorpusVersionAndStatus(
            String documentId, String version, String checksum, String corpusVersion, String status);
}
