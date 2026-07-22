package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.ClinicalContextPreviewResponse;
import com.HealthLink.dto.ai.ClinicalContextUpdateRequest;
import com.HealthLink.dto.ai.ClinicalContextSnapshotRequest;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.VitalSign;
import com.HealthLink.entity.ai.LabReport;
import com.HealthLink.exception.StaleClinicalContextVersionException;
import com.HealthLink.repository.ai.ClinicalContextSnapshotRepository;
import com.HealthLink.repository.ai.EncounterClinicalContextRepository;
import com.HealthLink.repository.ai.LabReportRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.repository.vitalsign.VitalSignRepository;
import com.HealthLink.utility.DoctorSecurityUtils;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class ClinicalContextServiceTest {
    @Test
    void previewUsesOnlyAppointmentVitalsAndMarksUnknownProfileDataAsUnknown() {
        Appointment appointment = appointment(7);
        appointment.setSymptoms("synthetic patient-reported dizziness");
        Patient patient = appointment.getPatient();
        patient.setAllergies("   ");
        patient.setGender(null);
        patient.setDateOfBirth(null);
        AppointmentRepository appointments = mock(AppointmentRepository.class);
        VitalSignRepository vitals = mock(VitalSignRepository.class);
        LabReportRepository reports = mock(LabReportRepository.class);
        when(appointments.findById(7)).thenReturn(Optional.of(appointment));
        when(vitals.findTopByAppointment_AppointmentIdOrderByMeasuredAtDesc(7)).thenReturn(Optional.empty());
        when(reports.findByAppointment_AppointmentIdOrderByUploadedAtDesc(7)).thenReturn(List.of());

        ClinicalContextPreviewResponse preview = service(appointments, vitals, reports).preview(7);

        assertThat(preview.fields().get("allergies").value()).isNull();
        assertThat(preview.fields().get("allergies").verificationState()).isEqualTo("UNKNOWN");
        assertThat(preview.fields().get("patientReportedSymptoms").value()).isEqualTo("synthetic patient-reported dizziness");
        assertThat(preview.fields().get("patientReportedSymptoms").sourceType()).isEqualTo("APPOINTMENT");
        assertThat(preview.fields().get("heartRate").value()).isNull();
        assertThat(preview.blockers()).extracting(blocker -> blocker.code()).containsExactlyInAnyOrder(
                "MISSING_SYMPTOMS", "MISSING_APPOINTMENT_VITALS", "MISSING_AGE", "MISSING_SEX", "NO_VERIFIED_LABS");
        verify(vitals).findTopByAppointment_AppointmentIdOrderByMeasuredAtDesc(7);
        verify(vitals, never()).findByPatient_PatientIdOrderByMeasuredAtDesc(anyString());
    }

    @Test
    void updateRejectsStaleExpectedContextVersionBeforeChangingDoctorSymptoms() {
        Appointment appointment = appointment(7);
        AppointmentRepository appointments = mock(AppointmentRepository.class);
        EncounterClinicalContextRepository contexts = mock(EncounterClinicalContextRepository.class);
        when(appointments.findById(7)).thenReturn(Optional.of(appointment));
        when(contexts.findByAppointment_AppointmentId(7)).thenReturn(Optional.of(
                com.HealthLink.entity.ai.EncounterClinicalContext.builder().appointment(appointment).rowVersion(3).doctorSymptoms("old").build()));

        assertThatThrownBy(() -> service(appointments, mock(VitalSignRepository.class), mock(LabReportRepository.class), contexts)
                .update(7, new ClinicalContextUpdateRequest("new doctor symptoms", null, 2L)))
                .isInstanceOf(StaleClinicalContextVersionException.class);
        verify(contexts, never()).save(any());
    }

    @Test
    void snapshotUsesVerifiedReportsFromItsAppointmentAndKeepsCanonicalDataImmutable() {
        Appointment appointment = appointment(7);
        Patient patient = appointment.getPatient();
        patient.setGender("Female");
        patient.setDateOfBirth(LocalDateTime.of(1990, 1, 1, 0, 0));
        patient.setAllergies("synthetic allergy A");
        VitalSign vital = VitalSign.builder().vitalSignId(44).appointment(appointment).patient(patient)
                .heartRate(72).measuredAt(LocalDateTime.of(2026, 7, 22, 8, 50)).build();
        UUID reportId = UUID.randomUUID();
        LabReport verified = LabReport.builder().reportId(reportId).appointment(appointment).status(LabReport.VERIFIED).build();
        AppointmentRepository appointments = mock(AppointmentRepository.class);
        VitalSignRepository vitals = mock(VitalSignRepository.class);
        LabReportRepository reports = mock(LabReportRepository.class);
        EncounterClinicalContextRepository contexts = mock(EncounterClinicalContextRepository.class);
        ClinicalContextSnapshotRepository snapshots = mock(ClinicalContextSnapshotRepository.class);
        when(appointments.findById(7)).thenReturn(Optional.of(appointment));
        when(vitals.findTopByAppointment_AppointmentIdOrderByMeasuredAtDesc(7)).thenReturn(Optional.of(vital));
        when(reports.findByAppointment_AppointmentIdOrderByUploadedAtDesc(7)).thenReturn(List.of(verified));
        when(contexts.findByAppointment_AppointmentId(7)).thenReturn(Optional.of(
                com.HealthLink.entity.ai.EncounterClinicalContext.builder().appointment(appointment).rowVersion(2)
                        .doctorSymptoms("synthetic symptoms").build()));

        var response = service(appointments, vitals, reports, contexts, snapshots)
                .snapshot(7, new ClinicalContextSnapshotRequest(List.of(reportId), 2L));

        var stored = org.mockito.ArgumentCaptor.forClass(com.HealthLink.entity.ai.ClinicalContextSnapshot.class);
        verify(snapshots).save(stored.capture());
        assertThat(stored.getValue().getLabReports()).extracting(LabReport::getReportId).containsExactly(reportId);
        String originalCanonicalJson = stored.getValue().getCanonicalJson();
        patient.setAllergies("later changed synthetic allergy");
        assertThat(originalCanonicalJson).contains("synthetic allergy A").doesNotContain("later changed synthetic allergy");
        assertThat(response.requiredFieldStatus()).containsEntry("verifiedLabs", true).containsEntry("appointmentVitals", true);
        assertThat(response.createdAt().toString()).endsWith("Z");
    }

    private static ClinicalContextService service(AppointmentRepository appointments, VitalSignRepository vitals, LabReportRepository reports) {
        return service(appointments, vitals, reports, mock(EncounterClinicalContextRepository.class));
    }

    private static ClinicalContextService service(AppointmentRepository appointments, VitalSignRepository vitals,
                                                  LabReportRepository reports, EncounterClinicalContextRepository contexts) {
        return service(appointments, vitals, reports, contexts, mock(ClinicalContextSnapshotRepository.class));
    }

    private static ClinicalContextService service(AppointmentRepository appointments, VitalSignRepository vitals,
                                                  LabReportRepository reports, EncounterClinicalContextRepository contexts,
                                                  ClinicalContextSnapshotRepository snapshots) {
        return new ClinicalContextService(appointments, vitals, reports, contexts, snapshots,
                mock(ConsultationRepository.class), mock(DoctorSecurityUtils.class));
    }

    private static Appointment appointment(int id) {
        Patient patient = Patient.builder().patientId("synthetic-patient").fullName("Synthetic Demo").build();
        return Appointment.builder().appointmentId(id).appointmentTime(LocalDateTime.of(2026, 7, 22, 9, 0))
                .patient(patient).doctor(Doctor.builder().doctorId("doctor-demo").build()).build();
    }
}
