package com.HealthLink.service.impl.appointment;

import com.HealthLink.dto.response.AppointmentResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Patient;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.appointment.AppointmentSlotHoldRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.service.notification.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppointmentServiceImplTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private DoctorRepository doctorRepository;

    @Mock
    private DoctorScheduleRepository scheduleRepository;

    @Mock
    private AppointmentSlotHoldRepository appointmentSlotHoldRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private AppointmentServiceImpl appointmentService;

    @Test
    void getDoctorAppointments_shouldReturnMappedAppointmentsInRepositoryOrder() {
        Doctor doctor = Doctor.builder()
                .doctorId("doctor-1")
                .fullName("Doctor One")
                .specialty("Cardiology")
                .build();

        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(appointmentRepository.findByDoctor_DoctorIdOrderByAppointmentTimeDesc("doctor-1"))
                .thenReturn(List.of(
                        appointment(2, LocalDateTime.of(2026, 5, 20, 10, 0), doctor),
                        appointment(1, LocalDateTime.of(2026, 5, 19, 9, 0), doctor)
                ));

        List<AppointmentResponse> responses = appointmentService.getDoctorAppointments("doctor-1");

        assertThat(responses).hasSize(2);
        assertThat(responses.getFirst().getAppointmentId()).isEqualTo(2);
        assertThat(responses.getFirst().getDoctorName()).isEqualTo("Doctor One");
        assertThat(responses.getFirst().getSpecialtyName()).isEqualTo("Cardiology");
    }

    @Test
    void getDoctorDailyAppointments_shouldFilterByDayStatusAndReturnCountsInTimeOrder() {
        Doctor doctor = Doctor.builder()
                .doctorId("doctor-1")
                .fullName("Doctor One")
                .specialty("Cardiology")
                .build();
        LocalDateTime day = LocalDateTime.of(2026, 5, 24, 0, 0);

        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(appointmentRepository.findDoctorDailyAppointments(
                "doctor-1",
                day.toLocalDate().atStartOfDay(),
                day.toLocalDate().plusDays(1).atStartOfDay()
        )).thenReturn(List.of(
                appointment(1, day.withHour(9), doctor),
                appointment(2, day.withHour(10), doctor, "COMPLETED"),
                appointment(3, day.withHour(11), doctor, "CANCELLED")
        ));

        var response = appointmentService.getDoctorDailyAppointments("doctor-1", day.toLocalDate(), "SCHEDULED");

        assertThat(response.getAppointments()).hasSize(1);
        assertThat(response.getAppointments().getFirst().getAppointmentId()).isEqualTo(1);
        assertThat(response.getCounts().getAll()).isEqualTo(3);
        assertThat(response.getCounts().getScheduled()).isEqualTo(1);
        assertThat(response.getCounts().getCompleted()).isEqualTo(1);
        assertThat(response.getCounts().getCancelled()).isEqualTo(1);
    }

    private Appointment appointment(Integer id, LocalDateTime time, Doctor doctor) {
        return appointment(id, time, doctor, "SCHEDULED");
    }

    private Appointment appointment(Integer id, LocalDateTime time, Doctor doctor, String status) {
        return Appointment.builder()
                .appointmentId(id)
                .appointmentTime(time)
                .consultationType("Video")
                .status(status)
                .fee(new BigDecimal("100.00"))
                .patient(Patient.builder()
                        .patientId("patient-" + id)
                        .fullName("Patient " + id)
                        .build())
                .doctor(doctor)
                .build();
    }
}
