package com.HealthLink.dto.ai;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/** Non-PHI, immutable audit metadata for a local Qdrant guideline chunk. */
public record GuidelineChunkAuditRequest(
        @NotBlank @Pattern(regexp = "[a-z0-9]+(?:-[a-z0-9]+)*") @Size(max = 160) String documentId,
        @NotBlank @Size(max = 100) String version,
        @NotNull UUID chunkId,
        @NotBlank @Size(max = 1000) String sectionPath,
        @Min(1) @Max(10000) int page,
        @NotBlank @Pattern(regexp = "[0-9a-f]{64}") String checksum,
        @NotBlank @Pattern(regexp = "[0-9a-f]{64}") String textHash,
        @NotBlank @Size(max = 100) String corpusVersion) {
}
