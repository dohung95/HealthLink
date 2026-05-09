package com.HealthLink.dto.request;

import lombok.Data;
import java.time.LocalDateTime;

// Request body khi dời lịch hẹn sang giờ khác
@Data
public class RescheduleAppointmentRequest {

    private LocalDateTime newAppointmentTime;
}
