package com.HealthLink.seed;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Contract test that validates data-seed.sql contains the required
 * pharmacy revenue demo rows for {@code user-ph01}.
 */
class PharmacyRevenueSeedContractTest {

    private static String loadSeedSql() throws IOException {
        var resource = new ClassPathResource("data-seed.sql");
        return Files.readString(resource.getFile().toPath(), StandardCharsets.UTF_8);
    }

    @Test
    void containsRequiredPharmacyRevenueKeywords() throws IOException {
        var sql = loadSeedSql();

        // Core table and demo identifiers
        assertThat(sql).contains("user-ph01");
        assertThat(sql).contains("netAmount");
        assertThat(sql).contains("GETDATE()");
        assertThat(sql).contains("VESTED");
        assertThat(sql).contains("SETTLED");
        assertThat(sql).contains("PENDING");

        // Relative date SQL functions
        assertThat(sql).contains("DATEADD(DAY");
        assertThat(sql).contains("DATEFROMPARTS");

        // CommissionTransactions section
        assertThat(sql).contains("CommissionTransactions");

        // Wallet reconciliation
        assertThat(sql).contains("TotalEarnings");
        assertThat(sql).contains("PendingSettlement");
    }

    @Test
    void demoTransactionNumbersDoNotIncludeREFUNDED() throws IOException {
        var sql = loadSeedSql();

        // Every CTX-DEMO-PH01-* row must not have REFUNDED status
        // Search for any line with a demo transaction number that also contains REFUNDED
        var lines = sql.split("\n");
        for (var line : lines) {
            if (line.contains("CTX-DEMO-PH01-") && line.contains("REFUNDED")) {
                throw new AssertionError(
                        "Demo transaction contains REFUNDED status: " + line.trim());
            }
        }
    }

    @Test
    void hasAtLeastOnePharmacyRevenueDemoRow() throws IOException {
        var sql = loadSeedSql();
        assertThat(sql).contains("CTX-DEMO-PH01-D0");
    }

    @Test
    void hasWalletReconciliationUpdate() throws IOException {
        var sql = loadSeedSql();
        assertThat(sql).contains("UPDATE p");
        assertThat(sql).contains("SET TotalEarnings");
        assertThat(sql).contains("PendingSettlement");
        assertThat(sql).contains("FROM Pharmacies p");
        assertThat(sql).contains("WHERE p.PharmacyId = 'user-ph01'");
    }
}
