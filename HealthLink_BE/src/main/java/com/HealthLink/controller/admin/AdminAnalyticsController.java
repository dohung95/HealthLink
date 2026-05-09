package com.HealthLink.controller.admin;

import com.HealthLink.dto.admin.AdminAnalyticsResponseDto;
import com.HealthLink.service.admin.AdminAnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/analytics")
@CrossOrigin(origins = "http://localhost:5173")
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
}
