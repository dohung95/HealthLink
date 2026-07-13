package com.HealthLink.entity;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class EmailVerificationTokenMigrationContractTest {

    @Test
    void v19AddsNonNullFailedAttemptsWithDefaultZero() throws Exception {
        Path migration = Path.of("src/main/resources/db/migration-v19-add-email-verification-token-failed-attempts.sql");

        assertThat(Files.exists(migration)).isTrue();
        String sql = Files.readString(migration);
        assertThat(sql).contains("EmailVerificationTokens", "FailedAttempts INT NOT NULL", "DEFAULT 0",
                "COL_LENGTH", "IF NOT EXISTS", "DECLARE @sql NVARCHAR(MAX)",
                "SET @sql = N'UPDATE dbo.EmailVerificationTokens",
                "SET @sql = N'ALTER TABLE dbo.EmailVerificationTokens ALTER COLUMN FailedAttempts",
                "SET @sql = N'ALTER TABLE dbo.EmailVerificationTokens ADD CONSTRAINT",
                "EXEC sys.sp_executesql @sql");
        assertThat(EmailVerificationToken.builder().build().getFailedAttempts()).isZero();
    }
}
