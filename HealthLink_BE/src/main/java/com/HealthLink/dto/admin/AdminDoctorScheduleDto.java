package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDoctorScheduleDto {

    // Doctor info
    private String doctorId;
    private String doctorName;
    private String specialty;
    private String avatarUrl;

    // Schedule list
    private List<ScheduleItem> schedules;

    // Exceptions list
    private List<ExceptionItem> exceptions;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ScheduleItem {
        private Integer scheduleId;
        private Integer dayOfWeek;      // 0=CN, 1=T2...6=T7
        private String dayOfWeekName;   // "Chủ nhật", "Thứ 2"...
        private LocalTime startTime;
        private LocalTime endTime;
        private Integer slotDuration;
        private Integer maxPatients;
        private boolean available;
        private String consultationType;
        private String location;
        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExceptionItem {
        private Integer exceptionId;
        private LocalDate exceptionDate;
        private String exceptionType;   // DayOff, Modified, AddSlot
        private LocalTime startTime;
        private LocalTime endTime;
        private String reason;
        private boolean recurring;
        private LocalDate recurringUntil;
        private boolean isAdminCreated; // Nếu reason chứa [Admin]
    }
}
