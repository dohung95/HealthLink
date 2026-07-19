package com.HealthLink.entity.ai;

import com.HealthLink.repository.ai.LabObservationRepository;
import com.HealthLink.repository.ai.LabReportRepository;
import jakarta.persistence.Column;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Version;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class LabReportSchemaContractTest {

    @Test
    void migrationDefinesAppointmentScopedReportsAndOrderedObservations() throws Exception {
        Path migration = Path.of("src/main/resources/db/migration-v25-ai-lab-reports.sql");

        assertThat(Files.exists(migration)).isTrue();
        String sql = Files.readString(migration);

        assertThat(sql).contains(
                "LabReports", "LabObservations", "ReportID UNIQUEIDENTIFIER", "ObservationID UNIQUEIDENTIFIER",
                "AppointmentID", "HealthRecordID", "MedicalDocumentID", "ObjectKey", "OriginalFileName",
                "Sha256", "UploadedByDoctorID", "VerificationStatus", "SourceBoundingBoxJson",
                "FOREIGN KEY", "Appointments", "HealthRecords", "MedicalDocuments", "Doctors",
                "IX_LabReports_AppointmentID_UploadedAt", "IX_LabObservations_ReportID_RowOrder",
                "UPLOADED", "OCR_PENDING", "OCR_RUNNING", "NEEDS_VERIFICATION", "VERIFIED", "OCR_FAILED", "CANCELLED",
                "UNVERIFIED", "REJECTED");
    }

    @Test
    void reportPreservesOriginalFileMetadataAndObservationStartsUnverified() throws Exception {
        assertThat(LabReport.class.getDeclaredField("reportId").getType()).isEqualTo(UUID.class);
        assertAssociation(LabReport.class, "appointment", "AppointmentID", false);
        assertAssociation(LabReport.class, "healthRecord", "HealthRecordID", true);
        assertAssociation(LabReport.class, "medicalDocument", "MedicalDocumentID", true);
        assertAssociation(LabReport.class, "uploadedByDoctor", "UploadedByDoctorID", false);
        assertAssociation(LabReport.class, "verifiedByDoctor", "VerifiedByDoctorID", true);

        assertImmutable(LabReport.class, "objectKey");
        assertImmutable(LabReport.class, "originalFileName");
        assertImmutable(LabReport.class, "mimeType");
        assertImmutable(LabReport.class, "fileSize");
        assertImmutable(LabReport.class, "sha256");
        assertImmutable(LabReport.class, "pageCount");
        assertThat(LabReport.class.getDeclaredField("rowVersion").isAnnotationPresent(Version.class)).isTrue();

        assertThat(LabObservation.class.getDeclaredField("observationId").getType()).isEqualTo(UUID.class);
        assertAssociation(LabObservation.class, "report", "ReportID", false);
        assertThat(LabObservation.UNVERIFIED).isEqualTo("UNVERIFIED");
        assertThat(LabObservation.class.getDeclaredField("rowOrder").getType()).isEqualTo(Integer.class);
        assertThat(LabObservation.class.getDeclaredField("sourceBoundingBoxJson").getAnnotation(Column.class).columnDefinition())
                .isEqualTo("NVARCHAR(MAX)");
    }

    @Test
    void repositoriesExposeAppointmentAndReportScopedOrdering() throws Exception {
        assertThat(LabReportRepository.class.getMethod(
                "findByAppointment_AppointmentIdOrderByUploadedAtDesc", Integer.class).getReturnType())
                .isAssignableFrom(java.util.List.class);
        assertThat(LabObservationRepository.class.getMethod(
                "findByReport_ReportIdOrderByRowOrderAsc", UUID.class).getReturnType())
                .isAssignableFrom(java.util.List.class);
    }

    private static void assertAssociation(Class<?> type, String fieldName, String columnName, boolean nullable) throws Exception {
        Field field = type.getDeclaredField(fieldName);
        assertThat(field.isAnnotationPresent(ManyToOne.class)).isTrue();
        JoinColumn joinColumn = field.getAnnotation(JoinColumn.class);
        assertThat(joinColumn.name()).isEqualTo(columnName);
        assertThat(joinColumn.nullable()).isEqualTo(nullable);
    }

    private static void assertImmutable(Class<?> type, String fieldName) throws Exception {
        Column column = type.getDeclaredField(fieldName).getAnnotation(Column.class);
        assertThat(column.updatable()).isFalse();
    }
}
