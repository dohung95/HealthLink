package com.HealthLink.migration;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class SettlementRequestIdMigrationTest {

    @Test
    void v22AddsClientRequestIdBeforeInspectingOrReplacingItsUniqueConstraint() throws IOException {
        String migration = new String(getClass().getResourceAsStream(
                "/db/migration-v22-scope-settlement-request-id-by-partner.sql").readAllBytes(), StandardCharsets.UTF_8);

        int addColumn = migration.indexOf("ALTER TABLE dbo.settlements ADD client_request_id VARCHAR(100) NULL");
        int columnGuard = migration.indexOf("IF COL_LENGTH('dbo.settlements', 'client_request_id') IS NULL");
        int constraintLookup = migration.indexOf("FROM sys.key_constraints");
        int legacyIndexDrop = migration.indexOf("DROP INDEX UX_Settlements_ClientRequestId");
        int compositeIndex = migration.indexOf("ON dbo.settlements (recipient_type, recipient_id, client_request_id)");

        assertThat(addColumn).isGreaterThanOrEqualTo(0);
        assertThat(columnGuard).isGreaterThanOrEqualTo(0);
        assertThat(addColumn).isGreaterThan(columnGuard);
        assertThat(constraintLookup).isGreaterThan(addColumn);
        assertThat(legacyIndexDrop).isGreaterThan(addColumn);
        assertThat(compositeIndex).isGreaterThan(addColumn);
    }
}
