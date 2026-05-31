package com.HealthLink.controller.healthrecord;

import com.HealthLink.dto.response.healthrecord.HealthRecordShareResponse;
import com.HealthLink.service.healthrecord.HealthRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctor/health-records")
@RequiredArgsConstructor
public class DoctorHealthRecordController {

    private final HealthRecordService healthRecordService;

    @GetMapping("/shared-with-me")
    public ResponseEntity<List<HealthRecordShareResponse>> getSharedWithMe(
            @RequestParam String doctorId,
            @RequestParam(required = false) Integer appointmentId) {
        return ResponseEntity.ok(healthRecordService.getSharedWithMe(doctorId, appointmentId));
    }

    @GetMapping("/shares/{shareId}")
    public ResponseEntity<HealthRecordShareResponse> getShareDetail(
            @PathVariable Integer shareId,
            @RequestParam String doctorId) {
        return ResponseEntity.ok(healthRecordService.getShareDetail(shareId, doctorId));
    }
}
