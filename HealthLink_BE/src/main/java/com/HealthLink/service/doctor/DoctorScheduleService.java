package com.HealthLink.service.doctor;

import com.HealthLink.dto.doctor.schedule.CalendarDayResponse;
import com.HealthLink.dto.doctor.schedule.DoctorScheduleRequest;
import com.HealthLink.dto.doctor.schedule.WeeklyScheduleResponse;
import com.HealthLink.dto.response.DoctorScheduleResponse;

import java.time.LocalDate;
import java.util.List;

/**
 * Service interface for Doctor self-service schedule management.
 */
public interface DoctorScheduleService {

    /**
     * Get doctor's weekly schedules and exceptions.
     */
    WeeklyScheduleResponse getMySchedule(String doctorId);

    /**
     * Create a new weekly schedule entry.
     */
    DoctorScheduleResponse createSchedule(String doctorId, DoctorScheduleRequest request);

    /**
     * Delete a schedule.
     */
    void deleteSchedule(String doctorId, Integer scheduleId);

    /**
     * Get exceptions in date range.
     */
    List<WeeklyScheduleResponse.ExceptionItem> getMyExceptions(String doctorId, LocalDate startDate, LocalDate endDate);

    /**
     * Delete an exception. Cannot delete admin-created exceptions.
     */
    void deleteException(String doctorId, Integer exceptionId);

    /**
     * Get calendar view with slot statuses for a date range.
     */
    List<CalendarDayResponse> getCalendarView(String doctorId, LocalDate startDate, LocalDate endDate);
}
