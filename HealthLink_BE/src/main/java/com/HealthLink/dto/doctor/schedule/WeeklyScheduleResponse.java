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
public class WeeklyScheduleResponse {

    private String doctorId;
    private String doctorName;
    private com.HealthLink.entity.enums.DoctorScheduleStatus doctorScheduleStatus; // Overall doctor schedule status
    private Double totalMonthlyHours; // Total working hours per month
    private Double requiredMonthlyHours; // Minimum required hours per month (80h)
    private List<ScheduleItem> schedules;
    private List<ExceptionItem> exceptions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScheduleItem {
        private Integer scheduleId;
        private Integer dayOfWeek;
        private String dayName;
        private LocalTime startTime;
        private LocalTime endTime;
        private Integer slotDuration;
        private Integer maxPatients;
        private String consultationType;
        private String location;
        private String notes;
        private boolean available;
        private com.HealthLink.entity.enums.DoctorScheduleStatus scheduleStatus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExceptionItem {
        private Integer exceptionId;
        private LocalDate exceptionDate;
        private String exceptionType;
        private LocalTime startTime;
        private LocalTime endTime;
        private String reason;
        private boolean recurring;
        private LocalDate recurringUntil;
        private boolean isAdminCreated;
    }
}
