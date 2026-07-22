package com.HealthLink.service.ai;

import java.util.UUID;

/** Validates that a retrieved citation is still in the local student-demo registry. */
public interface GuidelineRegistryService {
    boolean isActiveStudentDemoCitation(UUID documentId, String version, String checksum, String corpusVersion);
}
