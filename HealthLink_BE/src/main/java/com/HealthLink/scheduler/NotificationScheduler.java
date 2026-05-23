package com.HealthLink.scheduler;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@EnableScheduling
public class NotificationScheduler {

    private final AppointmentRepository appointmentRepository;
    private final ConsultationRepository consultationRepository;
    private final PrescriptionHeaderRepository prescriptionHeaderRepository;
    private final NotificationService notificationService;

    @Scheduled(cron = "0 0/5 * * * *")
    @Transactional
    public void sendAppointmentReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from = now.plusMinutes(30);
        LocalDateTime to = now.plusMinutes(35);

        List<Appointment> upcomingAppointments =
                appointmentRepository.findUpcomingAndReminderNotSent(from, to);

        if (upcomingAppointments.isEmpty()) {
            log.debug("Appointment reminder job: no upcoming appointments in window [{} - {}]", from, to);
            return;
        }

        log.info("Appointment reminder job: found {} appointments to remind", upcomingAppointments.size());

        for (Appointment appointment : upcomingAppointments) {
            try {
                User patientUser = appointment.getPatient().getUser();

                String title = "Upcoming Appointment Reminder";
                String message = String.format(
                        "You have an appointment with Dr. %s at %s. Please be ready.",
                        appointment.getDoctor().getFullName(),
                        appointment.getAppointmentTime().toLocalTime()
                );

                notificationService.sendMobilePushNotification(
                        patientUser,
                        NotificationType.APPOINTMENT_REMINDER,
                        title,
                        message,
                        NotificationPriority.HIGH,
                        appointment.getAppointmentId(),
                        "/appointments/" + appointment.getAppointmentId()
                );

                appointmentRepository.markReminderSent(appointment.getAppointmentId());

                log.info("Reminder sent for appointmentId={}, patientId={}",
                        appointment.getAppointmentId(), patientUser.getId());

            } catch (Exception ex) {
                log.error("Failed to send reminder for appointmentId={}: {}",
                        appointment.getAppointmentId(), ex.getMessage());
            }
        }
    }

    @Scheduled(cron = "0 0/5 * * * *")
    @Transactional
    public void sendDoctorAppointmentReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from = now.plusMinutes(30);
        LocalDateTime to = now.plusMinutes(35);

        List<Appointment> upcomingAppointments =
                appointmentRepository.findUpcomingDoctorReminderCandidates(from, to);

        if (upcomingAppointments.isEmpty()) {
            log.debug("Doctor appointment reminder job: no upcoming appointments in window [{} - {}]", from, to);
            return;
        }

        log.info("Doctor appointment reminder job: found {} appointments to remind", upcomingAppointments.size());

        for (Appointment appointment : upcomingAppointments) {
            try {
                User doctorUser = appointment.getDoctor() != null ? appointment.getDoctor().getUser() : null;
                if (doctorUser == null || doctorUser.getId() == null || doctorUser.getId().isBlank()) {
                    log.warn("Skipping doctor reminder for appointmentId={} because doctor user mapping is missing",
                            appointment.getAppointmentId());
                    continue;
                }

                String patientName = appointment.getPatient() != null
                        ? appointment.getPatient().getFullName()
                        : "your patient";
                String title = "Upcoming Appointment Reminder";
                String message = String.format(
                        "You have an appointment with %s at %s. Please be ready to start the consultation.",
                        patientName,
                        appointment.getAppointmentTime().toLocalTime()
                );

                notificationService.sendWebSocketNotification(
                        doctorUser,
                        NotificationType.APPOINTMENT_REMINDER,
                        title,
                        message,
                        appointment.getAppointmentId(),
                        "/appointments/" + appointment.getAppointmentId()
                );

                appointmentRepository.markDoctorReminderSent(appointment.getAppointmentId());

                log.info("Doctor reminder sent for appointmentId={}, doctorId={}",
                        appointment.getAppointmentId(), doctorUser.getId());
            } catch (Exception ex) {
                log.error("Failed to send doctor reminder for appointmentId={}: {}",
                        appointment.getAppointmentId(), ex.getMessage());
            }
        }
    }

    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void sendFollowUpReminders() {
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1).minusSeconds(1);

        List<Consultation> dueConsultations =
                consultationRepository.findFollowUpsDueForReminder(startOfDay, endOfDay);

        if (dueConsultations.isEmpty()) {
            log.debug("Follow-up reminder job: no follow-ups due today");
            return;
        }

        log.info("Follow-up reminder job: found {} follow-ups due today", dueConsultations.size());

        for (Consultation consultation : dueConsultations) {
            try {
                User patientUser = consultation.getAppointment().getPatient().getUser();

                String title = "Follow-Up Appointment Reminder";
                String message = String.format(
                        "Today is your scheduled follow-up date. Please book an appointment or contact your doctor. Notes: %s",
                        consultation.getFollowUpNotes() != null
                                ? consultation.getFollowUpNotes()
                                : "Please consult your doctor."
                );

                notificationService.sendMobilePushNotification(
                        patientUser,
                        NotificationType.APPOINTMENT_REMINDER,
                        title,
                        message,
                        NotificationPriority.NORMAL,
                        consultation.getConsultationId(),
                        "/consultations/" + consultation.getConsultationId()
                );

                log.info("Follow-up reminder sent for consultationId={}, patientId={}",
                        consultation.getConsultationId(), patientUser.getId());

            } catch (Exception ex) {
                log.error("Failed to send follow-up reminder for consultationId={}: {}",
                        consultation.getConsultationId(), ex.getMessage());
            }
        }
    }

    @Scheduled(cron = "0 5 8 * * *")
    @Transactional
    public void sendPrescriptionReminders() {
        LocalDateTime now = LocalDateTime.now().withNano(0);
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();

        List<PrescriptionHeader> candidates =
                prescriptionHeaderRepository.findReminderCandidates(now, startOfDay);

        if (candidates.isEmpty()) {
            log.debug("Prescription reminder job: no active unopened prescriptions to remind");
            return;
        }

        log.info("Prescription reminder job: found {} candidate prescriptions", candidates.size());

        for (PrescriptionHeader prescription : candidates) {
            LocalDateTime claimedAt = LocalDateTime.now().withNano(0);
            int claimed = prescriptionHeaderRepository.claimReminderForToday(
                    prescription.getPrescriptionHeaderId(),
                    claimedAt,
                    now,
                    startOfDay
            );

            if (claimed == 0) {
                log.debug("Prescription {} was already claimed or is no longer eligible",
                        prescription.getPrescriptionHeaderId());
                continue;
            }

            try {
                User patientUser = prescription.getPatient().getUser();
                String doctorName = prescription.getDoctor() != null
                        ? prescription.getDoctor().getFullName()
                        : "your doctor";

                String title = "Prescription Reminder";
                String message = String.format(
                        "You still have an active prescription from Dr. %s. Tap to review today's medications.",
                        doctorName
                );

                notificationService.sendMobilePushNotification(
                        patientUser,
                        NotificationType.NEW_PRESCRIPTION,
                        title,
                        message,
                        NotificationPriority.NORMAL,
                        prescription.getPrescriptionHeaderId(),
                        "/prescriptions/" + prescription.getPrescriptionHeaderId()
                );

                log.info("Prescription reminder sent for prescriptionHeaderId={}, patientId={}",
                        prescription.getPrescriptionHeaderId(), patientUser.getId());
            } catch (Exception ex) {
                prescriptionHeaderRepository.releaseReminderClaim(
                        prescription.getPrescriptionHeaderId(),
                        claimedAt
                );
                log.error("Failed to send prescription reminder for prescriptionHeaderId={}: {}",
                        prescription.getPrescriptionHeaderId(), ex.getMessage());
            }
        }
    }
}
