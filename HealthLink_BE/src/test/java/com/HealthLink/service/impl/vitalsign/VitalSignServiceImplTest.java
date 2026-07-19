package com.HealthLink.service.impl.vitalsign;

import com.HealthLink.dto.response.VitalSignResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.VitalSign;
import com.HealthLink.dto.request.VitalSignRequest;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.exception.UnauthorizedAccessException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.repository.vitalsign.VitalSignRepository;
import com.HealthLink.utility.DoctorSecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.inOrder;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class VitalSignServiceImplTest {

    @Mock
    private VitalSignRepository vitalSignRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private DoctorSecurityUtils doctorSecurityUtils;

    @InjectMocks
    private VitalSignServiceImpl service;

    @Test
    void patientCanReadOwnAppointmentVitals() {
        Appointment appointment = appointment("patient-a", "doctor-a");
        when(appointmentRepository.findById(101)).thenReturn(Optional.of(appointment));
        when(vitalSignRepository.findByAppointment_AppointmentIdOrderByMeasuredAtDesc(101))
                .thenReturn(List.of(vitalSign(appointment)));

        List<VitalSignResponse> responses = service.getByAppointment(101);

        assertThat(responses).hasSize(1);
        assertThat(responses.getFirst().getPatientId()).isEqualTo("patient-a");
        verify(doctorSecurityUtils).requireAppointmentAccess(appointment);
    }

    @Test
    void patientCannotReadOtherPatientVitals() {
        Appointment appointment = appointment("patient-b", "doctor-a");
        when(appointmentRepository.findById(102)).thenReturn(Optional.of(appointment));
        doThrow(new UnauthorizedAccessException("Access denied"))
                .when(doctorSecurityUtils).requireAppointmentAccess(appointment);
        assertThatThrownBy(() -> service.getByAppointment(102))
                .isInstanceOf(UnauthorizedAccessException.class);
    }

    @Test
    void assignedDoctorCanReadAppointmentVitals() {
        Appointment appointment = appointment("patient-a", "doctor-a");
        when(appointmentRepository.findById(103)).thenReturn(Optional.of(appointment));
        when(vitalSignRepository.findByAppointment_AppointmentIdOrderByMeasuredAtDesc(103))
                .thenReturn(List.of(vitalSign(appointment)));

        List<VitalSignResponse> responses = service.getByAppointment(103);

        assertThat(responses).hasSize(1);
        verify(doctorSecurityUtils).requireAppointmentAccess(appointment);
    }

    @Test
    void unassignedDoctorCannotReadAppointmentVitals() {
        Appointment appointment = appointment("patient-a", "doctor-a");
        when(appointmentRepository.findById(104)).thenReturn(Optional.of(appointment));
        doThrow(new UnauthorizedAccessException("Access denied"))
                .when(doctorSecurityUtils).requireAppointmentAccess(appointment);
        assertThatThrownBy(() -> service.getByAppointment(104))
                .isInstanceOf(UnauthorizedAccessException.class);
    }

    @Test
    void anonymousActorIsRejected() {
        Appointment appointment = appointment("patient-a", "doctor-a");
        when(appointmentRepository.findById(105)).thenReturn(Optional.of(appointment));
        doThrow(new UnauthorizedAccessException("Authentication required"))
                .when(doctorSecurityUtils).requireAppointmentAccess(appointment);
        assertThatThrownBy(() -> service.getByAppointment(105))
                .isInstanceOf(UnauthorizedAccessException.class);
    }

    @Test
    void patientCannotReadOtherPatientVitalsByPatientId() {
        doThrow(new UnauthorizedAccessException("Access denied"))
                .when(doctorSecurityUtils).requirePatientAccess("patient-b");

        assertThatThrownBy(() -> service.getByPatient("patient-b"))
                .isInstanceOf(UnauthorizedAccessException.class);
        verifyNoInteractions(patientRepository, vitalSignRepository);
    }

    @Test
    void writeWithoutAppointmentIsRejectedBeforeClinicalRepositoriesAreRead() {
        VitalSignRequest request = vitalSignRequest("patient-a", null);

        assertThatThrownBy(() -> service.createVitalSign(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Appointment ID is required");
        verifyNoInteractions(patientRepository, appointmentRepository, vitalSignRepository, doctorSecurityUtils);
    }

    @Test
    void writeWithAppointmentAuthorizesBeforeCreatingVitalSign() {
        Appointment appointment = appointment("patient-a", "doctor-a");
        VitalSignRequest request = vitalSignRequest("patient-a", 201);
        when(appointmentRepository.findById(201)).thenReturn(Optional.of(appointment));
        when(patientRepository.findById("patient-a")).thenReturn(Optional.of(appointment.getPatient()));
        when(vitalSignRepository.save(any(VitalSign.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.createVitalSign(request);

        var ordered = inOrder(appointmentRepository, doctorSecurityUtils, patientRepository, vitalSignRepository);
        ordered.verify(appointmentRepository).findById(201);
        ordered.verify(doctorSecurityUtils).requireAppointmentAccess(appointment);
        ordered.verify(patientRepository).findById("patient-a");
        ordered.verify(vitalSignRepository).save(any(VitalSign.class));
    }

    private Appointment appointment(String patientId, String doctorId) {
        Patient patient = Patient.builder().patientId(patientId).build();
        Doctor doctor = Doctor.builder().doctorId(doctorId).build();
        return Appointment.builder()
                .appointmentId(101)
                .appointmentTime(LocalDateTime.of(2026, 7, 19, 9, 0))
                .consultationType("ONLINE")
                .patient(patient)
                .doctor(doctor)
                .build();
    }

    private VitalSign vitalSign(Appointment appointment) {
        return VitalSign.builder()
                .vitalSignId(1)
                .patient(appointment.getPatient())
                .appointment(appointment)
                .heartRate(72)
                .measuredAt(LocalDateTime.of(2026, 7, 19, 9, 0))
                .createdAt(LocalDateTime.of(2026, 7, 19, 9, 0))
                .build();
    }

    private VitalSignRequest vitalSignRequest(String patientId, Integer appointmentId) {
        VitalSignRequest request = new VitalSignRequest();
        request.setPatientId(patientId);
        request.setAppointmentId(appointmentId);
        request.setHeartRate(72);
        return request;
    }
}
