package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
public class HomeVisitSlotResponse {
    private Integer scheduleId;
    private LocalDate bookingDate;
    private String sessionType;
    private LocalTime startTime;
    private LocalTime endTime;

    private Integer estimatedTravelMinutes;
    private Integer visitDurationMinutes;
    private Integer servicesDurationMinutes;
    private Integer bufferMinutes;
    private Integer totalBlockMinutes;
}