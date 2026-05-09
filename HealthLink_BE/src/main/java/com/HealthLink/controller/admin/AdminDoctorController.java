package com.HealthLink.controller.admin;

import com.HealthLink.dto.admin.*;
import com.HealthLink.service.admin.AdminDoctorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:63527")
@RestController
@RequestMapping("/api/admin/admindoctors")
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
            @RequestBody StatusUpdateRequest statusRequest
    ) {
        AdminDoctorDto updatedDoctor = adminDoctorService.updateDoctorStatus(doctorId, statusRequest.getStatus());
        return ResponseEntity.ok(updatedDoctor);
    }

    @DeleteMapping("/{doctorId}")
    public ResponseEntity<Void> deleteDoctor(@PathVariable String doctorId) {
        adminDoctorService.deleteDoctor(doctorId);
        return ResponseEntity.noContent().build();
    }
}
