package com.HealthLink.scheduler;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduler: NotificationScheduler
 *
 * Thực hiện các tác vụ định kỳ liên quan đến thông báo:
 *  1. Nhắc nhở lịch hẹn sắp diễn ra (chạy mỗi 5 phút, cảnh báo trước 30 phút)
 *  2. Nhắc lịch tái khám (followUpDate) hàng ngày lúc 8:00 sáng
 *
 * Tất cả thao tác gửi thông báo thực tế được xử lý bất đồng bộ
 * bởi NotificationService → FirebaseNotificationService.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@EnableScheduling
public class NotificationScheduler {

    private final AppointmentRepository  appointmentRepository;
    private final ConsultationRepository consultationRepository;
    private final NotificationService    notificationService;

    // =========================================================================
    // Task 4.2.1 — Nhắc nhở lịch hẹn sắp diễn ra (trước 30 phút)
    // =========================================================================

    /**
     * Chạy mỗi 5 phút, quét các lịch hẹn sắp diễn ra trong 30–35 phút tiếp theo
     * chưa được gửi reminder, sau đó gửi thông báo FCM cho Bệnh nhân.
     * Cửa sổ 5 phút đảm bảo không bỏ sót và không gửi trùng.
     *
     * Cron: mỗi 5 phút
     */
    @Scheduled(cron = "0 0/5 * * * *")
    @Transactional
    public void sendAppointmentReminders() {
        // Cửa sổ: 30 phút đến 35 phút kể từ bây giờ
        LocalDateTime now  = LocalDateTime.now();
        LocalDateTime from = now.plusMinutes(30);
        LocalDateTime to   = now.plusMinutes(35);

        List<Appointment> upcomingAppointments =
                appointmentRepository.findUpcomingAndReminderNotSent(from, to);

        if (upcomingAppointments.isEmpty()) {
            log.debug("Appointment reminder job: no upcoming appointments in window [{} - {}]", from, to);
            return;
        }

        log.info("Appointment reminder job: found {} appointments to remind", upcomingAppointments.size());

        for (Appointment appointment : upcomingAppointments) {
            try {
                // Lấy User của bệnh nhân để gửi thông báo
                User patientUser = appointment.getPatient().getUser();

                String title   = "Upcoming Appointment Reminder";
                String message = String.format(
                        "You have an appointment with Dr. %s at %s. Please be ready.",
                        appointment.getDoctor().getFullName(),
                        appointment.getAppointmentTime().toLocalTime()
                );

                // Gửi FCM Push đến bệnh nhân (bất đồng bộ)
                notificationService.sendMobilePushNotification(
                        patientUser,
                        NotificationType.APPOINTMENT_REMINDER,
                        title,
                        message,
                        NotificationPriority.HIGH,
                        appointment.getAppointmentId(),
                        "/appointments/" + appointment.getAppointmentId()
                );

                // Đánh dấu đã gửi để tránh gửi lại
                appointmentRepository.markReminderSent(appointment.getAppointmentId());

                log.info("Reminder sent for appointmentId={}, patientId={}",
                        appointment.getAppointmentId(), patientUser.getId());

            } catch (Exception ex) {
                log.error("Failed to send reminder for appointmentId={}: {}",
                        appointment.getAppointmentId(), ex.getMessage());
            }
        }
    }

    // =========================================================================
    // Task 4.2.2 — Nhắc lịch tái khám (followUpDate)
    // =========================================================================

    /**
     * Chạy mỗi ngày lúc 8:00 sáng, quét các Consultation có followUpDate
     * rơi trong ngày hôm nay (từ 0:00 đến 23:59) và gửi thông báo nhắc nhở.
     *
     * Cron: 8:00 AM mỗi ngày
     */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void sendFollowUpReminders() {
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime endOfDay   = startOfDay.plusDays(1).minusSeconds(1);

        List<Consultation> dueConsultations =
                consultationRepository.findFollowUpsDueForReminder(startOfDay, endOfDay);

        if (dueConsultations.isEmpty()) {
            log.debug("Follow-up reminder job: no follow-ups due today");
            return;
        }

        log.info("Follow-up reminder job: found {} follow-ups due today", dueConsultations.size());

        for (Consultation consultation : dueConsultations) {
            try {
                // Lấy User của bệnh nhân từ chuỗi Consultation → Appointment → Patient → User
                User patientUser = consultation.getAppointment().getPatient().getUser();

                String title   = "Follow-Up Appointment Reminder";
                String message = String.format(
                        "Today is your scheduled follow-up date. Please book an appointment or contact your doctor. Notes: %s",
                        consultation.getFollowUpNotes() != null
                                ? consultation.getFollowUpNotes()
                                : "Please consult your doctor."
                );

                // Gửi FCM Push đến bệnh nhân (bất đồng bộ)
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
}
