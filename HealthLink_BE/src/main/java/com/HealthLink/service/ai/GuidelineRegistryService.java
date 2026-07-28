package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.GuidelineChunkAuditRequest;

import java.util.List;

/** Validates that a retrieved citation is still in the local student-demo registry. */
public interface GuidelineRegistryService {
    boolean isActiveStudentDemoCitation(String documentId, String version, String checksum, String corpusVersion);
    int registerChunkAudits(List<GuidelineChunkAuditRequest> requests);
}
