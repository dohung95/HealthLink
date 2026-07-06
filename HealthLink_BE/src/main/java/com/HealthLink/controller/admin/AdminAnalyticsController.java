package com.HealthLink.controller.admin;

import com.HealthLink.dto.admin.AdminAnalyticsResponseDto;
import com.HealthLink.dto.admin.AdminAnalyticsSplitResponseDto;
import com.HealthLink.dto.admin.AdminOverviewStatsDto;
import com.HealthLink.service.admin.AdminAnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/analytics")
@CrossOrigin(origins = "http://localhost:5173")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAnalyticsController {

    private final AdminAnalyticsService analyticsService;

    public AdminAnalyticsController(AdminAnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/patient-registrations")
    public ResponseEntity<AdminAnalyticsResponseDto> getPatientRegistrations(
            @RequestParam(defaultValue = "0") int year) {
        return ResponseEntity.ok(analyticsService.getPatientRegistrations(year));
    }

    @GetMapping("/appointments-by-week")
    public ResponseEntity<AdminAnalyticsResponseDto> getAppointmentsByWeek(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        return ResponseEntity.ok(analyticsService.getAppointmentsByWeek(year, month));
    }

    @GetMapping("/appointments-by-month")
    public ResponseEntity<AdminAnalyticsResponseDto> getAppointmentsByMonth(
            @RequestParam(defaultValue = "0") int year) {
        return ResponseEntity.ok(analyticsService.getAppointmentsByMonth(year));
    }

    @GetMapping("/revenue-by-month")
    public ResponseEntity<AdminAnalyticsResponseDto> getRevenueByMonth(
            @RequestParam(defaultValue = "0") int year) {
        return ResponseEntity.ok(analyticsService.getRevenueByMonth(year));
    }

    @GetMapping("/appointments-by-month-split")
    public ResponseEntity<AdminAnalyticsSplitResponseDto> getAppointmentsByMonthSplit(
            @RequestParam(defaultValue = "0") int year) {
        return ResponseEntity.ok(analyticsService.getAppointmentsByMonthSplit(year));
    }

    @GetMapping("/revenue-by-month-split")
    public ResponseEntity<AdminAnalyticsSplitResponseDto> getRevenueByMonthSplit(
            @RequestParam(defaultValue = "0") int year) {
        return ResponseEntity.ok(analyticsService.getRevenueByMonthSplit(year));
    }

    @GetMapping("/registrations-by-role")
    public ResponseEntity<AdminAnalyticsSplitResponseDto> getRegistrationsByRole(
            @RequestParam(defaultValue = "0") int year) {
        return ResponseEntity.ok(analyticsService.getRegistrationsByRole(year));
    }

    @GetMapping("/patient-registrations-by-week")
    public ResponseEntity<AdminAnalyticsResponseDto> getPatientRegistrationsByWeek(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        return ResponseEntity.ok(analyticsService.getPatientRegistrationsByWeek(year, month));
    }

    @GetMapping("/appointments-by-week-split")
    public ResponseEntity<AdminAnalyticsSplitResponseDto> getAppointmentsByWeekSplit(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        return ResponseEntity.ok(analyticsService.getAppointmentsByWeekSplit(year, month));
    }

    @GetMapping("/revenue-by-week-split")
    public ResponseEntity<AdminAnalyticsSplitResponseDto> getRevenueByWeekSplit(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        return ResponseEntity.ok(analyticsService.getRevenueByWeekSplit(year, month));
    }

    @GetMapping("/registrations-by-week-role")
    public ResponseEntity<AdminAnalyticsSplitResponseDto> getRegistrationsByWeekRole(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        return ResponseEntity.ok(analyticsService.getRegistrationsByWeekRole(year, month));
    }

    @GetMapping("/appointments-by-hour-split")
    public ResponseEntity<AdminAnalyticsSplitResponseDto> getAppointmentsByHourSplit(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        return ResponseEntity.ok(analyticsService.getAppointmentsByHourSplit(year, month));
    }

    @GetMapping("/overview-stats")
    public ResponseEntity<AdminOverviewStatsDto> getOverviewStats() {
        return ResponseEntity.ok(analyticsService.getOverviewStats());
    }
}
