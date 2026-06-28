package com.HealthLink.scheduler;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.MedicineReminderSetting;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.entity.enums.PrescriptionTiming;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.dto.notification.NotificationDispatchSummary;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.service.medicine.MedicineReminderService;
import com.HealthLink.service.notification.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationSchedulerTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private ConsultationRepository consultationRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private MedicineReminderService medicineReminderService;

    @InjectMocks
    private NotificationScheduler notificationScheduler;

    @Test
    void sendAppointmentReminders_shouldUseProvidedNowWindow() {
        LocalDateTime now = LocalDateTime.of(2026, 5, 20, 14, 25);
        User patientUser = User.builder().id("patient-user-1").build();
        Appointment appointment = Appointment.builder()
                .appointmentId(44)
                .appointmentTime(LocalDateTime.of(2026, 5, 20, 15, 30))
                .doctor(Doctor.builder()
                        .doctorId("doctor-1")
                        .fullName("Doctor One")
                        .build())
                .patient(Patient.builder()
                        .patientId("patient-1")
                        .user(patientUser)
                        .build())
                .status("SCHEDULED")
                .build();

        when(appointmentRepository.findUpcomingAndReminderNotSent(
                now.plusHours(1),
                now.plusHours(1).plusMinutes(5)
        )).thenReturn(List.of(appointment));

        notificationScheduler.sendAppointmentReminders(now);

        verify(notificationService).sendWebSocketAndMobilePushNotification(
                eq(patientUser),
                eq(NotificationType.APPOINTMENT_REMINDER),
                eq("Upcoming Appointment Reminder"),
                contains("Doctor One"),
                eq(NotificationPriority.HIGH),
                eq(44),
                eq("/appointments/44")
        );
        verify(appointmentRepository).markReminderSent(44);
    }

    @Test
    void sendDoctorAppointmentReminders_shouldNotifyDoctorAndMarkAppointment() {
        LocalDateTime now = LocalDateTime.of(2026, 5, 20, 14, 55);
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
                .status("SCHEDULED")
                .build();

        when(appointmentRepository.findUpcomingDoctorReminderCandidates(
                now.plusMinutes(30),
                now.plusMinutes(35)
        ))
                .thenReturn(List.of(appointment));

        notificationScheduler.sendDoctorAppointmentReminders(now);

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

    @Test
    void sendFollowUpReminders_shouldUseProvidedNowDate() {
        LocalDateTime now = LocalDateTime.of(2026, 5, 24, 9, 0);
        User patientUser = User.builder().id("patient-user-1").build();
        Appointment appointment = Appointment.builder()
                .appointmentId(66)
                .patient(Patient.builder()
                        .patientId("patient-1")
                        .user(patientUser)
                        .build())
                .build();
        Consultation consultation = Consultation.builder()
                .consultationId(77)
                .appointment(appointment)
                .followUpNotes("Bring lab results")
                .build();

        when(consultationRepository.findFollowUpsDueForReminder(
                LocalDateTime.of(2026, 5, 24, 0, 0),
                LocalDateTime.of(2026, 5, 24, 23, 59, 59)
        )).thenReturn(List.of(consultation));

        notificationScheduler.sendFollowUpReminders(now);

        verify(notificationService).sendWebSocketAndMobilePushNotification(
                eq(patientUser),
                eq(NotificationType.APPOINTMENT_REMINDER),
                eq("Follow-Up Appointment Reminder"),
                contains("Bring lab results"),
                eq(NotificationPriority.NORMAL),
                eq(77),
                eq("/consultations/77")
        );
    }

    @Test
    void sendDailyAppointmentDigest_shouldUseProvidedDate() {
        LocalDate today = LocalDate.of(2026, 5, 24);
        User patientUser = User.builder().id("patient-user-1").build();
        Patient patient = Patient.builder()
                .patientId("patient-1")
                .user(patientUser)
                .build();
        Appointment morning = Appointment.builder()
                .appointmentId(88)
                .appointmentTime(LocalDateTime.of(2026, 5, 24, 9, 0))
                .patient(patient)
                .status("SCHEDULED")
                .build();
        Appointment afternoon = Appointment.builder()
                .appointmentId(89)
                .appointmentTime(LocalDateTime.of(2026, 5, 24, 14, 0))
                .patient(patient)
                .status("SCHEDULED")
                .build();

        when(appointmentRepository.findDailyAppointments(
                LocalDateTime.of(2026, 5, 24, 0, 0),
                LocalDateTime.of(2026, 5, 24, 23, 59, 59)
        )).thenReturn(List.of(morning, afternoon));

        notificationScheduler.sendDailyAppointmentDigest(today);

        verify(notificationService).sendWebSocketNotification(
                eq(patientUser),
                eq(NotificationType.APPOINTMENT_REMINDER),
                eq("Today's appointments"),
                contains("2 appointments"),
                isNull(),
                eq("/appointments")
        );
    }

    @Test
    void sendMedicineReminders_shouldDispatchEveryTimingThroughService() {
        LocalDateTime now = LocalDateTime.of(2026, 6, 25, 7, 30);
        MedicineReminderSetting setting = MedicineReminderSetting.builder()
                .patient(Patient.builder().patientId("patient-1").build())
                .morningTime(LocalTime.of(7, 30))
                .afternoonTime(LocalTime.of(12, 30))
                .eveningTime(LocalTime.of(19, 0))
                .enabled(true)
                .build();

        when(medicineReminderService.getEnabledSettingsForDispatch()).thenReturn(List.of(setting));
        when(medicineReminderService.dispatchReminderIfDue(setting, PrescriptionTiming.MORNING, now)).thenReturn(true);
        when(medicineReminderService.dispatchReminderIfDue(setting, PrescriptionTiming.AFTERNOON, now)).thenReturn(false);
        when(medicineReminderService.dispatchReminderIfDue(setting, PrescriptionTiming.EVENING, now)).thenReturn(false);

        NotificationDispatchSummary result = notificationScheduler.sendMedicineReminders(now);

        assertThat(result.getSentCount()).isEqualTo(1);
        assertThat(result.getSkippedCount()).isEqualTo(2);
        verify(medicineReminderService).dispatchReminderIfDue(setting, PrescriptionTiming.MORNING, now);
        verify(medicineReminderService).dispatchReminderIfDue(setting, PrescriptionTiming.AFTERNOON, now);
        verify(medicineReminderService).dispatchReminderIfDue(setting, PrescriptionTiming.EVENING, now);
    }

    @Test
    void sendMedicineReminders_shouldReturnEmptySummaryWhenNoSettingsExist() {
        LocalDateTime now = LocalDateTime.of(2026, 6, 25, 7, 30);
        when(medicineReminderService.getEnabledSettingsForDispatch()).thenReturn(List.of());

        NotificationDispatchSummary result = notificationScheduler.sendMedicineReminders(now);

        assertThat(result.getCandidateCount()).isEqualTo(0);
        assertThat(result.getSentCount()).isEqualTo(0);
        assertThat(result.getSkippedCount()).isEqualTo(0);
        assertThat(result.getFailedCount()).isEqualTo(0);
    }

    @Test
    void unclockDoctorAppointmentReminder_shouldMoveAppointmentToNowAndNotifyDoctor() {
        LocalDateTime now = LocalDateTime.of(2026, 6, 8, 10, 30);
        LocalDateTime originalTime = LocalDateTime.of(2026, 6, 8, 15, 0);
        LocalDateTime originalEnd = LocalDateTime.of(2026, 6, 8, 15, 30);
        User doctorUser = User.builder().id("doctor-user-1").build();
        Appointment appointment = Appointment.builder()
                .appointmentId(24)
                .appointmentTime(originalTime)
                .endTime(originalEnd)
                .status("SCHEDULED")
                .doctor(Doctor.builder()
                        .doctorId("doctor-1")
                        .user(doctorUser)
                        .build())
                .patient(Patient.builder()
                        .patientId("patient-1")
                        .fullName("Patient One")
                        .build())
                .build();

        when(appointmentRepository.findById(24)).thenReturn(Optional.of(appointment));

        NotificationDispatchSummary result =
                notificationScheduler.unclockDoctorAppointmentReminder(24, now);

        assertThat(result.getSentCount()).isEqualTo(1);
        assertThat(result.getSkippedCount()).isEqualTo(0);
        assertThat(result.getFailedCount()).isEqualTo(0);
        assertThat(appointment.getAppointmentTime()).isEqualTo(now);
        assertThat(appointment.getEndTime()).isEqualTo(now.plus(Duration.ofMinutes(30)));
        assertThat(appointment.getDoctorReminderSent()).isTrue();
        verify(appointmentRepository).save(appointment);
        verify(notificationService).sendWebSocketNotification(
                eq(doctorUser),
                eq(NotificationType.APPOINTMENT_REMINDER),
                eq("Appointment time arrived"),
                contains("Patient One"),
                eq(24),
                eq("/appointments/24")
        );
    }

    @Test
    void unclockDoctorAppointmentReminder_shouldRejectNonScheduledAppointment() {
        LocalDateTime now = LocalDateTime.of(2026, 6, 8, 10, 30);
        Appointment appointment = Appointment.builder()
                .appointmentId(24)
                .status("IN_CONSULTATION")
                .build();

        when(appointmentRepository.findById(24)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() -> notificationScheduler.unclockDoctorAppointmentReminder(24, now))
                .isInstanceOf(com.HealthLink.exception.BadRequestException.class)
                .hasMessageContaining("Only scheduled appointments");
    }

    @Test
    void unclockDoctorAppointmentReminder_shouldSkipWhenDoctorUserMissing() {
        LocalDateTime now = LocalDateTime.of(2026, 6, 8, 10, 30);
        Appointment appointment = Appointment.builder()
                .appointmentId(24)
                .appointmentTime(LocalDateTime.of(2026, 6, 8, 15, 0))
                .endTime(LocalDateTime.of(2026, 6, 8, 15, 30))
                .status("SCHEDULED")
                .doctor(Doctor.builder().doctorId("doctor-1").user(null).build())
                .patient(Patient.builder().patientId("patient-1").build())
                .build();

        when(appointmentRepository.findById(24)).thenReturn(Optional.of(appointment));

        NotificationDispatchSummary result =
                notificationScheduler.unclockDoctorAppointmentReminder(24, now);

        assertThat(result.getSentCount()).isEqualTo(0);
        assertThat(result.getSkippedCount()).isEqualTo(1);
        verify(appointmentRepository, never()).save(any());
        verify(notificationService, never()).sendWebSocketNotification(
                any(), any(), any(), any(), any(), any());
    }

    @Test
    void unclockDoctorAppointmentReminder_shouldFallbackToThirtyMinutesWhenEndTimeMissing() {
        LocalDateTime now = LocalDateTime.of(2026, 6, 8, 10, 30);
        User doctorUser = User.builder().id("doctor-user-1").build();
        Appointment appointment = Appointment.builder()
                .appointmentId(24)
                .appointmentTime(LocalDateTime.of(2026, 6, 8, 15, 0))
                .endTime(null)
                .status("SCHEDULED")
                .doctor(Doctor.builder()
                        .doctorId("doctor-1")
                        .user(doctorUser)
                        .build())
                .patient(Patient.builder()
                        .patientId("patient-1")
                        .fullName("Patient One")
                        .build())
                .build();

        when(appointmentRepository.findById(24)).thenReturn(Optional.of(appointment));

        notificationScheduler.unclockDoctorAppointmentReminder(24, now);

        assertThat(appointment.getEndTime()).isEqualTo(now.plus(Duration.ofMinutes(30)));
        verify(appointmentRepository).save(appointment);
    }
}
