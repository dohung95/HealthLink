package com.HealthLink.controller.doctor;

import com.HealthLink.dto.response.DoctorResponse;
import com.HealthLink.dto.response.DoctorScheduleResponse;
import com.HealthLink.service.doctor.DoctorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorService doctorService;

    // Lấy danh sách bác sĩ, hỗ trợ lọc theo chuyên khoa và tên
    @GetMapping
    public ResponseEntity<List<DoctorResponse>> getAllDoctors(
            @RequestParam(required = false) String specialty,
            @RequestParam(required = false) String name) {
        return ResponseEntity.ok(doctorService.getAllDoctors(specialty, name));
    }

    // Lấy lịch làm việc của một bác sĩ.
    @GetMapping("/{doctorId}/schedules")
    public ResponseEntity<List<DoctorScheduleResponse>> getDoctorSchedules(
            @PathVariable String doctorId) {
        return ResponseEntity.ok(doctorService.getDoctorSchedules(doctorId));
    }
}
