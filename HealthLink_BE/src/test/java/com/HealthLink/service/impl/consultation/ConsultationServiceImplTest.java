package com.HealthLink.service.impl.consultation;

import com.HealthLink.dto.consultation.FollowUpRequest;
import com.HealthLink.dto.consultation.FollowUpResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Doctor;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.service.followup.FollowUpAppointmentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
    private FollowUpAppointmentService followUpAppointmentService;

    @InjectMocks
    private ConsultationServiceImpl consultationService;

    @Test
    void updateFollowUpByAppointment_shouldCreateConsultationWhenMissing() {
        LocalDateTime followUpDate = LocalDateTime.now().plusDays(2).withMinute(0).withSecond(0).withNano(0);
        Appointment appointment = appointment(10, "Scheduled");
        appointment.setSymptoms("Headache");
        FollowUpRequest request = new FollowUpRequest();
        request.setFollowUpDate(followUpDate);
        request.setFollowUpNotes("Return after labs");

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));
        when(consultationRepository.findByAppointment_AppointmentId(10)).thenReturn(Optional.empty());
        when(consultationRepository.save(any(Consultation.class))).thenAnswer(invocation -> {
            Consultation saved = invocation.getArgument(0);
            saved.setConsultationId(20);
            return saved;
        });

        FollowUpResponse response = consultationService.updateFollowUpByAppointment(10, request);

        assertThat(response.getConsultationId()).isEqualTo(20);
        assertThat(response.getAppointmentId()).isEqualTo(10);
        assertThat(response.getFollowUpDate()).isEqualTo(followUpDate);
        assertThat(response.getFollowUpNotes()).isEqualTo("Return after labs");
        assertThat(appointment.getConsultation()).isNotNull();

        ArgumentCaptor<Consultation> consultationCaptor = ArgumentCaptor.forClass(Consultation.class);
        verify(consultationRepository).save(consultationCaptor.capture());
        Consultation savedConsultation = consultationCaptor.getValue();
        assertThat(savedConsultation.getAppointment()).isEqualTo(appointment);
        assertThat(savedConsultation.getConsultationType()).isEqualTo("Video");
        assertThat(savedConsultation.getSymptoms()).isEqualTo("Headache");
        verify(followUpAppointmentService).validateFollowUpSlot(appointment, followUpDate);
    }

    @Test
    void updateFollowUpByAppointment_shouldUpdateExistingConsultation() {
        LocalDateTime followUpDate = LocalDateTime.now().plusDays(3).withMinute(0).withSecond(0).withNano(0);
        Appointment appointment = appointment(10, "Scheduled");
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

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));
        when(consultationRepository.save(any(Consultation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FollowUpResponse response = consultationService.updateFollowUpByAppointment(10, request);

        assertThat(response.getConsultationId()).isEqualTo(20);
        assertThat(response.getFollowUpDate()).isEqualTo(followUpDate);
        assertThat(response.getFollowUpNotes()).isEqualTo("Updated note");
        assertThat(consultation.getFollowUpDate()).isEqualTo(followUpDate);
        assertThat(consultation.getFollowUpNotes()).isEqualTo("Updated note");
        verify(followUpAppointmentService).validateFollowUpSlot(appointment, followUpDate);
    }

    @Test
    void updateFollowUpByAppointment_shouldClearPendingFollowUp() {
        Appointment appointment = appointment(10, "Scheduled");
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
        when(consultationRepository.save(any(Consultation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FollowUpResponse response = consultationService.updateFollowUpByAppointment(10, request);

        assertThat(response.getFollowUpDate()).isNull();
        assertThat(response.getFollowUpNotes()).isNull();
        assertThat(consultation.getFollowUpDate()).isNull();
        assertThat(consultation.getFollowUpNotes()).isNull();
        verify(followUpAppointmentService, never()).validateFollowUpSlot(any(), any());
    }

    @Test
    void updateFollowUpByAppointment_shouldCancelWithoutConsultation() {
        Appointment appointment = appointment(10, "Scheduled");
        FollowUpRequest request = new FollowUpRequest();
        request.setFollowUpDate(null);

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));
        when(consultationRepository.findByAppointment_AppointmentId(10)).thenReturn(Optional.empty());

        FollowUpResponse response = consultationService.updateFollowUpByAppointment(10, request);

        assertThat(response.getAppointmentId()).isEqualTo(10);
        assertThat(response.getConsultationId()).isNull();
        assertThat(response.getFollowUpDate()).isNull();
        verify(consultationRepository, never()).save(any(Consultation.class));
        verify(followUpAppointmentService, never()).validateFollowUpSlot(any(), any());
    }

    @Test
    void updateFollowUpByAppointment_shouldRejectCompletedAppointment() {
        Appointment appointment = appointment(10, "Completed");
        FollowUpRequest request = new FollowUpRequest();
        request.setFollowUpDate(LocalDateTime.now().plusDays(2).withMinute(0).withSecond(0).withNano(0));

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));
        when(consultationRepository.findByAppointment_AppointmentId(10)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> consultationService.updateFollowUpByAppointment(10, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Completed appointments cannot update follow-up");
        verify(consultationRepository, never()).save(any(Consultation.class));
    }

    @Test
    void updateFollowUpByAppointment_shouldRejectWhenFollowUpAppointmentAlreadyExists() {
        Appointment appointment = appointment(10, "Scheduled");
        Consultation consultation = Consultation.builder()
                .consultationId(20)
                .appointment(appointment)
                .followUpAppointmentId(99)
                .build();
        appointment.setConsultation(consultation);
        FollowUpRequest request = new FollowUpRequest();
        request.setFollowUpDate(null);

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() -> consultationService.updateFollowUpByAppointment(10, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Follow-up appointment has already been created");
        verify(consultationRepository, never()).save(any(Consultation.class));
    }

    @Test
    void updateFollowUp_shouldClearPendingFollowUpWhenDateIsNull() {
        Consultation consultation = Consultation.builder()
                .consultationId(20)
                .appointment(Appointment.builder().appointmentId(10).build())
                .followUpDate(LocalDateTime.now().plusDays(2))
                .followUpNotes("Bring lab results")
                .build();
        FollowUpRequest request = new FollowUpRequest();
        request.setFollowUpDate(null);
        request.setFollowUpNotes("ignored");

        when(consultationRepository.findById(20)).thenReturn(Optional.of(consultation));
        when(consultationRepository.save(any(Consultation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FollowUpResponse response = consultationService.updateFollowUp(20, request);

        assertThat(response.getFollowUpDate()).isNull();
        assertThat(response.getFollowUpNotes()).isNull();
        assertThat(consultation.getFollowUpDate()).isNull();
        assertThat(consultation.getFollowUpNotes()).isNull();
        verify(followUpAppointmentService, never()).validateFollowUpSlot(any(), any());
    }

    @Test
    void updateFollowUp_shouldRejectChangesAfterFollowUpAppointmentHasBeenCreated() {
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
                .hasMessage("Follow-up appointment has already been created");
        verify(consultationRepository, never()).save(any(Consultation.class));
    }

    private Appointment appointment(Integer appointmentId, String status) {
        return Appointment.builder()
                .appointmentId(appointmentId)
                .consultationType("Video")
                .status(status)
                .doctor(Doctor.builder().doctorId("doctor-1").build())
                .build();
    }
}
