package com.HealthLink.migration;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Reserves the CDS migration sequence and validates each script as its owning task adds it.
 *
 * <p>The scripts deliberately do not exist in T01.  Conditional validation keeps this contract
 * executable now, while preventing a later task from adding an unguarded or incomplete script.</p>
 */
class AiCdsMigrationContractTest {

    private static final Path MIGRATION_DIRECTORY = Path.of("src", "main", "resources", "db");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private static final Map<String, List<String>> REQUIRED_SQL = requiredSqlByMigration();

    @Test
    void reservesTheFiveCdsMigrationNamesWithoutVersionCollisions() throws IOException {
        assertThat(REQUIRED_SQL.keySet()).containsExactlyInAnyOrder(
                "migration-v24-ai-cds-core.sql",
                "migration-v25-ai-lab-reports.sql",
                "migration-v26-ai-clinical-context.sql",
                "migration-v27-ai-guidelines.sql",
                "migration-v28-ai-cds-audit.sql");

        List<String> claimedReservedNames = migrationFileNames().stream()
                .filter(name -> name.matches("migration-v2[4-8]-.*\\.sql"))
                .toList();

        assertThat(claimedReservedNames).allSatisfy(name -> assertThat(REQUIRED_SQL).containsKey(name));
    }

    @Test
    void everyIntroducedCdsMigrationUsesSqlServerGuardsAndItsSchemaContract() throws IOException {
        for (Map.Entry<String, List<String>> contract : REQUIRED_SQL.entrySet()) {
            Path migration = MIGRATION_DIRECTORY.resolve(contract.getKey());
            if (Files.notExists(migration)) {
                continue;
            }

            String sql = normalizedSql(migration);
            assertThat(sql)
                    .as("%s must use guarded SQL Server DDL", contract.getKey())
                    .contains("IF ")
                    .containsAnyOf("OBJECT_ID", "COL_LENGTH", "sys.indexes", "sys.key_constraints");
            assertThat(sql)
                    .as("%s must satisfy its CDS schema contract", contract.getKey())
                    .contains(contract.getValue());
        }
    }

    private static Map<String, List<String>> requiredSqlByMigration() {
        Map<String, List<String>> contracts = new LinkedHashMap<>();
        contracts.put("migration-v24-ai-cds-core.sql", List.of(
                "AiJobs", "JobID", "JobType", "ResourceType", "ResourceID", "Status",
                "AttemptCount", "MaxAttempts", "CorrelationID", "LastErrorCode", "RowVersion",
                "PENDING", "RUNNING", "SUCCEEDED", "FAILED_RETRYABLE", "FAILED_FINAL", "CANCELLED",
                "UNIQUE", "JobType", "ResourceType", "ResourceID", "CorrelationID"));
        contracts.put("migration-v25-ai-lab-reports.sql", List.of(
                "LabReports", "LabObservations", "ReportID", "AppointmentID", "ObjectKey", "Sha256",
                "UploadedByDoctorID", "VerificationStatus", "SourceBoundingBoxJson", "FOREIGN KEY",
                "Appointments", "HealthRecords", "MedicalDocuments", "Doctors", "UNIQUE", "RowOrder",
                "UPLOADED", "OCR_PENDING", "NEEDS_VERIFICATION", "VERIFIED", "OCR_FAILED", "CANCELLED"));
        contracts.put("migration-v26-ai-clinical-context.sql", List.of(
                "EncounterClinicalContexts", "ClinicalContextSnapshots", "SnapshotLabReports", "ContextID",
                "SnapshotID", "AppointmentID", "CanonicalJson", "Sha256", "FOREIGN KEY", "UNIQUE"));
        contracts.put("migration-v27-ai-guidelines.sql", List.of(
                "GuidelineDocuments", "GuidelineChunks", "DocumentID", "ChunkID", "Checksum", "License",
                "CorpusVersion", "SectionPath", "Page", "FOREIGN KEY", "UNIQUE"));
        contracts.put("migration-v28-ai-cds-audit.sql", List.of(
                "CdsDecisions", "CdsAuditEvents", "DecisionID", "RunID", "DoctorID", "DecisionStatus",
                "OriginalOutputHash", "EventHash", "PreviousHash", "FOREIGN KEY", "UNIQUE"));
        return Map.copyOf(contracts);
    }

    private static List<String> migrationFileNames() throws IOException {
        try (var files = Files.list(MIGRATION_DIRECTORY)) {
            return files
                    .filter(Files::isRegularFile)
                    .map(path -> path.getFileName().toString())
                    .sorted()
                    .toList();
        }
    }

    private static String normalizedSql(Path migration) throws IOException {
        return WHITESPACE.matcher(Files.readString(migration, StandardCharsets.UTF_8)).replaceAll(" ");
    }
}
