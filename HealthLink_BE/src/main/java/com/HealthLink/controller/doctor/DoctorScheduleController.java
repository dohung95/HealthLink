package com.HealthLink.controller.doctor;

import com.HealthLink.dto.doctor.schedule.CalendarDayResponse;
import com.HealthLink.dto.doctor.schedule.DoctorScheduleChangeRequestRequest;
import com.HealthLink.dto.doctor.schedule.DoctorScheduleChangeRequestResponse;
import com.HealthLink.dto.doctor.schedule.DoctorScheduleRequest;
import com.HealthLink.dto.doctor.schedule.WeeklyScheduleResponse;
import com.HealthLink.dto.response.DoctorScheduleResponse;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.service.doctor.DoctorScheduleChangeRequestService;
import com.HealthLink.service.doctor.DoctorScheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Controller for Doctor self-service schedule management.
 * All endpoints require DOCTOR role.
 */
@RestController
@RequestMapping("/api/doctors/schedule")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('DOCTOR')")
public class DoctorScheduleController {

    private final DoctorScheduleService scheduleService;
    private final DoctorScheduleChangeRequestService changeRequestService;
    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;

    /**
     * Resolve doctor ID from authenticated user.
     */
    private String resolveDoctorId(UserDetails userDetails) {
        String userId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found for email: " + userDetails.getUsername()))
                .getId();

        return doctorRepository.findByUser_Id(userId)
                .orElseThrow(() -> new RuntimeException("Doctor not found for user: " + userId))
                .getDoctorId();
    }

    // ========== Weekly Schedules ==========

    /**
     * Get doctor's weekly schedule and exceptions.
     */
    @GetMapping
    public ResponseEntity<WeeklyScheduleResponse> getMySchedule(
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveDoctorId(userDetails);
        return ResponseEntity.ok(scheduleService.getMySchedule(doctorId));
    }

    /**
     * Create a new weekly schedule entry.
     */
    @PostMapping
    public ResponseEntity<DoctorScheduleResponse> createSchedule(
            @Valid @RequestBody DoctorScheduleRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveDoctorId(userDetails);
        return ResponseEntity.ok(scheduleService.createSchedule(doctorId, request));
    }

    /**
     * Delete a schedule.
     */
    @DeleteMapping("/{scheduleId}")
    public ResponseEntity<Map<String, String>> deleteSchedule(
            @PathVariable Integer scheduleId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveDoctorId(userDetails);
        scheduleService.deleteSchedule(doctorId, scheduleId);
        return ResponseEntity.ok(Map.of("message", "Schedule deleted successfully"));
    }

    @PostMapping("/change-requests")
    public ResponseEntity<DoctorScheduleChangeRequestResponse> createScheduleChangeRequest(
            @Valid @RequestBody DoctorScheduleChangeRequestRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveDoctorId(userDetails);
        return ResponseEntity.ok(changeRequestService.createChangeRequest(doctorId, request));
    }

    @GetMapping("/change-requests")
    public ResponseEntity<List<DoctorScheduleChangeRequestResponse>> getMyScheduleChangeRequests(
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveDoctorId(userDetails);
        return ResponseEntity.ok(changeRequestService.getMyChangeRequests(doctorId));
    }

    // ========== Exceptions ==========

    /**
     * Get exceptions in date range.
     */
    @GetMapping("/exceptions")
    public ResponseEntity<List<WeeklyScheduleResponse.ExceptionItem>> getMyExceptions(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveDoctorId(userDetails);
        return ResponseEntity.ok(scheduleService.getMyExceptions(doctorId, startDate, endDate));
    }

    /**
     * Delete an exception. Cannot delete admin-created exceptions.
     */
    @DeleteMapping("/exceptions/{exceptionId}")
    public ResponseEntity<Map<String, String>> deleteException(
            @PathVariable Integer exceptionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveDoctorId(userDetails);
        scheduleService.deleteException(doctorId, exceptionId);
        return ResponseEntity.ok(Map.of("message", "Exception deleted successfully"));
    }

    // ========== Calendar View ==========

    /**
     * Get calendar view with slot statuses for a date range.
     */
    @GetMapping("/calendar")
    public ResponseEntity<List<CalendarDayResponse>> getCalendarView(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveDoctorId(userDetails);
        return ResponseEntity.ok(scheduleService.getCalendarView(doctorId, startDate, endDate));
    }
}
