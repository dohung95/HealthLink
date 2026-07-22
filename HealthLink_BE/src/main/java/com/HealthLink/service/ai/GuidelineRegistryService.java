package com.HealthLink.service.ai;

/** Validates that a retrieved citation is still in the local student-demo registry. */
public interface GuidelineRegistryService {
    boolean isActiveStudentDemoCitation(String documentId, String version, String checksum, String corpusVersion);
}
