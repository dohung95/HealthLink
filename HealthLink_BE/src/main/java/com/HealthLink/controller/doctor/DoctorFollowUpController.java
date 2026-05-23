package com.HealthLink.controller.doctor;

import com.HealthLink.dto.response.FollowUpCalendarResponse;
import com.HealthLink.dto.response.FollowUpSlotsResponse;
import com.HealthLink.service.followup.FollowUpAppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/doctor/appointments/follow-up")
@RequiredArgsConstructor
public class DoctorFollowUpController {

    private final FollowUpAppointmentService followUpAppointmentService;

    @GetMapping("/slots")
    public ResponseEntity<FollowUpSlotsResponse> getSlots(
            @RequestParam String doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(followUpAppointmentService.getSlots(doctorId, date));
    }

    @GetMapping("/calendar")
    public ResponseEntity<FollowUpCalendarResponse> getCalendar(
            @RequestParam String doctorId,
            @RequestParam String month) {
        return ResponseEntity.ok(followUpAppointmentService.getCalendar(doctorId, month));
    }
}
