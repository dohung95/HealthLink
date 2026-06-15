package com.HealthLink.controller.healthrecord;

import com.HealthLink.dto.response.healthrecord.HealthRecordShareResponse;
import com.HealthLink.service.healthrecord.HealthRecordService;
import com.HealthLink.utility.DoctorSecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctor/health-records")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DOCTOR')")
public class DoctorHealthRecordController {

    private final HealthRecordService healthRecordService;
    private final DoctorSecurityUtils securityUtils;

    @GetMapping("/shared-with-me")
    public ResponseEntity<List<HealthRecordShareResponse>> getSharedWithMe(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) Integer appointmentId) {
        String doctorId = securityUtils.resolveDoctor(userDetails).getDoctorId();
        return ResponseEntity.ok(healthRecordService.getSharedWithMe(doctorId, appointmentId));
    }

    @GetMapping("/shares/{shareId}")
    public ResponseEntity<HealthRecordShareResponse> getShareDetail(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer shareId) {
        String doctorId = securityUtils.resolveDoctor(userDetails).getDoctorId();
        return ResponseEntity.ok(healthRecordService.getShareDetail(shareId, doctorId));
    }
}
