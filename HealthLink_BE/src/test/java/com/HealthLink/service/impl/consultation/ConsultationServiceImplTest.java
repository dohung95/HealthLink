package com.HealthLink.service.impl.consultation;

import com.HealthLink.dto.consultation.ConsultationNotesRequest;
import com.HealthLink.dto.consultation.FollowUpRequest;
import com.HealthLink.dto.consultation.FollowUpResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Invoice;
import com.HealthLink.entity.Patient;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.chat.ChatRoomRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.repository.payment.InvoiceRepository;
import com.HealthLink.service.followup.FollowUpAppointmentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConsultationServiceImplTest {

    @Mock
    private ConsultationRepository consultationRepository;

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private FollowUpAppointmentService followUpAppointmentService;

    @Mock
    private ChatRoomRepository chatRoomRepository;

    @Mock
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private ConsultationServiceImpl consultationService;

    @Test
    void startByAppointment_shouldCreateConsultationWhenAppointmentTimeArrived() {
        Appointment appointment = appointment(10, "SCHEDULED");
        appointment.setAppointmentTime(LocalDateTime.now().minusMinutes(5));

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));
        when(invoiceRepository.findByAppointment_AppointmentId(10)).thenReturn(Optional.of(paidInvoice(appointment)));
        when(consultationRepository.findByAppointment_AppointmentId(10)).thenReturn(Optional.empty());
        when(consultationRepository.save(any(Consultation.class))).thenAnswer(invocation -> {
            Consultation saved = invocation.getArgument(0);
            saved.setConsultationId(20);
            return saved;
        });

        var response = consultationService.startByAppointment(10);

        assertThat(response.getConsultationId()).isEqualTo(20);
        assertThat(response.getAppointmentId()).isEqualTo(10);
        assertThat(response.getStartTime()).isNotNull();
        assertThat(appointment.getConsultation()).isNotNull();
    }

    @Test
    void startByAppointment_shouldRejectBeforeAppointmentTime() {
        Appointment appointment = appointment(10, "SCHEDULED");
        appointment.setAppointmentTime(LocalDateTime.now().plusMinutes(5));

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() -> consultationService.startByAppointment(10))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Consultation can only be started when the appointment time has arrived");
        verify(consultationRepository, never()).save(any(Consultation.class));
    }

    @Test
    void startByAppointmentForTesting_shouldBypassAppointmentTimeOnly() {
        Appointment appointment = appointment(10, "SCHEDULED");
        appointment.setAppointmentTime(LocalDateTime.now().plusMinutes(30));

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));
        when(invoiceRepository.findByAppointment_AppointmentId(10)).thenReturn(Optional.of(paidInvoice(appointment)));
        when(consultationRepository.findByAppointment_AppointmentId(10)).thenReturn(Optional.empty());
        when(consultationRepository.save(any(Consultation.class))).thenAnswer(invocation -> {
            Consultation saved = invocation.getArgument(0);
            saved.setConsultationId(20);
            return saved;
        });

        var response = consultationService.startByAppointmentForTesting(10);

        assertThat(response.getConsultationId()).isEqualTo(20);
        assertThat(response.getStartTime()).isNotNull();
        assertThat(appointment.getStatus()).isEqualTo("IN_CONSULTATION");
    }

    @Test
    void startByAppointmentForTesting_shouldRejectUnpaidAppointment() {
        Appointment appointment = appointment(10, "SCHEDULED");
        appointment.setAppointmentTime(LocalDateTime.now().plusMinutes(30));

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));
        when(invoiceRepository.findByAppointment_AppointmentId(10)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> consultationService.startByAppointmentForTesting(10))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Appointment must be paid before consultation can be started");
        verify(consultationRepository, never()).save(any(Consultation.class));
    }

    @Test
    void startByAppointmentForTesting_shouldRejectCancelledAppointment() {
        Appointment appointment = appointment(10, "CANCELLED");

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() -> consultationService.startByAppointmentForTesting(10))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Only scheduled appointments can be started");
        verify(consultationRepository, never()).save(any(Consultation.class));
    }

    @Test
    void startByAppointmentForTesting_shouldRejectCompletedAppointment() {
        Appointment appointment = appointment(10, "COMPLETED");

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() -> consultationService.startByAppointmentForTesting(10))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Only scheduled appointments can be started");
        verify(consultationRepository, never()).save(any(Consultation.class));
    }

    @Test
    void startByAppointment_shouldReturnExistingStartedConsultation() {
        Appointment appointment = appointment(10, "SCHEDULED");
        appointment.setAppointmentTime(LocalDateTime.now().minusMinutes(5));
        Consultation consultation = Consultation.builder()
                .consultationId(20)
                .appointment(appointment)
                .startTime(LocalDateTime.now().minusMinutes(3))
                .build();
        appointment.setConsultation(consultation);

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));
        when(invoiceRepository.findByAppointment_AppointmentId(10)).thenReturn(Optional.of(paidInvoice(appointment)));
        when(consultationRepository.save(any(Consultation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = consultationService.startByAppointment(10);

        assertThat(response.getConsultationId()).isEqualTo(20);
        assertThat(response.getStartTime()).isEqualTo(consultation.getStartTime());
    }

    @Test
    void updateNotesByAppointment_shouldRejectBeforeStart() {
        Appointment appointment = appointment(10, "SCHEDULED");
        ConsultationNotesRequest request = new ConsultationNotesRequest();

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));
        when(consultationRepository.findByAppointment_AppointmentId(10)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> consultationService.updateNotesByAppointment(10, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Consultation must be started before notes can be updated");
    }

    @Test
    void updateNotesByAppointment_shouldSaveStartedConsultationNotes() {
        Appointment appointment = appointment(10, "SCHEDULED");
        Consultation consultation = Consultation.builder()
                .consultationId(20)
                .appointment(appointment)
                .startTime(LocalDateTime.now().minusMinutes(10))
                .build();
        appointment.setConsultation(consultation);
        ConsultationNotesRequest request = new ConsultationNotesRequest();
        request.setDiagnosis("Flu");
        request.setDoctorNotes("Rest and hydration");
        request.setTreatmentPlan("Follow up if fever persists");

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));
        when(consultationRepository.save(any(Consultation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = consultationService.updateNotesByAppointment(10, request);

        assertThat(response.getDiagnosis()).isEqualTo("Flu");
        assertThat(response.getDoctorNotes()).isEqualTo("Rest and hydration");
        assertThat(response.getTreatmentPlan()).isEqualTo("Follow up if fever persists");
    }

    @Test
    void updateFollowUpByAppointment_shouldCreateConsultationWhenMissing() {
        LocalDateTime followUpDate = LocalDateTime.now().plusDays(2);
        Appointment appointment = appointment(10, "SCHEDULED");
        appointment.setSymptoms("Headache");
        FollowUpRequest request = new FollowUpRequest();
        request.setFollowUpDate(followUpDate);
        request.setFollowUpNotes("Return after labs");
        request.setConsultationType("Video");

        FollowUpResponse expected = FollowUpResponse.builder()
                .consultationId(20)
                .appointmentId(10)
                .followUpDate(followUpDate)
                .followUpNotes("Return after labs")
                .build();

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));
        when(followUpAppointmentService.scheduleFollowUpAppointment(appointment, request))
                .thenReturn(expected);

        FollowUpResponse response = consultationService.updateFollowUpByAppointment(10, request);

        assertThat(response.getConsultationId()).isEqualTo(20);
        assertThat(response.getAppointmentId()).isEqualTo(10);
        assertThat(response.getFollowUpDate()).isEqualTo(followUpDate);
        assertThat(response.getFollowUpNotes()).isEqualTo("Return after labs");
        verify(followUpAppointmentService).scheduleFollowUpAppointment(appointment, request);
    }

    @Test
    void updateFollowUpByAppointment_shouldUpdateExistingConsultation() {
        LocalDateTime followUpDate = LocalDateTime.now().plusDays(3);
        Appointment appointment = appointment(10, "SCHEDULED");
        Consultation consultation = Consultation.builder()
                .consultationId(20)
                .appointment(appointment)
                .followUpDate(LocalDateTime.now().plusDays(2))
                .followUpNotes("Old note")
                .build();
        appointment.setConsultation(consultation);
        FollowUpRequest request = new FollowUpRequest();
        request.setFollowUpDate(followUpDate);
        request.setFollowUpNotes("Updated note");

        FollowUpResponse expected = FollowUpResponse.builder()
                .consultationId(20)
                .followUpDate(followUpDate)
                .followUpNotes("Updated note")
                .build();

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));
        when(followUpAppointmentService.scheduleFollowUpAppointment(appointment, request))
                .thenReturn(expected);

        FollowUpResponse response = consultationService.updateFollowUpByAppointment(10, request);

        assertThat(response.getFollowUpDate()).isEqualTo(followUpDate);
        assertThat(response.getFollowUpNotes()).isEqualTo("Updated note");
        verify(followUpAppointmentService).scheduleFollowUpAppointment(appointment, request);
    }

    @Test
    void updateFollowUpByAppointment_shouldClearPendingFollowUp() {
        Appointment appointment = appointment(10, "SCHEDULED");
        Consultation consultation = Consultation.builder()
                .consultationId(20)
                .appointment(appointment)
                .followUpDate(LocalDateTime.now().plusDays(2))
                .followUpNotes("Bring labs")
                .build();
        appointment.setConsultation(consultation);
        FollowUpRequest request = new FollowUpRequest();
        request.setFollowUpDate(null);

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));

        FollowUpResponse response = consultationService.updateFollowUpByAppointment(10, request);

        assertThat(response.getAppointmentId()).isEqualTo(10);
        verify(followUpAppointmentService).cancelPendingFollowUp(appointment);
    }

    @Test
    void updateFollowUpByAppointment_shouldCancelWithoutConsultation() {
        Appointment appointment = appointment(10, "SCHEDULED");
        FollowUpRequest request = new FollowUpRequest();
        request.setFollowUpDate(null);

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));

        FollowUpResponse response = consultationService.updateFollowUpByAppointment(10, request);

        assertThat(response.getAppointmentId()).isEqualTo(10);
        verify(followUpAppointmentService).cancelPendingFollowUp(appointment);
    }

    @Test
    void updateFollowUpByAppointment_shouldRejectCompletedAppointment() {
        Appointment appointment = appointment(10, "COMPLETED");
        FollowUpRequest request = new FollowUpRequest();
        request.setFollowUpDate(LocalDateTime.now().plusDays(2));

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));
        when(consultationRepository.findByAppointment_AppointmentId(10)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> consultationService.updateFollowUpByAppointment(10, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Completed appointments cannot update follow-up");
        verify(followUpAppointmentService, never()).scheduleFollowUpAppointment(any(), any());
    }

    @Test
    void updateFollowUpByAppointment_shouldCancelWhenFollowUpAppointmentAlreadyExists() {
        Appointment appointment = appointment(10, "SCHEDULED");
        Consultation consultation = Consultation.builder()
                .consultationId(20)
                .appointment(appointment)
                .followUpAppointmentId(99)
                .build();
        appointment.setConsultation(consultation);
        FollowUpRequest request = new FollowUpRequest();
        request.setFollowUpDate(null);

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));

        FollowUpResponse response = consultationService.updateFollowUpByAppointment(10, request);

        assertThat(response.getAppointmentId()).isEqualTo(10);
        verify(followUpAppointmentService).cancelPendingFollowUp(appointment);
    }

    @Test
    void updateFollowUp_shouldClearPendingFollowUpWhenDateIsNull() {
        Appointment appointment = Appointment.builder().appointmentId(10).build();
        Consultation consultation = Consultation.builder()
                .consultationId(20)
                .appointment(appointment)
                .followUpDate(LocalDateTime.now().plusDays(2))
                .followUpNotes("Bring lab results")
                .build();
        FollowUpRequest request = new FollowUpRequest();
        request.setFollowUpDate(null);

        when(consultationRepository.findById(20)).thenReturn(Optional.of(consultation));

        FollowUpResponse response = consultationService.updateFollowUp(20, request);

        assertThat(response).isNotNull();
        verify(followUpAppointmentService).cancelPendingFollowUp(appointment);
    }

    @Test
    void updateFollowUp_shouldRejectWhenAppointmentIsMissing() {
        Consultation consultation = Consultation.builder()
                .consultationId(20)
                .followUpAppointmentId(99)
                .followUpDate(LocalDateTime.now().plusDays(2))
                .build();
        FollowUpRequest request = new FollowUpRequest();
        request.setFollowUpDate(null);

        when(consultationRepository.findById(20)).thenReturn(Optional.of(consultation));

        assertThatThrownBy(() -> consultationService.updateFollowUp(20, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Consultation has no associated appointment");
        verify(followUpAppointmentService, never()).cancelPendingFollowUp(any());
    }

    private Appointment appointment(Integer appointmentId, String status) {
        return Appointment.builder()
                .appointmentId(appointmentId)
                .appointmentTime(LocalDateTime.now().plusDays(1))
                .consultationType("Video")
                .status(status)
                .doctor(Doctor.builder().doctorId("doctor-1").build())
                .patient(Patient.builder().patientId("patient-1").build())
                .build();
    }

    private Invoice paidInvoice(Appointment appointment) {
        return Invoice.builder()
                .appointment(appointment)
                .status("PAID")
                .build();
    }
}
