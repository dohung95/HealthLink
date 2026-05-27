package com.HealthLink.controller.admin;

import com.HealthLink.dto.admin.AdminMedicalRecordPatientPageResponse;
import com.HealthLink.dto.admin.AdminMedicalRecordStatsDto;
import com.HealthLink.dto.admin.AdminPatientMedicalHistoryDto;
import com.HealthLink.dto.admin.AdminPrescriptionDto;
import com.HealthLink.service.admin.AdminMedicalRecordService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/adminmedicalrecords")
@CrossOrigin(origins = "http://localhost:5173")
@PreAuthorize("hasRole('ADMIN')")
public class AdminMedicalRecordController {

    private final AdminMedicalRecordService medicalRecordService;

    public AdminMedicalRecordController(AdminMedicalRecordService medicalRecordService) {
        this.medicalRecordService = medicalRecordService;
    }

    @GetMapping("/stats")
    public ResponseEntity<AdminMedicalRecordStatsDto> getStats() {
        return ResponseEntity.ok(medicalRecordService.getStats());
    }

    @GetMapping("/patients")
    public ResponseEntity<AdminMedicalRecordPatientPageResponse> getPatients(
            @RequestParam(defaultValue = "1") int pageNumber,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String searchTerm) {
        return ResponseEntity.ok(medicalRecordService.getPatients(pageNumber, pageSize, searchTerm));
    }

    @GetMapping("/patient/{patientId}/details")
    public ResponseEntity<AdminPatientMedicalHistoryDto> getPatientMedicalHistory(
            @PathVariable String patientId) {
        return ResponseEntity.ok(medicalRecordService.getPatientMedicalHistory(patientId));
    }

    @GetMapping("/patient/{patientId}/prescriptions")
    public ResponseEntity<List<AdminPrescriptionDto>> getPatientPrescriptions(
            @PathVariable String patientId) {
        return ResponseEntity.ok(medicalRecordService.getPatientPrescriptions(patientId));
    }
}
