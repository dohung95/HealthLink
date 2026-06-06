package com.HealthLink.scheduler;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.PrescriptionItem;
import com.HealthLink.entity.PrescriptionReminderLog;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.entity.enums.PrescriptionTiming;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.repository.prescription.PrescriptionReminderLogRepository;
import com.HealthLink.service.notification.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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
    private PrescriptionReminderLogRepository prescriptionReminderLogRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ObjectMapper objectMapper;

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

        verify(notificationService).sendMobilePushNotification(
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

        verify(notificationService).sendMobilePushNotification(
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
    void sendPrescriptionRemindersForTiming_shouldGroupItemsWithSameTimingIntoOneNotification() throws Exception {
        LocalDateTime now = LocalDateTime.of(2026, 5, 24, 8, 0);
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        User patientUser = User.builder().id("patient-user-1").build();
        PrescriptionHeader prescription = prescription(patientUser, List.of(
                prescriptionItem(1, "MORNING", "Amlodipine", 1, "tablet", "after food"),
                prescriptionItem(2, "morning", "Cetirizine", 2, "tablet", null),
                prescriptionItem(3, "MORNING,EVENING", "Vitamin D", 1, "capsule", "with milk")
        ));

        when(prescriptionHeaderRepository.findActiveReminderCandidates(now))
                .thenReturn(List.of(prescription));

        notificationScheduler.sendPrescriptionRemindersForTiming(PrescriptionTiming.MORNING, now);

        ArgumentCaptor<String> messageCaptor = ArgumentCaptor.forClass(String.class);
        verify(notificationService).sendWebSocketNotification(
                eq(patientUser),
                eq(NotificationType.NEW_PRESCRIPTION),
                eq("Morning medication reminder"),
                messageCaptor.capture(),
                eq(101),
                eq("/prescriptions/101"),
                eq("{}")
        );
        assertThat(messageCaptor.getValue()).contains("3 medication(s)", "Amlodipine", "Cetirizine", "Vitamin D");

        ArgumentCaptor<PrescriptionReminderLog> logCaptor = ArgumentCaptor.forClass(PrescriptionReminderLog.class);
        verify(prescriptionReminderLogRepository).save(logCaptor.capture());
        assertThat(logCaptor.getValue().getTiming()).isEqualTo("MORNING");
        assertThat(logCaptor.getValue().getReminderDate()).isEqualTo(LocalDate.of(2026, 5, 24));
    }

    @Test
    void sendPrescriptionRemindersForTiming_shouldIncludeMultiTimingItemInEachMatchingBucket() throws Exception {
        LocalDateTime morning = LocalDateTime.of(2026, 5, 24, 8, 0);
        LocalDateTime evening = LocalDateTime.of(2026, 5, 24, 18, 0);
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        User patientUser = User.builder().id("patient-user-1").build();
        PrescriptionHeader prescription = prescription(patientUser, List.of(
                prescriptionItem(1, "MORNING,EVENING", "Amlodipine", 1, "tablet", null)
        ));

        when(prescriptionHeaderRepository.findActiveReminderCandidates(morning))
                .thenReturn(List.of(prescription));
        when(prescriptionHeaderRepository.findActiveReminderCandidates(evening))
                .thenReturn(List.of(prescription));

        notificationScheduler.sendPrescriptionRemindersForTiming(PrescriptionTiming.MORNING, morning);
        notificationScheduler.sendPrescriptionRemindersForTiming(PrescriptionTiming.EVENING, evening);

        verify(notificationService).sendWebSocketNotification(
                eq(patientUser),
                eq(NotificationType.NEW_PRESCRIPTION),
                eq("Morning medication reminder"),
                contains("Amlodipine"),
                eq(101),
                eq("/prescriptions/101"),
                eq("{}")
        );
        verify(notificationService).sendWebSocketNotification(
                eq(patientUser),
                eq(NotificationType.NEW_PRESCRIPTION),
                eq("Evening medication reminder"),
                contains("Amlodipine"),
                eq(101),
                eq("/prescriptions/101"),
                eq("{}")
        );
        verify(prescriptionReminderLogRepository, times(2)).save(any(PrescriptionReminderLog.class));
    }

    @Test
    void sendPrescriptionRemindersForTiming_shouldSkipOnlyTimingAlreadySentToday() throws Exception {
        LocalDateTime morning = LocalDateTime.of(2026, 5, 24, 8, 0);
        LocalDateTime afternoon = LocalDateTime.of(2026, 5, 24, 12, 0);
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        User patientUser = User.builder().id("patient-user-1").build();
        PrescriptionHeader prescription = prescription(patientUser, List.of(
                prescriptionItem(1, "MORNING", "Amlodipine", 1, "tablet", null),
                prescriptionItem(2, "AFTERNOON", "Cetirizine", 1, "tablet", null)
        ));

        when(prescriptionHeaderRepository.findActiveReminderCandidates(morning))
                .thenReturn(List.of(prescription));
        when(prescriptionHeaderRepository.findActiveReminderCandidates(afternoon))
                .thenReturn(List.of(prescription));
        when(prescriptionReminderLogRepository.existsByPrescriptionHeader_PrescriptionHeaderIdAndTimingAndReminderDate(
                101,
                "MORNING",
                LocalDate.of(2026, 5, 24)
        )).thenReturn(true);

        notificationScheduler.sendPrescriptionRemindersForTiming(PrescriptionTiming.MORNING, morning);
        notificationScheduler.sendPrescriptionRemindersForTiming(PrescriptionTiming.AFTERNOON, afternoon);

        verify(notificationService, never()).sendWebSocketNotification(
                eq(patientUser),
                eq(NotificationType.NEW_PRESCRIPTION),
                eq("Morning medication reminder"),
                any(),
                any(),
                any(),
                any()
        );
        verify(notificationService).sendWebSocketNotification(
                eq(patientUser),
                eq(NotificationType.NEW_PRESCRIPTION),
                eq("Afternoon medication reminder"),
                contains("Cetirizine"),
                eq(101),
                eq("/prescriptions/101"),
                eq("{}")
        );
        verify(prescriptionReminderLogRepository).save(any(PrescriptionReminderLog.class));
    }

    private PrescriptionHeader prescription(User patientUser, List<PrescriptionItem> items) {
        return PrescriptionHeader.builder()
                .prescriptionHeaderId(101)
                .patient(Patient.builder()
                        .patientId("patient-1")
                        .user(patientUser)
                        .build())
                .validUntil(LocalDateTime.of(2026, 5, 31, 23, 59))
                .prescriptionItems(items)
                .build();
    }

    private PrescriptionItem prescriptionItem(
            Integer id,
            String timing,
            String medicationName,
            Integer quantity,
            String unit,
            String notes
    ) {
        return PrescriptionItem.builder()
                .prescriptionItemId(id)
                .timing(timing)
                .medicationName(medicationName)
                .quantity(quantity)
                .unit(unit)
                .notes(notes)
                .build();
    }
}
