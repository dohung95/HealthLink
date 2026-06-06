package com.HealthLink.controller.admin;

import com.HealthLink.dto.admin.*;
import com.HealthLink.service.admin.AdminDoctorService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@CrossOrigin(origins = "http://localhost:63527")
@RestController
@RequestMapping("/api/admin/admindoctors")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDoctorController {

    private final AdminDoctorService adminDoctorService;

    public AdminDoctorController(AdminDoctorService adminDoctorService) {
        this.adminDoctorService = adminDoctorService;
    }

    @GetMapping
    public ResponseEntity<AdminDoctorPageResponse> getDoctors(
            @RequestParam(defaultValue = "1") int pageNumber,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(defaultValue = "") String searchTerm,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "") String specialty,
            @RequestParam(defaultValue = "newest") String sortBy
    ) {
        AdminDoctorPageResponse response = adminDoctorService.getDoctors(
            pageNumber, pageSize, searchTerm, status, specialty, sortBy
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{doctorId}")
    public ResponseEntity<AdminDoctorDto> getDoctorById(@PathVariable String doctorId) {
        AdminDoctorDto doctor = adminDoctorService.getDoctorById(doctorId);
        return ResponseEntity.ok(doctor);
    }

    @PutMapping("/{doctorId}")
    public ResponseEntity<AdminDoctorDto> updateDoctor(
            @PathVariable String doctorId,
            @RequestBody AdminDoctorUpdateDto updateDto
    ) {
        AdminDoctorDto updatedDoctor = adminDoctorService.updateDoctor(doctorId, updateDto);
        return ResponseEntity.ok(updatedDoctor);
    }

    @PutMapping("/{doctorId}/status")
    public ResponseEntity<AdminDoctorDto> updateDoctorStatus(
            @PathVariable String doctorId,
            @RequestBody StatusUpdateRequest statusRequest,
            Authentication authentication
    ) {
        String adminUserId = authentication != null ? authentication.getName() : null;
        AdminDoctorDto updatedDoctor = adminDoctorService.updateDoctorStatus(
            doctorId,
            statusRequest.getStatus(),
            adminUserId,
            statusRequest.getReason()
        );
        return ResponseEntity.ok(updatedDoctor);
    }

    @DeleteMapping("/{doctorId}")
    public ResponseEntity<Void> deleteDoctor(@PathVariable String doctorId) {
        adminDoctorService.deleteDoctor(doctorId);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/admin/admindoctors/available-on-date
     * Lấy danh sách bác sĩ có lịch làm việc vào ngày cụ thể.
     * Dùng cho tính năng Reassign Appointment.
     *
     * @param date Ngày cần kiểm tra (format: yyyy-MM-dd)
     * @param specialty Chuyên khoa (optional, ưu tiên cùng chuyên khoa)
     * @param excludeDoctorId ID bác sĩ cần loại trừ (bác sĩ hiện tại của appointment)
     */
    @GetMapping("/available-on-date")
    public ResponseEntity<List<AdminDoctorDto>> getDoctorsAvailableOnDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String specialty,
            @RequestParam(required = false) String excludeDoctorId
    ) {
        List<AdminDoctorDto> doctors = adminDoctorService.getDoctorsAvailableOnDate(date, specialty, excludeDoctorId);
        return ResponseEntity.ok(doctors);
    }
}
