package com.HealthLink.migration;

import com.HealthLink.entity.TokenType;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class PartnerWithdrawalMigrationContractTest {

    private static final Path MIGRATION_DIRECTORY = Path.of("src", "main", "resources", "db");

    @Test
    void withdrawalPinTokenMigrationReplacesTheDatabaseCheckConstraintIdempotently() throws IOException {
        String sql = readMigration("migration-v18-add-withdrawal-pin-token-type.sql");

        assertThat(sql)
                .contains("sys.check_constraints")
                .contains("cc.parent_column_id = COLUMNPROPERTY")
                .contains("cc.name = 'CK_EmailVerificationTokens_Type'")
                .contains("cc.name LIKE 'CK__EmailVerif__Type__%'")
                .contains("DROP CONSTRAINT")
                .contains("EMAIL_VERIFICATION")
                .contains("PASSWORD_RESET")
                .contains("WITHDRAWAL_PIN")
                .contains("CK_EmailVerificationTokens_Type");
    }

    @Test
    void expandedTokenTypeMigrationMatchesTheJavaEnum() throws IOException {
        String sql = readMigration("migration-v20-expand-email-verification-token-types.sql");

        assertThat(sql)
                .contains("SET XACT_ABORT ON")
                .contains("BEGIN TRANSACTION")
                .contains("sys.check_constraints")
                .contains("DROP CONSTRAINT")
                .contains("WITH CHECK")
                .contains("CK_EmailVerificationTokens_Type");

        Set<String> expectedTypes = Set.of(
                "EMAIL_VERIFICATION",
                "PASSWORD_RESET",
                "WITHDRAWAL_PIN",
                "PAYPAL_EMAIL_CONFIRM",
                "PAYPAL_EMAIL_OTP");

        assertThat(TokenType.values())
                .extracting(Enum::name)
                .containsExactlyInAnyOrderElementsOf(expectedTypes);
        assertThat(expectedTypes).allSatisfy(type -> assertThat(sql).contains("'" + type + "'"));
    }

    @Test
    void credentialMigrationCanRepairMissingConstraintsAndMismatchedUserId() throws IOException {
        String sql = readMigration("migration-v17-add-partner-withdrawal-credentials.sql");

        assertThat(sql)
                .contains("COL_LENGTH('dbo.PartnerWithdrawalCredentials', 'UserId')")
                .contains("sys.foreign_keys")
                .contains("sys.key_constraints")
                .contains("FK_PartnerWithdrawalCredentials_Users")
                .contains("UQ_PartnerWithdrawalCredentials_UserId");
    }

    private String readMigration(String fileName) throws IOException {
        return Files.readString(MIGRATION_DIRECTORY.resolve(fileName));
    }
}
