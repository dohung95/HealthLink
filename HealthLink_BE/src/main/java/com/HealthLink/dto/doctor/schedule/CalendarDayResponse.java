package com.HealthLink.dto.doctor.schedule;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarDayResponse {

    private LocalDate date;
    private String dayName;
    private String status; // WORKING, DAY_OFF, MODIFIED, NO_SCHEDULE

    private List<SlotInfo> slots;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SlotInfo {
        private LocalTime startTime;
        private LocalTime endTime;
        private String status; // AVAILABLE, BOOKED, HELD
        private String patientName; // If BOOKED
        private Integer appointmentId;
        private String consultationType;
    }
}
