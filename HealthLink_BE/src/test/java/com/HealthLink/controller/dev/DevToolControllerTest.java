package com.HealthLink.controller.dev;

import com.HealthLink.dto.notification.NotificationDispatchSummary;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.scheduler.NotificationScheduler;
import com.HealthLink.service.consultation.ConsultationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DevToolControllerTest {

    @Mock
    private ConsultationService consultationService;

    @Mock
    private NotificationScheduler notificationScheduler;

    @InjectMocks
    private DevToolController devToolController;

    @Test
    void triggerNotificationJob_shouldRejectUnknownJob() {
        var request = new DevToolController.NotificationTriggerRequest(
                "UNKNOWN",
                null,
                null
        );

        assertThatThrownBy(() -> devToolController.triggerNotificationJob(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("job must be one of");
        verifyNoInteractions(notificationScheduler);
    }

    @Test
    void triggerNotificationJob_shouldRejectPrescriptionReminderWithoutTiming() {
        var request = new DevToolController.NotificationTriggerRequest(
                "PRESCRIPTION_REMINDER",
                null,
                null
        );

        assertThatThrownBy(() -> devToolController.triggerNotificationJob(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Timing is required");
        verifyNoInteractions(notificationScheduler);
    }

    @Test
    void unclockAppointmentReminder_shouldCallSchedulerWithAppointmentId() {
        var request = new DevToolController.UnclockReminderRequest("2026-06-08T10:30:00");
        NotificationDispatchSummary expected = NotificationDispatchSummary.builder()
                .job("DOCTOR_APPOINTMENT_UNCLOCK_REMINDER")
                .sentCount(1)
                .build();

        when(notificationScheduler.unclockDoctorAppointmentReminder(eq(24), any(LocalDateTime.class)))
                .thenReturn(expected);

        var response = devToolController.unclockAppointmentReminder(24, request);

        assertThat(response.getStatusCodeValue()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getSentCount()).isEqualTo(1);
    }

    @Test
    void unclockAppointmentReminder_shouldRejectInvalidNow() {
        var request = new DevToolController.UnclockReminderRequest("invalid-date");

        assertThatThrownBy(() -> devToolController.unclockAppointmentReminder(24, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ISO local datetime");
    }

    @Test
    void unclockAppointmentReminder_shouldUseNullNowWhenNotProvided() {
        NotificationDispatchSummary expected = NotificationDispatchSummary.builder()
                .job("DOCTOR_APPOINTMENT_UNCLOCK_REMINDER")
                .sentCount(1)
                .build();

        when(notificationScheduler.unclockDoctorAppointmentReminder(eq(24), any()))
                .thenReturn(expected);

        var response = devToolController.unclockAppointmentReminder(24, null);

        assertThat(response.getStatusCodeValue()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getSentCount()).isEqualTo(1);
    }
}
