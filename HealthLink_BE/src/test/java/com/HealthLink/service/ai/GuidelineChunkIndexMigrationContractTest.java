package com.HealthLink.service.ai;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class GuidelineChunkIndexMigrationContractTest {
    @Test
    void replacementMigrationRemovesOversizedGuidelineChunkUniqueIndex() throws Exception {
        String migration = Files.readString(Path.of("src/main/resources/db/migration-v34-fix-guideline-chunk-index.sql"));

        assertThat(migration).contains("ALTER TABLE dbo.GuidelineChunks DROP CONSTRAINT [UQ_GuidelineChunks_Identity]");
        assertThat(migration).doesNotContain("CREATE UNIQUE INDEX UQ_GuidelineChunks_Identity");
    }
}
