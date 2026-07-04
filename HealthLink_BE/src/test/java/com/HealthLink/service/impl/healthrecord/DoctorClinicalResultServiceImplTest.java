package com.HealthLink.service.impl.healthrecord;

import com.HealthLink.dto.request.healthrecord.ClinicalResultUpsertRequest;
import com.HealthLink.dto.response.healthrecord.MedicalDocumentResponse;
import com.HealthLink.entity.*;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ForbiddenException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.healthrecord.HealthRecordRepository;
import com.HealthLink.repository.healthrecord.MedicalDocumentRepository;
import com.HealthLink.service.healthrecord.FileStorageService;
import com.HealthLink.service.notification.NotificationService;
import com.HealthLink.service.moderation.ImageModerationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DoctorClinicalResultServiceImplTest {
    @Mock private AppointmentRepository appointmentRepository;
    @Mock private HealthRecordRepository healthRecordRepository;
    @Mock private MedicalDocumentRepository medicalDocumentRepository;
    @Mock private FileStorageService fileStorageService;
    @Mock private ImageModerationService imageModerationService;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private DoctorClinicalResultServiceImpl service;

    @Test
    void createResult_shouldSaveDraftForOwnAppointmentWithoutPatientNotification() {
        Appointment appointment = appointment(10, "doctor-1", "patient-1", "COMPLETED");
        ClinicalResultUpsertRequest request = request("Complete blood count", "Pending external lab");

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));
        when(healthRecordRepository.findByPatient_PatientIdAndRecordDateBetweenOrderByCreatedAtDesc(
                eq("patient-1"), any(), any())).thenReturn(List.of());
        when(healthRecordRepository.save(any(HealthRecord.class))).thenAnswer(invocation -> {
            HealthRecord saved = invocation.getArgument(0);
            saved.setHealthRecordId(33);
            return saved;
        });
        when(medicalDocumentRepository.save(any(MedicalDocument.class))).thenAnswer(invocation -> {
            MedicalDocument saved = invocation.getArgument(0);
            saved.setDocumentId(44);
            return saved;
        });

        MedicalDocumentResponse response = service.createResult(10, "doctor-1", request);

        assertThat(response.getDocumentId()).isEqualTo(44);
        assertThat(response.getAppointmentId()).isEqualTo(10);
        assertThat(response.getDoctorId()).isEqualTo("doctor-1");
        assertThat(response.getSourceType()).isEqualTo("DOCTOR");
        assertThat(response.getVisibilityStatus()).isEqualTo("DRAFT");
        assertThat(response.getClinicalStatus()).isEqualTo("DRAFT");
        verify(notificationService, never()).sendWebSocketNotification(any(), any(), any(), any(), any(), any());
    }

    @Test
    void createResult_shouldRejectAppointmentOwnedByAnotherDoctor() {
        when(appointmentRepository.findById(10))
                .thenReturn(Optional.of(appointment(10, "doctor-2", "patient-1", "COMPLETED")));

        assertThatThrownBy(() -> service.createResult(10, "doctor-1", request("CBC", "Pending")))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("not allowed");

        verify(medicalDocumentRepository, never()).save(any());
    }

    @Test
    void publishResult_shouldRequireStructuredResultOrFileAndNotifyPatient() {
        MedicalDocument draft = doctorDocument(44, "doctor-1", "patient-1", "DRAFT");
        draft.setTestResults("WBC 6.1");
        draft.setFileLocation(null);

        when(medicalDocumentRepository.findById(44)).thenReturn(Optional.of(draft));
        when(medicalDocumentRepository.save(any(MedicalDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MedicalDocumentResponse response = service.publishResult(44, "doctor-1");

        assertThat(response.getVisibilityStatus()).isEqualTo("PUBLISHED");
        assertThat(response.getPublishedAt()).isNotNull();
        assertThat(response.getClinicalStatus()).isEqualTo("PUBLISHED");
        verify(notificationService).sendWebSocketNotification(
                eq(draft.getHealthRecord().getPatient().getUser()),
                eq(NotificationType.CLINICAL_RESULT_PUBLISHED),
                eq("Clinical result available"),
                contains("Dr. Doctor One"),
                eq(44),
                eq("/health-records")
        );
    }

    @Test
    void updateResult_shouldRejectResultOwnedByAnotherDoctor() {
        MedicalDocument draft = doctorDocument(44, "doctor-2", "patient-1", "DRAFT");
        when(medicalDocumentRepository.findById(44)).thenReturn(Optional.of(draft));

        assertThatThrownBy(() -> service.updateResult(44, "doctor-1", request("CBC", "Updated")))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("not allowed");
    }

    private ClinicalResultUpsertRequest request(String testName, String description) {
        ClinicalResultUpsertRequest request = new ClinicalResultUpsertRequest();
        request.setCategory("Lab Result");
        request.setTestName(testName);
        request.setDescription(description);
        request.setClinicalStatus("DRAFT");
        request.setDocumentDate(LocalDate.now());
        request.setPerformedBy("Dr. Doctor One");
        request.setLabFacilityName("Central Lab");
        request.setPublishNow(false);
        return request;
    }

    private Appointment appointment(Integer id, String doctorId, String patientId, String status) {
        return Appointment.builder()
                .appointmentId(id)
                .appointmentTime(LocalDateTime.now().minusHours(2))
                .status(status)
                .consultationType("HOME_VISIT")
                .doctor(Doctor.builder().doctorId(doctorId).fullName("Doctor One").build())
                .patient(patient(patientId))
                .build();
    }

    private Patient patient(String patientId) {
        User user = User.builder().id(patientId).email(patientId + "@example.com").build();
        return Patient.builder().patientId(patientId).fullName("Patient One").user(user).build();
    }

    private MedicalDocument doctorDocument(Integer documentId, String doctorId, String patientId, String clinicalStatus) {
        HealthRecord record = HealthRecord.builder()
                .healthRecordId(33)
                .patient(patient(patientId))
                .title("Clinical Results - Appointment #10")
                .recordType("Clinical Results")
                .recordDate(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .lastUpdated(LocalDateTime.now())
                .build();

        return MedicalDocument.builder()
                .documentId(documentId)
                .healthRecord(record)
                .appointment(appointment(10, doctorId, patientId, "COMPLETED"))
                .doctor(Doctor.builder().doctorId(doctorId).fullName("Doctor One").build())
                .documentName("Complete blood count")
                .documentType("CLINICAL_RESULT")
                .sourceType("DOCTOR")
                .visibilityStatus("DRAFT")
                .clinicalStatus(clinicalStatus)
                .uploadedAt(LocalDateTime.now())
                .build();
    }
}
