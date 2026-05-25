package com.HealthLink.scheduler;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
@EnableScheduling
public class NotificationScheduler {

    private final AppointmentRepository appointmentRepository;
    private final ConsultationRepository consultationRepository;
    private final PrescriptionHeaderRepository prescriptionHeaderRepository;
    private final PrescriptionReminderLogRepository prescriptionReminderLogRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

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

    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void sendMorningPrescriptionReminders() {
        sendPrescriptionRemindersForTiming(PrescriptionTiming.MORNING);
    }

    @Scheduled(cron = "0 0 12 * * *")
    @Transactional
    public void sendAfternoonPrescriptionReminders() {
        sendPrescriptionRemindersForTiming(PrescriptionTiming.AFTERNOON);
    }

    @Scheduled(cron = "0 0 18 * * *")
    @Transactional
    public void sendEveningPrescriptionReminders() {
        sendPrescriptionRemindersForTiming(PrescriptionTiming.EVENING);
    }

    @Transactional
    public void sendPrescriptionReminders() {
        sendPrescriptionRemindersForTiming(PrescriptionTiming.MORNING);
    }

    void sendPrescriptionRemindersForTiming(PrescriptionTiming timing) {
        sendPrescriptionRemindersForTiming(timing, LocalDateTime.now().withNano(0));
    }

    void sendPrescriptionRemindersForTiming(PrescriptionTiming timing, LocalDateTime now) {
        LocalDate reminderDate = now.toLocalDate();
        List<PrescriptionHeader> candidates = prescriptionHeaderRepository.findActiveReminderCandidates(now);

        if (candidates.isEmpty()) {
            log.debug("Prescription reminder job: no active prescriptions for timing={}", timing);
            return;
        }

        log.info("Prescription reminder job: found {} active prescriptions for timing={}", candidates.size(), timing);

        for (PrescriptionHeader prescription : candidates) {
            try {
                Integer prescriptionHeaderId = prescription.getPrescriptionHeaderId();
                String timingName = timing.name();
                if (prescriptionReminderLogRepository
                        .existsByPrescriptionHeader_PrescriptionHeaderIdAndTimingAndReminderDate(
                                prescriptionHeaderId,
                                timingName,
                                reminderDate
                        )) {
                    log.debug("Skipping prescription reminder already sent: prescription={}, timing={}, date={}",
                            prescriptionHeaderId, timingName, reminderDate);
                    continue;
                }

                List<PrescriptionItem> itemsForTiming = itemsForTiming(prescription, timing);
                if (itemsForTiming.isEmpty()) {
                    continue;
                }

                User patientUser = prescription.getPatient() != null ? prescription.getPatient().getUser() : null;
                if (patientUser == null) {
                    log.warn("Skipping prescription reminder {} because patient user is missing", prescriptionHeaderId);
                    continue;
                }

                String title = titleForTiming(timing);
                int remainingDays = remainingDays(prescription, now);
                String message = buildMedicationReminderMessage(prescription, timing, itemsForTiming, remainingDays);
                String metadata = buildMedicationReminderMetadata(prescription, timing, itemsForTiming, remainingDays);

                notificationService.sendMobilePushNotification(
                        patientUser,
                        NotificationType.NEW_PRESCRIPTION,
                        title,
                        message,
                        NotificationPriority.NORMAL,
                        prescriptionHeaderId,
                        "/prescriptions/" + prescriptionHeaderId,
                        metadata
                );

                prescriptionReminderLogRepository.save(PrescriptionReminderLog.builder()
                        .prescriptionHeader(prescription)
                        .reminderDate(reminderDate)
                        .timing(timingName)
                        .sentAt(now)
                        .build());

                log.info("Prescription reminder sent: prescription={}, timing={}, patientId={}, itemCount={}",
                        prescriptionHeaderId, timingName, patientUser.getId(), itemsForTiming.size());
            } catch (Exception ex) {
                log.error("Failed to send prescription reminder for prescriptionHeaderId={}, timing={}: {}",
                        prescription.getPrescriptionHeaderId(), timing.name(), ex.getMessage(), ex);
            }
        }
    }

    private List<PrescriptionItem> itemsForTiming(PrescriptionHeader prescription, PrescriptionTiming timing) {
        if (prescription.getPrescriptionItems() == null) {
            return List.of();
        }

        return prescription.getPrescriptionItems().stream()
                .filter(item -> item.getTiming() != null)
                .filter(item -> {
                    try {
                        return PrescriptionTiming.containsTiming(item.getTiming(), timing.name());
                    } catch (IllegalArgumentException ex) {
                        log.warn("Skipping prescription item {} with invalid timing '{}'",
                                item.getPrescriptionItemId(), item.getTiming());
                        return false;
                    }
                })
                .toList();
    }

    private String titleForTiming(PrescriptionTiming timing) {
        return switch (timing) {
            case MORNING -> "Morning medication reminder";
            case AFTERNOON -> "Afternoon medication reminder";
            case EVENING -> "Evening medication reminder";
        };
    }

    private String buildMedicationReminderMessage(
            PrescriptionHeader prescription,
            PrescriptionTiming timing,
            List<PrescriptionItem> items,
            int remainingDays
    ) {
        String medicationList = items.stream()
                .map(this::formatMedicationLine)
                .collect(Collectors.joining("; "));
        return String.format(
                "Prescription #%s - %s: %d medication(s)%s. %s",
                prescription.getPrescriptionHeaderId(),
                timing.name(),
                items.size(),
                remainingDays > 0 ? ", " + remainingDays + " day(s) remaining" : "",
                medicationList
        );
    }

    private String formatMedicationLine(PrescriptionItem item) {
        List<String> parts = new ArrayList<>();
        parts.add(item.getMedicationName());
        if (item.getQuantity() != null) {
            parts.add("qty " + item.getQuantity());
        }
        if (item.getUnit() != null && !item.getUnit().isBlank()) {
            parts.add(item.getUnit());
        }
        if (item.getNotes() != null && !item.getNotes().isBlank()) {
            parts.add(item.getNotes());
        }
        return String.join(" ", parts);
    }

    private int remainingDays(PrescriptionHeader prescription, LocalDateTime now) {
        if (prescription.getValidUntil() == null) {
            return 0;
        }
        long days = java.time.Duration.between(now, prescription.getValidUntil()).toDays();
        return (int) Math.max(days, 0);
    }

    private String buildMedicationReminderMetadata(
            PrescriptionHeader prescription,
            PrescriptionTiming timing,
            List<PrescriptionItem> items,
            int remainingDays
    ) {
        List<Map<String, Object>> medications = items.stream()
                .map(item -> {
                    Map<String, Object> medication = new LinkedHashMap<>();
                    medication.put("prescriptionItemId", item.getPrescriptionItemId());
                    medication.put("medicineId", item.getMedicine() != null ? item.getMedicine().getMedicineId() : null);
                    medication.put("medicationName", item.getMedicationName());
                    medication.put("quantity", item.getQuantity());
                    medication.put("unit", item.getUnit() != null ? item.getUnit() : "");
                    medication.put("notes", item.getNotes() != null ? item.getNotes() : "");
                    return medication;
                })
                .toList();

        Map<String, Object> metadata = Map.of(
                "prescriptionHeaderId", prescription.getPrescriptionHeaderId(),
                "timing", timing.name(),
                "medicationCount", items.size(),
                "remainingDays", remainingDays,
                "medications", medications
        );

        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (Exception ex) {
            log.warn("Failed to serialize medication reminder metadata: {}", ex.getMessage());
            return null;
        }
    }
}
