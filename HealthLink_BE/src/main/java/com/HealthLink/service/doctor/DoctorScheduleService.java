package com.HealthLink.service.doctor;

import com.HealthLink.dto.doctor.schedule.CalendarDayResponse;
import com.HealthLink.dto.doctor.schedule.DoctorDayOffRequest;
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
     * Doctor self-registers a day off on a future date that already has a working schedule.
     */
    WeeklyScheduleResponse.ExceptionItem createDayOff(String doctorId, DoctorDayOffRequest request);

    /**
     * Get calendar view with slot statuses for a date range.
     */
    List<CalendarDayResponse> getCalendarView(String doctorId, LocalDate startDate, LocalDate endDate);

    /**
     * Doctor confirms their schedule for the new month after being prompted to reconfirm
     * (schedule carried over from a compliant previous month). Sets status back to APPROVED
     * and clears the reconfirmation flag.
     */
    void confirmMonthlySchedule(String doctorId);

    /**
     * Scheduled job entry point (runs on the 1st of each month): for every doctor whose schedule
     * carries into the new month, check last month's compliance and either require reconfirmation
     * (met quota) or send a reminder to add more hours (didn't meet quota).
     */
    void runMonthlyReconfirmationCheck();
}
