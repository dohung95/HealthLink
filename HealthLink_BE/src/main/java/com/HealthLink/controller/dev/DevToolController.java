package com.HealthLink.controller.dev;

import com.HealthLink.dto.consultation.ConsultationResponse;
import com.HealthLink.dto.notification.NotificationDispatchSummary;
import com.HealthLink.entity.enums.PrescriptionTiming;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.scheduler.NotificationScheduler;
import com.HealthLink.service.consultation.ConsultationService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/api/dev-tools")
@RequiredArgsConstructor
@Profile({"dev", "test"})
@PreAuthorize("hasRole('ADMIN')")
public class DevToolController {

    private final ConsultationService consultationService;
    private final NotificationScheduler notificationScheduler;

    @PostMapping("/appointments/{appointmentId}/unclock-reminder")
    public ResponseEntity<NotificationDispatchSummary> unclockAppointmentReminder(
            @PathVariable Integer appointmentId,
            @RequestBody(required = false) UnclockReminderRequest request) {
        LocalDateTime effectiveNow = parseNow(request != null ? request.now() : null);
        NotificationDispatchSummary summary =
                notificationScheduler.unclockDoctorAppointmentReminder(appointmentId, effectiveNow);
        return ResponseEntity.ok(summary);
    }

    @PostMapping("/appointments/{appointmentId}/start-consultation")
    public ResponseEntity<ConsultationResponse> startConsultationForTesting(
            @PathVariable Integer appointmentId) {
        return ResponseEntity.ok(consultationService.startByAppointmentForTesting(appointmentId));
    }

    @PostMapping("/notifications/trigger")
    public ResponseEntity<NotificationDispatchSummary> triggerNotificationJob(
            @RequestBody NotificationTriggerRequest request) {
        NotificationJob job = parseJob(request.job());
        LocalDateTime effectiveNow = parseNow(request.now());
        NotificationDispatchSummary summary;

        switch (job) {
            case DAILY_APPOINTMENT_DIGEST -> {
                LocalDate today = effectiveNow != null ? effectiveNow.toLocalDate() : LocalDate.now();
                summary = notificationScheduler.sendDailyAppointmentDigest(today);
            }
            case PATIENT_APPOINTMENT_REMINDER -> {
                summary = notificationScheduler.sendAppointmentReminders(
                        effectiveNow != null ? effectiveNow : LocalDateTime.now());
            }
            case DOCTOR_APPOINTMENT_REMINDER -> {
                summary = notificationScheduler.sendDoctorAppointmentReminders(
                        effectiveNow != null ? effectiveNow : LocalDateTime.now());
            }
            case FOLLOW_UP_REMINDER -> {
                summary = notificationScheduler.sendFollowUpReminders(
                        effectiveNow != null ? effectiveNow : LocalDateTime.now());
            }
            case PRESCRIPTION_REMINDER -> {
                PrescriptionTiming timing = parseTiming(request.timing());
                summary = notificationScheduler.sendPrescriptionRemindersForTiming(timing,
                        effectiveNow != null ? effectiveNow : LocalDateTime.now().withNano(0));
            }
            default -> throw new BadRequestException("Unknown job: " + request.job());
        }

        return ResponseEntity.ok(summary);
    }

    private LocalDateTime parseNow(String now) {
        if (now == null || now.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(now);
        } catch (DateTimeParseException ex) {
            throw new BadRequestException("now must be a valid ISO local datetime (e.g. 2026-05-24T08:00:00)");
        }
    }

    private NotificationJob parseJob(String value) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("job is required");
        }

        try {
            return NotificationJob.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException(
                    "job must be one of DAILY_APPOINTMENT_DIGEST, PATIENT_APPOINTMENT_REMINDER, " +
                            "DOCTOR_APPOINTMENT_REMINDER, FOLLOW_UP_REMINDER, PRESCRIPTION_REMINDER");
        }
    }

    private PrescriptionTiming parseTiming(String value) {
        try {
            return PrescriptionTiming.from(value);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException(ex.getMessage());
        }
    }

    public record NotificationTriggerRequest(
            String job,
            String timing,
            String now
    ) {
    }

    public record UnclockReminderRequest(String now) {
    }

    private enum NotificationJob {
        DAILY_APPOINTMENT_DIGEST,
        PATIENT_APPOINTMENT_REMINDER,
        DOCTOR_APPOINTMENT_REMINDER,
        FOLLOW_UP_REMINDER,
        PRESCRIPTION_REMINDER
    }
}
