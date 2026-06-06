package com.HealthLink.controller.dev;

import com.HealthLink.dto.consultation.ConsultationResponse;
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
import java.util.Map;

@RestController
@RequestMapping("/api/dev-tools")
@RequiredArgsConstructor
@Profile({"dev", "test"})
@PreAuthorize("hasRole('ADMIN')")
public class DevToolController {

    private final ConsultationService consultationService;
    private final NotificationScheduler notificationScheduler;

    @PostMapping("/appointments/{appointmentId}/start-consultation")
    public ResponseEntity<ConsultationResponse> startConsultationForTesting(
            @PathVariable Integer appointmentId) {
        return ResponseEntity.ok(consultationService.startByAppointmentForTesting(appointmentId));
    }

    @PostMapping("/notifications/trigger")
    public ResponseEntity<Map<String, String>> triggerNotificationJob(
            @RequestBody NotificationTriggerRequest request) {
        NotificationJob job = parseJob(request.job());

        switch (job) {
            case DAILY_APPOINTMENT_DIGEST -> notificationScheduler.sendDailyAppointmentDigest(LocalDate.now());
            case PATIENT_APPOINTMENT_REMINDER -> notificationScheduler.sendAppointmentReminders(LocalDateTime.now());
            case DOCTOR_APPOINTMENT_REMINDER -> notificationScheduler.sendDoctorAppointmentReminders(LocalDateTime.now());
            case FOLLOW_UP_REMINDER -> notificationScheduler.sendFollowUpReminders(LocalDateTime.now());
            case PRESCRIPTION_REMINDER -> {
                PrescriptionTiming timing = parseTiming(request.timing());
                notificationScheduler.sendPrescriptionRemindersForTiming(timing, LocalDateTime.now());
            }
        }

        return ResponseEntity.ok(Map.of("message", "Triggered " + job.name()));
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
            String timing
    ) {
    }

    private enum NotificationJob {
        DAILY_APPOINTMENT_DIGEST,
        PATIENT_APPOINTMENT_REMINDER,
        DOCTOR_APPOINTMENT_REMINDER,
        FOLLOW_UP_REMINDER,
        PRESCRIPTION_REMINDER
    }
}
