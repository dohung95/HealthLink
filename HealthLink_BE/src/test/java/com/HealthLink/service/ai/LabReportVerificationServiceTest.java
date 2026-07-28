package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.LabObservationUpdateRequest;
import com.HealthLink.dto.ai.LabWarningResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.ai.LabObservation;
import com.HealthLink.entity.ai.LabReport;
import com.HealthLink.repository.ai.LabObservationRepository;
import com.HealthLink.repository.ai.LabObservationRevisionRepository;
import com.HealthLink.repository.ai.LabReportRepository;
import com.HealthLink.utility.DoctorSecurityUtils;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class LabReportVerificationServiceTest {
    @Test
    void exposesStructuredUnitWarningWithRowOrderForFrontendReview() {
        UUID reportId = UUID.randomUUID();
        LabReport report = report(reportId, 4);
        LabObservation observation = observation(report, UUID.randomUUID(), "gldL");
        LabReportRepository reports = mock(LabReportRepository.class);
        LabObservationRepository observations = mock(LabObservationRepository.class);
        when(reports.findById(reportId)).thenReturn(Optional.of(report));
        when(observations.findByReport_ReportIdOrderByRowOrderAsc(reportId)).thenReturn(java.util.List.of(observation));

        var response = new LabReportVerificationService(reports, observations, mock(DoctorSecurityUtils.class),
                mock(LabObservationRevisionRepository.class)).verification(reportId);

        assertThat(response.warnings()).containsExactly(new LabWarningResponse("UNIT_NOT_RECOGNIZED", observation.getObservationId(), 1));
    }

    @Test
    void refusesVerificationForOcrUnitThatIsNotRecognizedUntilDoctorCorrectsIt() {
        UUID reportId = UUID.randomUUID();
        UUID observationId = UUID.randomUUID();
        LabReport report = LabReport.builder().reportId(reportId).rowVersion(4)
                .status(LabReport.NEEDS_VERIFICATION).appointment(Appointment.builder()
                        .appointmentId(7).doctor(Doctor.builder().doctorId("doctor-1").build()).build()).build();
        LabObservation observation = LabObservation.builder().observationId(observationId).report(report)
                .testNameRaw("Hemoglobin").valueText("13.4").numericValue(new BigDecimal("13.4"))
                .unitRaw("gldL").verificationStatus(LabObservation.UNVERIFIED).build();
        LabReportRepository reports = mock(LabReportRepository.class);
        LabObservationRepository observations = mock(LabObservationRepository.class);
        when(reports.findByIdForVerificationMutation(reportId)).thenReturn(Optional.of(report));
        when(observations.findById(observationId)).thenReturn(Optional.of(observation));

        LabReportVerificationService service = new LabReportVerificationService(reports, observations,
                mock(DoctorSecurityUtils.class), mock(LabObservationRevisionRepository.class));

        assertThatThrownBy(() -> service.updateObservation(reportId, observationId,
                new LabObservationUpdateRequest(4L, "VERIFIED", "Hemoglobin", "13.4", new BigDecimal("13.4"),
                        null, "gldL", null, null, null, null, null, null, null)))
                .hasMessageContaining("UNIT_NOT_RECOGNIZED");
    }

    @Test
    void rejectsStaleReportVersionBeforeChangingObservation() {
        UUID reportId = UUID.randomUUID();
        UUID observationId = UUID.randomUUID();
        LabReport report = LabReport.builder().reportId(reportId).rowVersion(4)
                .appointment(Appointment.builder().doctor(Doctor.builder().doctorId("doctor-1").build()).build()).build();
        LabReportRepository reports = mock(LabReportRepository.class);
        LabObservationRepository observations = mock(LabObservationRepository.class);
        when(reports.findByIdForVerificationMutation(reportId)).thenReturn(Optional.of(report));
        LabReportVerificationService service = new LabReportVerificationService(reports, observations,
                mock(DoctorSecurityUtils.class), mock(LabObservationRevisionRepository.class));

        assertThatThrownBy(() -> service.updateObservation(reportId, observationId,
                new LabObservationUpdateRequest(3L, "REJECTED", "Hemoglobin", "13.4", null,
                        null, "g/dL", null, null, null, null, null, null, null)))
                .isInstanceOf(com.HealthLink.exception.StaleLabReportVersionException.class);
        verify(reports).findByIdForVerificationMutation(reportId);
        verifyNoInteractions(observations);
    }

    @Test
    void validatesComparatorNumericReferenceAndUcumBeforePersisting() {
        UUID reportId = UUID.randomUUID();
        UUID observationId = UUID.randomUUID();
        LabReport report = report(reportId, 4);
        LabObservation observation = observation(report, observationId, "g/dL");
        LabReportRepository reports = mock(LabReportRepository.class);
        LabObservationRepository observations = mock(LabObservationRepository.class);
        when(reports.findByIdForVerificationMutation(reportId)).thenReturn(Optional.of(report));
        when(observations.findById(observationId)).thenReturn(Optional.of(observation));
        LabReportVerificationService service = new LabReportVerificationService(reports, observations,
                mock(DoctorSecurityUtils.class), mock(LabObservationRevisionRepository.class));

        assertThatThrownBy(() -> service.updateObservation(reportId, observationId,
                new LabObservationUpdateRequest(4L, "REJECTED", "Hemoglobin", "13.4", new BigDecimal("12"),
                        "?", "g/dL", "bad ucum!", new BigDecimal("16"), new BigDecimal("12"), null, null, null, null)))
                .hasMessageContaining("Invalid laboratory observation verification request");
        verify(observations, never()).save(any());
    }

    @Test
    void rejectsMissingExpectedVersionInsteadOfTreatingItAsZero() {
        UUID reportId = UUID.randomUUID();
        UUID observationId = UUID.randomUUID();
        LabReportRepository reports = mock(LabReportRepository.class);
        LabObservationRepository observations = mock(LabObservationRepository.class);
        LabReportVerificationService service = new LabReportVerificationService(reports, observations,
                mock(DoctorSecurityUtils.class), mock(LabObservationRevisionRepository.class));

        assertThatThrownBy(() -> service.updateObservation(reportId, observationId,
                new LabObservationUpdateRequest(null, "REJECTED", "Hemoglobin", "13.4", null,
                        null, "g/dL", null, null, null, null, null, null, null)))
                .isInstanceOf(com.HealthLink.exception.BadRequestException.class)
                .hasMessageContaining("expectedVersion");
        verifyNoInteractions(reports, observations);
    }

    private static LabReport report(UUID reportId, long version) {
        return LabReport.builder().reportId(reportId).rowVersion(version).status(LabReport.NEEDS_VERIFICATION)
                .appointment(Appointment.builder().appointmentId(7).doctor(Doctor.builder().doctorId("doctor-1").build()).build()).build();
    }

    private static LabObservation observation(LabReport report, UUID observationId, String unit) {
        return LabObservation.builder().observationId(observationId).report(report).rowOrder(1).testNameRaw("Hemoglobin")
                .valueText("13.4").numericValue(new BigDecimal("13.4")).unitRaw(unit)
                .verificationStatus(LabObservation.UNVERIFIED).build();
    }
}
