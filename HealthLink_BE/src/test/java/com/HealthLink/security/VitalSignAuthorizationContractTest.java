package com.HealthLink.security;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.Role;
import com.HealthLink.entity.User;
import com.HealthLink.exception.UnauthorizedAccessException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.utility.DoctorSecurityUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VitalSignAuthorizationContractTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private DoctorRepository doctorRepository;

    @InjectMocks
    private DoctorSecurityUtils doctorSecurityUtils;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void assignedDoctorCanReadAppointmentVitals() {
        User doctorUser = user("doctor-user", "doctor@example.test", "Doctor");
        Doctor doctor = Doctor.builder().doctorId("doctor-user").user(doctorUser).build();
        authenticate(doctorUser);
        when(userRepository.findByEmail(doctorUser.getEmail())).thenReturn(Optional.of(doctorUser));
        when(doctorRepository.findByUser_Id(doctorUser.getId())).thenReturn(Optional.of(doctor));

        assertThatCode(() -> doctorSecurityUtils.requireAssignedDoctor(appointment("patient-a", doctor)))
                .doesNotThrowAnyException();
    }

    @Test
    void unassignedDoctorCannotReadAppointmentVitals() {
        User doctorUser = user("doctor-a", "doctor-a@example.test", "Doctor");
        authenticate(doctorUser);
        when(userRepository.findByEmail(doctorUser.getEmail())).thenReturn(Optional.of(doctorUser));
        when(doctorRepository.findByUser_Id(doctorUser.getId()))
                .thenReturn(Optional.of(Doctor.builder().doctorId("doctor-a").user(doctorUser).build()));

        assertThatThrownBy(() -> doctorSecurityUtils.requireAssignedDoctor(
                appointment("patient-a", Doctor.builder().doctorId("doctor-b").build())))
                .isInstanceOf(UnauthorizedAccessException.class);
    }

    @Test
    void patientCanReadOwnAppointmentVitals() {
        User patientUser = user("user-a", "patient-a@example.test", "Patient");
        Patient patient = Patient.builder().patientId("patient-a").user(patientUser).build();
        patientUser.setPatient(patient);
        authenticate(patientUser);
        when(userRepository.findByEmail(patientUser.getEmail())).thenReturn(Optional.of(patientUser));

        assertThatCode(() -> doctorSecurityUtils.requireAppointmentAccess(
                appointment(patient, Doctor.builder().doctorId("doctor-a").build())))
                .doesNotThrowAnyException();
    }

    @Test
    void patientCannotReadOtherPatientVitals() {
        User patientUser = user("patient-a", "patient-a@example.test", "Patient");
        authenticate(patientUser);
        when(userRepository.findByEmail(patientUser.getEmail())).thenReturn(Optional.of(patientUser));

        assertThatThrownBy(() -> doctorSecurityUtils.requireAppointmentAccess(
                appointment("patient-b", Doctor.builder().doctorId("doctor-a").build())))
                .isInstanceOf(UnauthorizedAccessException.class);
    }

    @Test
    void patientCannotReadOtherPatientVitalsByPatientId() {
        User patientUser = user("user-a", "patient-a@example.test", "Patient");
        patientUser.setPatient(Patient.builder().patientId("patient-a").user(patientUser).build());
        authenticate(patientUser);
        when(userRepository.findByEmail(patientUser.getEmail())).thenReturn(Optional.of(patientUser));

        assertThatThrownBy(() -> doctorSecurityUtils.requirePatientAccess("patient-b"))
                .isInstanceOf(UnauthorizedAccessException.class);
    }

    @Test
    void anonymousActorIsRejected() {
        assertThatThrownBy(() -> doctorSecurityUtils.requireAppointmentAccess(
                appointment("patient-a", Doctor.builder().doctorId("doctor-a").build())))
                .isInstanceOf(UnauthorizedAccessException.class)
                .hasMessage("Authentication required");
    }

    private void authenticate(User user) {
        UserDetails principal = org.springframework.security.core.userdetails.User.withUsername(user.getEmail())
                .password("unused")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().getName().toUpperCase())))
                .build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                principal, "unused", principal.getAuthorities()));
    }

    private Appointment appointment(String patientId, Doctor doctor) {
        return appointment(Patient.builder().patientId(patientId).build(), doctor);
    }

    private Appointment appointment(Patient patient, Doctor doctor) {
        return Appointment.builder()
                .appointmentId(101)
                .appointmentTime(LocalDateTime.of(2026, 7, 19, 9, 0))
                .consultationType("ONLINE")
                .patient(patient)
                .doctor(doctor)
                .build();
    }

    private User user(String id, String email, String roleName) {
        return User.builder()
                .id(id)
                .email(email)
                .role(Role.builder().name(roleName).build())
                .build();
    }
}
