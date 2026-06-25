package com.HealthLink.service.impl.consultation;

import com.HealthLink.dto.response.ConfirmResponse;
import com.HealthLink.dto.response.ProposalResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.Role;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.HomeVisitProposalStatus;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.exception.UnauthorizedAccessException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.repository.notification.NotificationRepository;
import com.HealthLink.service.notification.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConsultationProposalServiceImplTest {

    @Mock
    private ConsultationRepository consultationRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private ConsultationProposalServiceImpl proposalService;

    @Test
    void propose_shouldSetPendingAndNotifyPatient() {
        TestFixture fixture = TestFixture.create();
        Consultation consultation = fixture.consultation();
        consultation.setHomeVisitProposalStatus(HomeVisitProposalStatus.NONE);

        when(consultationRepository.findById(consultation.getConsultationId())).thenReturn(Optional.of(consultation));
        when(consultationRepository.save(any(Consultation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findByEmail("doctor@example.com")).thenReturn(Optional.of(fixture.doctorUser));

        ProposalResponse response = proposalService.propose(consultation.getConsultationId(), fixture.doctorPrincipal);

        assertThat(response.getConsultationId()).isEqualTo(consultation.getConsultationId());
        assertThat(response.getDoctorId()).isEqualTo(fixture.doctor.getDoctorId());
        assertThat(response.getAppointmentId()).isEqualTo(fixture.appointment.getAppointmentId());
        assertThat(response.getStatus()).isEqualTo(HomeVisitProposalStatus.PENDING);
        assertThat(consultation.getHomeVisitProposalStatus()).isEqualTo(HomeVisitProposalStatus.PENDING);
        assertThat(consultation.getHomeVisitProposedAt()).isNotNull();
        assertThat(consultation.getHomeVisitRespondedAt()).isNull();

        verify(notificationService).sendWebSocketNotification(
                eq(fixture.patientUser),
                eq(NotificationType.HOME_VISIT_PROPOSED),
                eq("Home Visit Proposal"),
                eq("Your doctor has proposed a home visit follow-up."),
                eq(consultation.getConsultationId()),
                eq("/patient-dashboard/appointments"),
                contains("\"proposalStatus\":\"PENDING\"")
        );
    }

    @Test
    void propose_shouldBlockDuplicatePendingProposal() {
        TestFixture fixture = TestFixture.create();
        Consultation consultation = fixture.consultation();
        consultation.setHomeVisitProposalStatus(HomeVisitProposalStatus.PENDING);

        when(consultationRepository.findById(consultation.getConsultationId())).thenReturn(Optional.of(consultation));
        when(userRepository.findByEmail("doctor@example.com")).thenReturn(Optional.of(fixture.doctorUser));

        assertThatThrownBy(() -> proposalService.propose(consultation.getConsultationId(), fixture.doctorPrincipal))
                .isInstanceOf(BusinessException.class)
                .hasMessage("A home visit proposal is already pending for this consultation");

        verify(notificationService, never()).sendWebSocketNotification(
                any(User.class),
                any(NotificationType.class),
                any(String.class),
                any(String.class),
                any(Integer.class),
                any(String.class),
                any(String.class)
        );
    }

    @Test
    void propose_shouldBlockDuplicateAcceptedProposal() {
        TestFixture fixture = TestFixture.create();
        Consultation consultation = fixture.consultation();
        consultation.setHomeVisitProposalStatus(HomeVisitProposalStatus.ACCEPTED);

        when(consultationRepository.findById(consultation.getConsultationId())).thenReturn(Optional.of(consultation));
        when(userRepository.findByEmail("doctor@example.com")).thenReturn(Optional.of(fixture.doctorUser));

        assertThatThrownBy(() -> proposalService.propose(consultation.getConsultationId(), fixture.doctorPrincipal))
                .isInstanceOf(BusinessException.class)
                .hasMessage("This consultation already has an accepted home visit proposal");
    }

    @Test
    void propose_shouldRejectUnauthorizedDoctor() {
        TestFixture fixture = TestFixture.create();
        Consultation consultation = fixture.consultation();
        User strangerUser = user("doctor-user-2", "stranger@example.com", "Doctor");
        strangerUser.setDoctor(Doctor.builder().doctorId("doctor-2").user(strangerUser).build());
        UserDetails strangerPrincipal = org.springframework.security.core.userdetails.User
                .withUsername("stranger@example.com")
                .password("secret")
                .roles("DOCTOR")
                .build();

        when(consultationRepository.findById(consultation.getConsultationId())).thenReturn(Optional.of(consultation));
        when(userRepository.findByEmail("stranger@example.com")).thenReturn(Optional.of(strangerUser));

        assertThatThrownBy(() -> proposalService.propose(consultation.getConsultationId(), strangerPrincipal))
                .isInstanceOf(UnauthorizedAccessException.class)
                .hasMessage("Access denied: you do not own this consultation");
    }

    @Test
    void confirm_shouldRequireOwningPatientPendingStatusAndNotifyDoctor() {
        TestFixture fixture = TestFixture.create();
        Consultation consultation = fixture.consultation();
        consultation.setHomeVisitProposalStatus(HomeVisitProposalStatus.PENDING);

        when(consultationRepository.findById(consultation.getConsultationId())).thenReturn(Optional.of(consultation));
        when(consultationRepository.save(any(Consultation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findByEmail("patient@example.com")).thenReturn(Optional.of(fixture.patientUser));

        ConfirmResponse response = proposalService.confirm(consultation.getConsultationId(), fixture.patientPrincipal);

        assertThat(response.getConsultationId()).isEqualTo(consultation.getConsultationId());
        assertThat(response.getDoctorId()).isEqualTo(fixture.doctor.getDoctorId());
        assertThat(consultation.getHomeVisitProposalStatus()).isEqualTo(HomeVisitProposalStatus.ACCEPTED);
        assertThat(consultation.getHomeVisitRespondedAt()).isNotNull();

        verify(notificationRepository).markAsReadByUserIdAndTypeAndRelatedId(
                fixture.patientUser.getId(),
                NotificationType.HOME_VISIT_PROPOSED,
                consultation.getConsultationId()
        );
        verify(notificationService).sendWebSocketNotification(
                eq(fixture.doctorUser),
                eq(NotificationType.HOME_VISIT_CONFIRMED),
                eq("Home Visit Confirmed"),
                eq("Patient has accepted the home visit proposal. They will proceed with booking."),
                eq(consultation.getConsultationId()),
                eq("/doctor/appointments/" + fixture.appointment.getAppointmentId()),
                contains("\"patientName\":\"Patient One\"")
        );
    }

    @Test
    void confirm_shouldRejectUnauthorizedPatient() {
        TestFixture fixture = TestFixture.create();
        Consultation consultation = fixture.consultation();
        consultation.setHomeVisitProposalStatus(HomeVisitProposalStatus.PENDING);
        User strangerUser = user("patient-user-2", "stranger-patient@example.com", "Patient");
        strangerUser.setPatient(Patient.builder().patientId("patient-2").user(strangerUser).build());
        UserDetails strangerPrincipal = org.springframework.security.core.userdetails.User
                .withUsername("stranger-patient@example.com")
                .password("secret")
                .roles("PATIENT")
                .build();

        when(consultationRepository.findById(consultation.getConsultationId())).thenReturn(Optional.of(consultation));
        when(userRepository.findByEmail("stranger-patient@example.com")).thenReturn(Optional.of(strangerUser));

        assertThatThrownBy(() -> proposalService.confirm(consultation.getConsultationId(), strangerPrincipal))
                .isInstanceOf(UnauthorizedAccessException.class)
                .hasMessage("Access denied: you do not own this consultation");
    }

    @Test
    void reject_shouldRequirePendingStatusMarkProposalHandledAndNotifyDoctor() {
        TestFixture fixture = TestFixture.create();
        Consultation consultation = fixture.consultation();
        consultation.setHomeVisitProposalStatus(HomeVisitProposalStatus.PENDING);

        when(consultationRepository.findById(consultation.getConsultationId())).thenReturn(Optional.of(consultation));
        when(consultationRepository.save(any(Consultation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findByEmail("patient@example.com")).thenReturn(Optional.of(fixture.patientUser));

        proposalService.reject(consultation.getConsultationId(), fixture.patientPrincipal);

        assertThat(consultation.getHomeVisitProposalStatus()).isEqualTo(HomeVisitProposalStatus.REJECTED);
        assertThat(consultation.getHomeVisitRespondedAt()).isNotNull();

        verify(notificationRepository).markAsReadByUserIdAndTypeAndRelatedId(
                fixture.patientUser.getId(),
                NotificationType.HOME_VISIT_PROPOSED,
                consultation.getConsultationId()
        );
        verify(notificationService).sendWebSocketNotification(
                eq(fixture.doctorUser),
                eq(NotificationType.HOME_VISIT_REJECTED),
                eq("Home Visit Rejected"),
                eq("Patient has declined the home visit proposal."),
                eq(consultation.getConsultationId()),
                eq("/doctor/appointments/" + fixture.appointment.getAppointmentId()),
                contains("\"proposalStatus\":\"REJECTED\"")
        );
    }

    private static User user(String id, String email, String roleName) {
        return User.builder()
                .id(id)
                .email(email)
                .username(email)
                .password("secret")
                .phoneNumber("0123456789")
                .role(Role.builder().name(roleName).build())
                .build();
    }

    private record TestFixture(
            User doctorUser,
            User patientUser,
            Doctor doctor,
            Patient patient,
            Appointment appointment,
            Consultation consultation,
            UserDetails doctorPrincipal,
            UserDetails patientPrincipal
    ) {
        static TestFixture create() {
            User doctorUser = user("doctor-user-1", "doctor@example.com", "Doctor");
            User patientUser = user("patient-user-1", "patient@example.com", "Patient");

            Doctor doctor = Doctor.builder()
                    .doctorId("doctor-1")
                    .fullName("Doctor One")
                    .user(doctorUser)
                    .build();
            Patient patient = Patient.builder()
                    .patientId("patient-1")
                    .fullName("Patient One")
                    .user(patientUser)
                    .build();

            doctorUser.setDoctor(doctor);
            patientUser.setPatient(patient);

            Appointment appointment = Appointment.builder()
                    .appointmentId(101)
                    .doctor(doctor)
                    .patient(patient)
                    .consultationType("Online")
                    .build();

            Consultation consultation = Consultation.builder()
                    .consultationId(501)
                    .appointment(appointment)
                    .homeVisitProposalStatus(HomeVisitProposalStatus.NONE)
                    .build();
            appointment.setConsultation(consultation);

            UserDetails doctorPrincipal = org.springframework.security.core.userdetails.User
                    .withUsername("doctor@example.com")
                    .password("secret")
                    .roles("DOCTOR")
                    .build();
            UserDetails patientPrincipal = org.springframework.security.core.userdetails.User
                    .withUsername("patient@example.com")
                    .password("secret")
                    .roles("PATIENT")
                    .build();

            return new TestFixture(
                    doctorUser,
                    patientUser,
                    doctor,
                    patient,
                    appointment,
                    consultation,
                    doctorPrincipal,
                    patientPrincipal
            );
        }
    }
}
