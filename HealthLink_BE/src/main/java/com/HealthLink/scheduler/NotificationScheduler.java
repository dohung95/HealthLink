package com.HealthLink.scheduler;

import com.HealthLink.dto.notification.NotificationDispatchSummary;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.MedicineReminderSetting;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.PharmacyInventory;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.entity.enums.PrescriptionTiming;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.repository.pharmacy.PharmacyInventoryRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.service.email.EmailService;
import com.HealthLink.service.medicine.MedicineReminderService;
import com.HealthLink.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
@EnableScheduling
public class NotificationScheduler {

    private static final int LOW_STOCK_THRESHOLD = 10;
    private static final int PATIENT_ONE_HOUR_REMINDER_MINUTES = 60;
    private static final int PATIENT_FIFTEEN_MINUTE_REMINDER_MINUTES = 15;
    private static final DateTimeFormatter PATIENT_REMINDER_EMAIL_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final AppointmentRepository appointmentRepository;
    private final ConsultationRepository consultationRepository;
    private final NotificationService notificationService;
    private final MedicineReminderService medicineReminderService;
    private final EmailService emailService;
    private final PharmacyRepository pharmacyRepository;
    private final PharmacyInventoryRepository inventoryRepository;

    @Scheduled(cron = "0 0/5 * * * *")
    @Transactional
    public void sendAppointmentReminders() {
        sendAppointmentReminders(LocalDateTime.now());
    }

    @Transactional
    public NotificationDispatchSummary sendAppointmentReminders(LocalDateTime now) {
        LocalDateTime from = now.plusMinutes(PATIENT_ONE_HOUR_REMINDER_MINUTES);
        LocalDateTime to = from.plusMinutes(5);

        List<Appointment> upcomingAppointments =
                appointmentRepository.findUpcomingAndReminderNotSent(from, to);

        int candidateCount = upcomingAppointments.size();
        int sentCount = 0;
        int skippedCount = 0;
        int failedCount = 0;

        if (upcomingAppointments.isEmpty()) {
            log.debug("Appointment reminder job: no upcoming appointments in window [{} - {}]", from, to);
            return buildSummary("PATIENT_APPOINTMENT_REMINDER", now, candidateCount, sentCount, skippedCount, failedCount);
        }

        log.info("Appointment reminder job: found {} appointments to remind", candidateCount);

        for (Appointment appointment : upcomingAppointments) {
            try {
                User patientUser = appointment.getPatient().getUser();
                if (patientUser == null || patientUser.getId() == null || patientUser.getId().isBlank()) {
                    skippedCount++;
                    continue;
                }

                String title = "Upcoming Appointment Reminder";
                String message = buildPatientAppointmentReminderMessage(
                        appointment,
                        PATIENT_ONE_HOUR_REMINDER_MINUTES
                );

                sendPatientAppointmentReminder(
                        appointment,
                        patientUser,
                        title,
                        message,
                        PATIENT_ONE_HOUR_REMINDER_MINUTES
                );

                appointmentRepository.markReminderSent(appointment.getAppointmentId());
                sentCount++;

                log.info("Reminder sent for appointmentId={}, patientId={}",
                        appointment.getAppointmentId(), patientUser.getId());

            } catch (Exception ex) {
                failedCount++;
                log.error("Failed to send reminder for appointmentId={}: {}",
                        appointment.getAppointmentId(), ex.getMessage());
            }
        }

        return buildSummary("PATIENT_APPOINTMENT_REMINDER", now, candidateCount, sentCount, skippedCount, failedCount);
    }

    @Scheduled(cron = "0 0/5 * * * *")
    @Transactional
    public void sendPatientFifteenMinuteAppointmentReminders() {
        sendPatientFifteenMinuteAppointmentReminders(LocalDateTime.now());
    }

    @Transactional
    public NotificationDispatchSummary sendPatientFifteenMinuteAppointmentReminders(LocalDateTime now) {
        LocalDateTime from = now.plusMinutes(PATIENT_FIFTEEN_MINUTE_REMINDER_MINUTES);
        LocalDateTime to = from.plusMinutes(5);

        List<Appointment> upcomingAppointments =
                appointmentRepository.findUpcomingPatientFifteenMinuteReminderCandidates(from, to);

        int candidateCount = upcomingAppointments.size();
        int sentCount = 0;
        int skippedCount = 0;
        int failedCount = 0;

        if (upcomingAppointments.isEmpty()) {
            log.debug("15-minute appointment reminder job: no upcoming appointments in window [{} - {}]", from, to);
            return buildSummary("PATIENT_APPOINTMENT_REMINDER_15_MINUTES", now, candidateCount, sentCount, skippedCount, failedCount);
        }

        log.info("15-minute appointment reminder job: found {} appointments to remind", candidateCount);

        for (Appointment appointment : upcomingAppointments) {
            try {
                User patientUser = appointment.getPatient().getUser();
                if (patientUser == null || patientUser.getId() == null || patientUser.getId().isBlank()) {
                    skippedCount++;
                    continue;
                }

                String title = "Appointment starts in 15 minutes";
                String message = buildPatientAppointmentReminderMessage(
                        appointment,
                        PATIENT_FIFTEEN_MINUTE_REMINDER_MINUTES
                );

                sendPatientAppointmentReminder(
                        appointment,
                        patientUser,
                        title,
                        message,
                        PATIENT_FIFTEEN_MINUTE_REMINDER_MINUTES
                );

                appointmentRepository.markPatientFifteenMinuteReminderSent(appointment.getAppointmentId());
                sentCount++;

                log.info("15-minute reminder sent for appointmentId={}, patientId={}",
                        appointment.getAppointmentId(), patientUser.getId());

            } catch (Exception ex) {
                failedCount++;
                log.error("Failed to send 15-minute reminder for appointmentId={}: {}",
                        appointment.getAppointmentId(), ex.getMessage());
            }
        }

        return buildSummary("PATIENT_APPOINTMENT_REMINDER_15_MINUTES", now, candidateCount, sentCount, skippedCount, failedCount);
    }

    @Scheduled(cron = "0 0/5 * * * *")
    @Transactional
    public void sendDoctorAppointmentReminders() {
        sendDoctorAppointmentReminders(LocalDateTime.now());
    }

    @Transactional
    public NotificationDispatchSummary sendDoctorAppointmentReminders(LocalDateTime now) {
        LocalDateTime from = now.plusMinutes(30);
        LocalDateTime to = now.plusMinutes(35);

        List<Appointment> upcomingAppointments =
                appointmentRepository.findUpcomingDoctorReminderCandidates(from, to);

        int candidateCount = upcomingAppointments.size();
        int sentCount = 0;
        int skippedCount = 0;
        int failedCount = 0;

        if (upcomingAppointments.isEmpty()) {
            log.debug("Doctor appointment reminder job: no upcoming appointments in window [{} - {}]", from, to);
            return buildSummary("DOCTOR_APPOINTMENT_REMINDER", now, candidateCount, sentCount, skippedCount, failedCount);
        }

        log.info("Doctor appointment reminder job: found {} appointments to remind", candidateCount);

        for (Appointment appointment : upcomingAppointments) {
            try {
                User doctorUser = appointment.getDoctor() != null ? appointment.getDoctor().getUser() : null;
                if (doctorUser == null || doctorUser.getId() == null || doctorUser.getId().isBlank()) {
                    skippedCount++;
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
                sentCount++;

                log.info("Doctor reminder sent for appointmentId={}, doctorId={}",
                        appointment.getAppointmentId(), doctorUser.getId());
            } catch (Exception ex) {
                failedCount++;
                log.error("Failed to send doctor reminder for appointmentId={}: {}",
                        appointment.getAppointmentId(), ex.getMessage());
            }
        }

        return buildSummary("DOCTOR_APPOINTMENT_REMINDER", now, candidateCount, sentCount, skippedCount, failedCount);
    }

    @Transactional
    public NotificationDispatchSummary unclockDoctorAppointmentReminder(Integer appointmentId, LocalDateTime effectiveNow) {
        effectiveNow = effectiveNow != null ? effectiveNow : LocalDateTime.now();

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));

        if (!"SCHEDULED".equals(appointment.getStatus())) {
            throw new BadRequestException("Only scheduled appointments can be unlocked for reminder");
        }

        User doctorUser = appointment.getDoctor() != null ? appointment.getDoctor().getUser() : null;
        if (doctorUser == null || doctorUser.getId() == null || doctorUser.getId().isBlank()) {
            log.warn("Cannot send unclock reminder for appointmentId={}: doctor user mapping is missing", appointmentId);
            return NotificationDispatchSummary.builder()
                    .job("DOCTOR_APPOINTMENT_UNCLOCK_REMINDER")
                    .effectiveNow(effectiveNow.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .candidateCount(1)
                    .sentCount(0)
                    .skippedCount(1)
                    .failedCount(0)
                    .message("Doctor user not found — skipped")
                    .build();
        }

        java.time.Duration duration;
        LocalDateTime originalAppointmentTime = appointment.getAppointmentTime();
        LocalDateTime originalEndTime = appointment.getEndTime();
        if (originalEndTime != null && originalEndTime.isAfter(originalAppointmentTime)) {
            duration = java.time.Duration.between(originalAppointmentTime, originalEndTime);
        } else {
            duration = java.time.Duration.ofMinutes(30);
        }

        appointment.setAppointmentTime(effectiveNow);
        appointment.setEndTime(effectiveNow.plus(duration));
        appointment.setDoctorReminderSent(true);
        appointmentRepository.save(appointment);

        String patientName = appointment.getPatient() != null
                ? appointment.getPatient().getFullName()
                : "your patient";

        try {
            notificationService.sendWebSocketNotification(
                    doctorUser,
                    NotificationType.APPOINTMENT_REMINDER,
                    "Appointment time arrived",
                    String.format("Your appointment with %s is ready to start.", patientName),
                    appointmentId,
                    "/appointments/" + appointmentId
            );
            log.info("Unclock reminder sent for appointmentId={}, doctorId={}", appointmentId, doctorUser.getId());
            return NotificationDispatchSummary.builder()
                    .job("DOCTOR_APPOINTMENT_UNCLOCK_REMINDER")
                    .effectiveNow(effectiveNow.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .candidateCount(1)
                    .sentCount(1)
                    .skippedCount(0)
                    .failedCount(0)
                    .message("Unclock reminder sent successfully")
                    .build();
        } catch (Exception ex) {
            log.error("Failed to send unclock reminder for appointmentId={}: {}", appointmentId, ex.getMessage());
            return NotificationDispatchSummary.builder()
                    .job("DOCTOR_APPOINTMENT_UNCLOCK_REMINDER")
                    .effectiveNow(effectiveNow.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .candidateCount(1)
                    .sentCount(0)
                    .skippedCount(0)
                    .failedCount(1)
                    .message("Failed to send notification: " + ex.getMessage())
                    .build();
        }
    }

    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void sendFollowUpReminders() {
        sendFollowUpReminders(LocalDateTime.now());
    }

    @Transactional
    public NotificationDispatchSummary sendFollowUpReminders(LocalDateTime now) {
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1).minusSeconds(1);

        List<Consultation> dueConsultations =
                consultationRepository.findFollowUpsDueForReminder(startOfDay, endOfDay);

        int candidateCount = dueConsultations.size();
        int sentCount = 0;
        int skippedCount = 0;
        int failedCount = 0;

        if (dueConsultations.isEmpty()) {
            log.debug("Follow-up reminder job: no follow-ups due today");
            return buildSummary("FOLLOW_UP_REMINDER", now, candidateCount, sentCount, skippedCount, failedCount);
        }

        log.info("Follow-up reminder job: found {} follow-ups due today", candidateCount);

        for (Consultation consultation : dueConsultations) {
            try {
                User patientUser = consultation.getAppointment().getPatient().getUser();
                if (patientUser == null || patientUser.getId() == null || patientUser.getId().isBlank()) {
                    skippedCount++;
                    continue;
                }

                String title = "Follow-Up Appointment Reminder";
                String message = String.format(
                        "Today is your scheduled follow-up date. Please book an appointment or contact your doctor. Notes: %s",
                        consultation.getFollowUpNotes() != null
                                ? consultation.getFollowUpNotes()
                                : "Please consult your doctor."
                );

                notificationService.sendWebSocketAndMobilePushNotification(
                        patientUser,
                        NotificationType.APPOINTMENT_REMINDER,
                        title,
                        message,
                        NotificationPriority.NORMAL,
                        consultation.getConsultationId(),
                        "/consultations/" + consultation.getConsultationId()
                );

                sentCount++;

                log.info("Follow-up reminder sent for consultationId={}, patientId={}",
                        consultation.getConsultationId(), patientUser.getId());

            } catch (Exception ex) {
                failedCount++;
                log.error("Failed to send follow-up reminder for consultationId={}: {}",
                        consultation.getConsultationId(), ex.getMessage());
            }
        }

        return buildSummary("FOLLOW_UP_REMINDER", now, candidateCount, sentCount, skippedCount, failedCount);
    }

    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void sendMedicineReminders() {
        sendMedicineReminders(LocalDateTime.now().withNano(0));
    }

    @Transactional
    public NotificationDispatchSummary sendMedicineReminders(LocalDateTime now) {
        List<MedicineReminderSetting> settings = medicineReminderService.getEnabledSettingsForDispatch();
        int candidateCount = settings.size() * PrescriptionTiming.values().length;
        int sentCount = 0;
        int skippedCount = 0;
        int failedCount = 0;

        for (MedicineReminderSetting setting : settings) {
            for (PrescriptionTiming timing : PrescriptionTiming.values()) {
                try {
                    boolean sent = medicineReminderService.dispatchReminderIfDue(setting, timing, now);
                    if (sent) {
                        sentCount++;
                    } else {
                        skippedCount++;
                    }
                } catch (Exception ex) {
                    failedCount++;
                    log.error("Failed to dispatch medicine reminder for patient={}, timing={}: {}",
                            setting.getPatient() != null ? setting.getPatient().getPatientId() : "unknown",
                            timing.name(),
                            ex.getMessage(),
                            ex);
                }
            }
        }

        return buildSummary("MEDICINE_REMINDER", now, candidateCount, sentCount, skippedCount, failedCount);
    }

    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void sendLowStockWarnings() {
        List<Pharmacy> activePharmacies = pharmacyRepository.findByActiveTrueAndVerifiedTrue();
        for (Pharmacy pharmacy : activePharmacies) {
            User user = pharmacy.getUser();
            if (user == null) continue;
            List<PharmacyInventory> lowStockItems = inventoryRepository
                .findActiveLowStock(pharmacy.getPharmacyId(), LOW_STOCK_THRESHOLD);
            if (lowStockItems.isEmpty()) continue;
            String itemNames = lowStockItems.stream()
                .map(i -> i.getMedicine().getName() + " (" + (i.getQuantity() - i.getReservedQuantity()) + ")")
                .collect(Collectors.joining(", "));
            notificationService.sendWebSocketNotification(user, NotificationType.LOW_STOCK_WARNING,
                "Low stock alert", "Items low: " + itemNames,
                null, "/pharmacy-page/inventory?filter=lowStock");
        }
        log.info("Low stock warnings sent");
    }

    @Scheduled(cron = "0 30 8 * * *")
    @Transactional
    public void sendExpiryWarnings() {
        LocalDate warningDate = LocalDate.now().plusDays(30);
        List<Pharmacy> activePharmacies = pharmacyRepository.findByActiveTrueAndVerifiedTrue();
        for (Pharmacy pharmacy : activePharmacies) {
            User user = pharmacy.getUser();
            if (user == null) continue;
            List<PharmacyInventory> expiring = inventoryRepository
                .findByPharmacy_PharmacyId(pharmacy.getPharmacyId())
                .stream()
                .filter(i -> i.getActive() && i.getExpiryDate() != null
                    && !i.getExpiryDate().isBefore(LocalDate.now())
                    && i.getExpiryDate().isBefore(warningDate))
                .collect(Collectors.toList());
            if (expiring.isEmpty()) continue;
            String items = expiring.stream()
                .map(i -> i.getMedicine().getName() + " (exp " + i.getExpiryDate() + ")")
                .collect(Collectors.joining(", "));
            notificationService.sendWebSocketNotification(user, NotificationType.MEDICINE_EXPIRY_WARNING,
                "Medicine expiry alert", "Expiring within 30 days: " + items,
                null, "/pharmacy-page/inventory");
        }
        log.info("Expiry warnings sent");
    }

    @Scheduled(cron = "0 0 7 * * *")
    @Transactional
    public void sendDailyAppointmentDigest() {
        sendDailyAppointmentDigest(LocalDate.now());
    }

    @Transactional
    public NotificationDispatchSummary sendDailyAppointmentDigest(LocalDate today) {
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(23, 59, 59);

        List<Appointment> todayAppointments = appointmentRepository.findDailyAppointments(startOfDay, endOfDay);

        int sentCount = 0;
        int skippedCount = 0;
        int failedCount = 0;

        if (todayAppointments.isEmpty()) {
            log.debug("Daily appointment digest: no appointments today");
            return buildSummary("DAILY_APPOINTMENT_DIGEST", today.atStartOfDay(), 0, 0, 0, 0);
        }

        Map<String, List<Appointment>> byPatient = todayAppointments.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getPatient().getPatientId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        int candidateCount = byPatient.size();
        log.info("Daily appointment digest: {} patients have appointments today", candidateCount);

        for (Map.Entry<String, List<Appointment>> entry : byPatient.entrySet()) {
            try {
                List<Appointment> patientAppointments = entry.getValue();
                User patientUser = patientAppointments.get(0).getPatient().getUser();
                if (patientUser == null) {
                    skippedCount++;
                    log.warn("Skipping daily digest for patientId={}: user is missing", entry.getKey());
                    continue;
                }

                int count = patientAppointments.size();
                String times = patientAppointments.stream()
                        .map(a -> a.getAppointmentTime().toLocalTime().toString())
                        .collect(Collectors.joining(", "));

                String title = "Today's appointment" + (count > 1 ? "s" : "");
                String message = String.format(
                        "You have %d appointment%s today at %s.",
                        count, count > 1 ? "s" : "", times
                );

                notificationService.sendWebSocketNotification(
                        patientUser,
                        NotificationType.APPOINTMENT_REMINDER,
                        title,
                        message,
                        null,
                        "/appointments"
                );

                sentCount++;

                log.info("Daily appointment digest sent to patientUserId={}, appointmentCount={}",
                        patientUser.getId(), count);
            } catch (Exception ex) {
                failedCount++;
                log.error("Failed to send daily digest for patientId={}: {}",
                        entry.getKey(), ex.getMessage(), ex);
            }
        }

        return buildSummary("DAILY_APPOINTMENT_DIGEST", today.atStartOfDay(), candidateCount, sentCount, skippedCount, failedCount);
    }

    private void sendPatientAppointmentReminder(Appointment appointment, User patientUser,
                                                String title, String message,
                                                int minutesBeforeStart) {
        notificationService.sendWebSocketAndMobilePushNotification(
                patientUser,
                NotificationType.APPOINTMENT_REMINDER,
                title,
                message,
                NotificationPriority.HIGH,
                appointment.getAppointmentId(),
                "/appointments/" + appointment.getAppointmentId()
        );

        sendPatientAppointmentReminderEmail(appointment, patientUser, minutesBeforeStart);
    }

    private void sendPatientAppointmentReminderEmail(Appointment appointment, User patientUser,
                                                     int minutesBeforeStart) {
        if (patientUser.getEmail() == null || patientUser.getEmail().isBlank()) {
            log.warn("Skipping appointment reminder email for appointmentId={} because patient email is missing",
                    appointment.getAppointmentId());
            return;
        }

        try {
            emailService.sendAppointmentReminderEmail(
                    patientUser.getEmail(),
                    resolvePatientName(appointment, patientUser),
                    resolveDoctorName(appointment),
                    formatPatientAppointmentTime(appointment),
                    resolveConsultationType(appointment),
                    minutesBeforeStart
            );
        } catch (Exception ex) {
            log.error("Failed to send appointment reminder email for appointmentId={}, email={}: {}",
                    appointment.getAppointmentId(), patientUser.getEmail(), ex.getMessage());
        }
    }

    private String buildPatientAppointmentReminderMessage(Appointment appointment, int minutesBeforeStart) {
        String doctorName = resolveDoctorName(appointment);
        String doctorLabel = "your doctor".equals(doctorName) ? doctorName : "Dr. " + doctorName;
        String appointmentTime = appointment.getAppointmentTime() != null
                ? appointment.getAppointmentTime().toLocalTime().toString()
                : "your scheduled time";

        if (minutesBeforeStart == PATIENT_ONE_HOUR_REMINDER_MINUTES) {
            return String.format(
                    "You have an appointment with %s at %s. Please be ready.",
                    doctorLabel,
                    appointmentTime
            );
        }

        return String.format(
                "Your appointment with %s starts in %d minutes at %s. Please be ready.",
                doctorLabel,
                minutesBeforeStart,
                appointmentTime
        );
    }

    private String resolvePatientName(Appointment appointment, User patientUser) {
        if (appointment.getPatient() != null
                && appointment.getPatient().getFullName() != null
                && !appointment.getPatient().getFullName().isBlank()) {
            return appointment.getPatient().getFullName();
        }
        if (patientUser.getUsername() != null && !patientUser.getUsername().isBlank()) {
            return patientUser.getUsername();
        }
        return "Patient";
    }

    private String resolveDoctorName(Appointment appointment) {
        if (appointment.getDoctor() != null
                && appointment.getDoctor().getFullName() != null
                && !appointment.getDoctor().getFullName().isBlank()) {
            return appointment.getDoctor().getFullName();
        }
        return "your doctor";
    }

    private String formatPatientAppointmentTime(Appointment appointment) {
        if (appointment.getAppointmentTime() == null) {
            return "your scheduled time";
        }
        return appointment.getAppointmentTime().format(PATIENT_REMINDER_EMAIL_TIME_FORMATTER);
    }

    private String resolveConsultationType(Appointment appointment) {
        if (appointment.getConsultationType() == null || appointment.getConsultationType().isBlank()) {
            return "Consultation";
        }
        return appointment.getConsultationType();
    }

    private NotificationDispatchSummary buildSummary(String job, LocalDateTime effectiveNow, int candidateCount, int sentCount, int skippedCount, int failedCount) {
        String message = String.format("Triggered %s: %d sent, %d skipped, %d failed",
                job, sentCount, skippedCount, failedCount);
        return NotificationDispatchSummary.builder()
                .job(job)
                .effectiveNow(effectiveNow.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .candidateCount(candidateCount)
                .sentCount(sentCount)
                .skippedCount(skippedCount)
                .failedCount(failedCount)
                .message(message)
                .build();
    }
}
