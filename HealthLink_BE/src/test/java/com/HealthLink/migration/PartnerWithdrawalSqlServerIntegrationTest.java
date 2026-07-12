package com.HealthLink.migration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@EnabledIfSystemProperty(named = "healthlink.sqlserver.integration.url", matches = ".+")
class PartnerWithdrawalSqlServerIntegrationTest {

    private static final Path MIGRATION_DIRECTORY = Path.of("src", "main", "resources", "db");

    @Test
    void migrationsRunTwiceAndAllowWithdrawalPinTokens() throws Exception {
        String baseUrl = withoutDatabaseName(System.getProperty("healthlink.sqlserver.integration.url"));
        String username = System.getProperty("healthlink.sqlserver.integration.username");
        String password = System.getProperty("healthlink.sqlserver.integration.password");
        String database = "HealthLinkMigrationTest_" + UUID.randomUUID().toString().replace("-", "");

        try (Connection master = DriverManager.getConnection(baseUrl + ";databaseName=master", username, password);
             Statement statement = master.createStatement()) {
            statement.execute("CREATE DATABASE [" + database + "]");
        }

        try {
            try (Connection connection = DriverManager.getConnection(baseUrl + ";databaseName=" + database, username, password);
                 Statement statement = connection.createStatement()) {
                statement.execute("""
                        CREATE TABLE dbo.Users (Id VARCHAR(64) COLLATE Latin1_General_100_CI_AS NOT NULL PRIMARY KEY);
                        CREATE TABLE dbo.EmailVerificationTokens (
                            Id BIGINT IDENTITY(1,1) PRIMARY KEY,
                            Token VARCHAR(450) NOT NULL UNIQUE,
                            UserId VARCHAR(64) COLLATE Latin1_General_100_CI_AS NOT NULL,
                            NewEmail VARCHAR(256) NOT NULL,
                            ExpiryDate DATETIME2 NOT NULL,
                            Used BIT NOT NULL,
                            Type VARCHAR(50) NOT NULL,
                            CreatedAt DATETIME2 NOT NULL,
                            CONSTRAINT CK__EmailVerif__Type__5FB337D6
                                CHECK (Type IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET')),
                            CONSTRAINT CK_EmailVerificationTokens_ResetUnused
                                CHECK (Type <> 'PASSWORD_RESET' OR Used = 0)
                        );
                        INSERT INTO dbo.Users (Id) VALUES ('partner-1');
                        """);

                executeMigration(statement, "migration-v17-add-partner-withdrawal-credentials.sql");
                executeMigration(statement, "migration-v18-add-withdrawal-pin-token-type.sql");
                executeMigration(statement, "migration-v17-add-partner-withdrawal-credentials.sql");
                executeMigration(statement, "migration-v18-add-withdrawal-pin-token-type.sql");

                statement.execute("""
                        INSERT INTO dbo.EmailVerificationTokens
                            (Token, UserId, NewEmail, ExpiryDate, Used, Type, CreatedAt)
                        VALUES
                            ('email-token', 'partner-1', 'partner@test.com', DATEADD(MINUTE, 5, SYSUTCDATETIME()), 0, 'EMAIL_VERIFICATION', SYSUTCDATETIME()),
                            ('password-token', 'partner-1', 'partner@test.com', DATEADD(MINUTE, 5, SYSUTCDATETIME()), 0, 'PASSWORD_RESET', SYSUTCDATETIME()),
                            ('pin-token', 'partner-1', 'partner@test.com', DATEADD(MINUTE, 5, SYSUTCDATETIME()), 0, 'WITHDRAWAL_PIN', SYSUTCDATETIME());
                        INSERT INTO dbo.PartnerWithdrawalCredentials (UserId, PinHash)
                        VALUES ('partner-1', 'bcrypt-hash');
                        """);

                try (ResultSet result = statement.executeQuery("""
                        SELECT COUNT(*)
                        FROM dbo.EmailVerificationTokens
                        WHERE Type IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'WITHDRAWAL_PIN')
                        """)) {
                    assertThat(result.next()).isTrue();
                    assertThat(result.getInt(1)).isEqualTo(3);
                }

                try (ResultSet result = statement.executeQuery("""
                        SELECT TYPE_NAME(c.user_type_id), c.max_length, c.collation_name
                        FROM sys.columns c
                        WHERE c.object_id = OBJECT_ID('dbo.PartnerWithdrawalCredentials') AND c.name = 'UserId'
                        """)) {
                    assertThat(result.next()).isTrue();
                    assertThat(result.getString(1)).isEqualToIgnoringCase("varchar");
                    assertThat(result.getInt(2)).isEqualTo(64);
                    assertThat(result.getString(3)).isEqualToIgnoringCase("Latin1_General_100_CI_AS");
                }

                try (ResultSet result = statement.executeQuery("""
                        SELECT COUNT(*)
                        FROM sys.check_constraints
                        WHERE parent_object_id = OBJECT_ID('dbo.EmailVerificationTokens')
                          AND name = 'CK_EmailVerificationTokens_ResetUnused'
                        """)) {
                    assertThat(result.next()).isTrue();
                    assertThat(result.getInt(1)).isEqualTo(1);
                }
            }
        } finally {
            try (Connection master = DriverManager.getConnection(baseUrl + ";databaseName=master", username, password);
                 Statement statement = master.createStatement()) {
                statement.execute("ALTER DATABASE [" + database + "] SET SINGLE_USER WITH ROLLBACK IMMEDIATE");
                statement.execute("DROP DATABASE [" + database + "]");
            }
        }
    }

    private void executeMigration(Statement statement, String fileName) throws Exception {
        statement.execute(Files.readString(MIGRATION_DIRECTORY.resolve(fileName)));
    }

    private String withoutDatabaseName(String url) {
        return url.replaceAll("(?i);databaseName=[^;]*", "");
    }
}
