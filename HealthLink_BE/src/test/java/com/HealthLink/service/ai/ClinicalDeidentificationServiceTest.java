package com.HealthLink.service.ai;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ClinicalDeidentificationServiceTest {
    @Test
    void removesDirectIdentifiersAndExactDatesFromSnapshotPayload() {
        var service = new ClinicalDeidentificationService();

        Map<String, Object> result = service.deidentify(Map.of(
                "patientId", "synthetic-patient-7", "appointmentId", 7, "name", "Synthetic Patient",
                "dateOfBirth", "1990-01-01", "symptoms", "synthetic dizziness", "sex", "Female",
                "heartRate", 72, "ageYears", 36));

        assertThat(result).doesNotContainKeys("patientId", "appointmentId", "name", "dateOfBirth");
        assertThat(result).containsEntry("symptoms", "synthetic dizziness").containsEntry("sex", "Female")
                .containsEntry("heartRate", 72).containsEntry("ageYears", 36);
    }

    @Test
    void flattensCanonicalSnapshotFieldsWithoutSourceMetadata() {
        var service = new ClinicalDeidentificationService();

        Map<String, Object> result = service.deidentify(Map.of("fields", Map.of(
                "ageYears", Map.of("value", 36, "sourceId", "patient-7", "capturedAt", "2026-07-27"),
                "symptoms", Map.of("value", "synthetic dizziness", "sourceId", "appointment-7"),
                "heartRate", Map.of("value", 72, "sourceId", "vital-7"),
                "verifiedLabReportIds", Map.of("value", java.util.List.of("report-7"), "sourceId", "report-7")
        )));

        assertThat(result).containsEntry("ageYears", 36).containsEntry("symptoms", "synthetic dizziness")
                .containsEntry("heartRate", 72);
        assertThat(result).doesNotContainKeys("fields", "sourceId", "capturedAt", "verifiedLabReportIds");
    }
}
