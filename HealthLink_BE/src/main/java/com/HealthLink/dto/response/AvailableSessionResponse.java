package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
@Builder
public class AvailableSessionResponse {

    private Integer scheduleId;
    private String sessionType;
    private LocalTime startTime;
    private LocalTime endTime;
    private List<LocalDate> availableDates;
}
