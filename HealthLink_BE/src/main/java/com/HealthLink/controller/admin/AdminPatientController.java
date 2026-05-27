package com.HealthLink.controller.admin;

import com.HealthLink.dto.admin.AdminPatientDto;
import com.HealthLink.dto.admin.AdminPatientPageResponse;
import com.HealthLink.dto.admin.AdminPatientUpdateDto;
import com.HealthLink.dto.admin.StatusUpdateRequest;
import com.HealthLink.service.admin.AdminPatientService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "http://localhost:63527")
@RestController
@RequestMapping("/api/admin/adminpatients")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPatientController {

    private final AdminPatientService adminPatientService;

    public AdminPatientController(AdminPatientService adminPatientService) {
        this.adminPatientService = adminPatientService;
    }

    @GetMapping
    public ResponseEntity<AdminPatientPageResponse> getPatients(
            @RequestParam(defaultValue = "1") int pageNumber,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(defaultValue = "") String searchTerm,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "newest") String sortBy
    ) {
        AdminPatientPageResponse response = adminPatientService.getPatients(pageNumber, pageSize, searchTerm, status, sortBy);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{patientId}")
    public ResponseEntity<AdminPatientDto> updatePatient(
            @PathVariable String patientId,
            @RequestBody AdminPatientUpdateDto updateDto
    ) {
        AdminPatientDto updatedPatient = adminPatientService.updatePatient(patientId, updateDto);
        return ResponseEntity.ok(updatedPatient);
    }

    @PutMapping("/{patientId}/status")
    public ResponseEntity<AdminPatientDto> updatePatientStatus(
            @PathVariable String patientId,
            @RequestBody StatusUpdateRequest statusRequest
    ) {
        AdminPatientDto updatedPatient = adminPatientService.updatePatientStatus(patientId, statusRequest.getStatus());
        return ResponseEntity.ok(updatedPatient);
    }
}
