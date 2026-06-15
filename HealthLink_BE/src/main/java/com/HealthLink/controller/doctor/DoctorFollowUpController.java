package com.HealthLink.controller.doctor;

import com.HealthLink.dto.response.FollowUpCalendarResponse;
import com.HealthLink.dto.response.FollowUpSlotsResponse;
import com.HealthLink.service.followup.FollowUpAppointmentService;
import com.HealthLink.utility.DoctorSecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/doctor/appointments/follow-up")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DOCTOR')")
public class DoctorFollowUpController {

    private final FollowUpAppointmentService followUpAppointmentService;
    private final DoctorSecurityUtils securityUtils;

    @GetMapping("/slots")
    public ResponseEntity<FollowUpSlotsResponse> getSlots(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        String doctorId = securityUtils.resolveDoctor(userDetails).getDoctorId();
        return ResponseEntity.ok(followUpAppointmentService.getSlots(doctorId, date));
    }

    @GetMapping("/calendar")
    public ResponseEntity<FollowUpCalendarResponse> getCalendar(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String month) {
        String doctorId = securityUtils.resolveDoctor(userDetails).getDoctorId();
        return ResponseEntity.ok(followUpAppointmentService.getCalendar(doctorId, month));
    }
}
