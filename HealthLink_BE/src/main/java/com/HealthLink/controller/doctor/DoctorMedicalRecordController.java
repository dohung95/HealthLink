package com.HealthLink.controller.doctor;

import com.HealthLink.dto.admin.AdminPatientMedicalHistoryDto;
import com.HealthLink.dto.admin.AdminPrescriptionDto;
import com.HealthLink.service.admin.AdminMedicalRecordService;
import com.HealthLink.utility.DoctorSecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctor/medicalrecords")
@PreAuthorize("hasRole('DOCTOR')")
public class DoctorMedicalRecordController {

    private final AdminMedicalRecordService medicalRecordService;
    private final DoctorSecurityUtils securityUtils;

    public DoctorMedicalRecordController(AdminMedicalRecordService medicalRecordService,
                                          DoctorSecurityUtils securityUtils) {
        this.medicalRecordService = medicalRecordService;
        this.securityUtils = securityUtils;
    }

    @GetMapping("/patient/{patientId}/details")
    public ResponseEntity<AdminPatientMedicalHistoryDto> getPatientMedicalHistory(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String patientId) {
        securityUtils.resolveDoctor(userDetails);
        return ResponseEntity.ok(medicalRecordService.getPatientMedicalHistory(patientId));
    }

    @GetMapping("/patient/{patientId}/prescriptions")
    public ResponseEntity<List<AdminPrescriptionDto>> getPatientPrescriptions(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String patientId) {
        securityUtils.resolveDoctor(userDetails);
        return ResponseEntity.ok(medicalRecordService.getPatientPrescriptions(patientId));
    }
}
