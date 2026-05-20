package com.HealthLink.scheduler;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.notification.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationSchedulerTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private ConsultationRepository consultationRepository;

    @Mock
    private PrescriptionHeaderRepository prescriptionHeaderRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private NotificationScheduler notificationScheduler;

    @Test
    void sendDoctorAppointmentReminders_shouldNotifyDoctorAndMarkAppointment() {
        User doctorUser = User.builder().id("doctor-user-1").build();
        Appointment appointment = Appointment.builder()
                .appointmentId(55)
                .appointmentTime(LocalDateTime.of(2026, 5, 20, 15, 30))
                .doctor(Doctor.builder()
                        .doctorId("doctor-1")
                        .user(doctorUser)
                        .build())
                .patient(Patient.builder()
                        .patientId("patient-1")
                        .fullName("Patient One")
                        .build())
                .status("Scheduled")
                .build();

        when(appointmentRepository.findUpcomingDoctorReminderCandidates(any(), any()))
                .thenReturn(List.of(appointment));

        notificationScheduler.sendDoctorAppointmentReminders();

        verify(notificationService).sendWebSocketNotification(
                eq(doctorUser),
                eq(NotificationType.APPOINTMENT_REMINDER),
                eq("Upcoming Appointment Reminder"),
                contains("Patient One"),
                eq(55),
                eq("/appointments/55")
        );
        verify(appointmentRepository).markDoctorReminderSent(55);
    }
}
