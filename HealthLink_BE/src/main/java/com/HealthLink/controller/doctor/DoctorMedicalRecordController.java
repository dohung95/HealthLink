package com.HealthLink.controller.doctor;

import com.HealthLink.dto.admin.AdminPatientMedicalHistoryDto;
import com.HealthLink.dto.admin.AdminPrescriptionDto;
import com.HealthLink.service.admin.AdminMedicalRecordService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctor/medicalrecords")
@PreAuthorize("hasRole('DOCTOR')")
public class DoctorMedicalRecordController {

    private final AdminMedicalRecordService medicalRecordService;

    public DoctorMedicalRecordController(AdminMedicalRecordService medicalRecordService) {
        this.medicalRecordService = medicalRecordService;
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
