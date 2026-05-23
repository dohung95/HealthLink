package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class FollowUpCalendarDayResponse {
    private LocalDate date;
    private int totalSlots;
    private int bookedSlots;
    private int availableSlots;
    private boolean hasAppointments;
    private String status;
}
