package com.HealthLink.controller.dev;

import com.HealthLink.exception.BadRequestException;
import com.HealthLink.scheduler.NotificationScheduler;
import com.HealthLink.service.consultation.ConsultationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

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
                null
        );

        assertThatThrownBy(() -> devToolController.triggerNotificationJob(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Timing is required");
        verifyNoInteractions(notificationScheduler);
    }
}
