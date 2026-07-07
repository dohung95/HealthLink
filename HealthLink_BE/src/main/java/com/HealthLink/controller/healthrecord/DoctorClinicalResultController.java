package com.HealthLink.controller.healthrecord;

import com.HealthLink.dto.request.healthrecord.ClinicalResultUpsertRequest;
import com.HealthLink.dto.response.healthrecord.MedicalDocumentResponse;
import com.HealthLink.service.healthrecord.DoctorClinicalResultService;
import com.HealthLink.utility.DoctorSecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctor")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DOCTOR')")
public class DoctorClinicalResultController {

    private final DoctorClinicalResultService clinicalResultService;
    private final DoctorSecurityUtils securityUtils;

    @GetMapping("/appointments/{appointmentId}/clinical-results")
    public ResponseEntity<List<MedicalDocumentResponse>> getAppointmentResults(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer appointmentId
    ) {
        String doctorId = securityUtils.resolveDoctor(userDetails).getDoctorId();
        return ResponseEntity.ok(clinicalResultService.getAppointmentResults(appointmentId, doctorId));
    }

    @PostMapping(
            value = "/appointments/{appointmentId}/clinical-results",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<MedicalDocumentResponse> createResult(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer appointmentId,
            @Valid @ModelAttribute ClinicalResultUpsertRequest request
    ) {
        String doctorId = securityUtils.resolveDoctor(userDetails).getDoctorId();
        return ResponseEntity.ok(clinicalResultService.createResult(appointmentId, doctorId, request));
    }

    @PutMapping(
            value = "/clinical-results/{documentId}",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<MedicalDocumentResponse> updateResult(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer documentId,
            @Valid @ModelAttribute ClinicalResultUpsertRequest request
    ) {
        String doctorId = securityUtils.resolveDoctor(userDetails).getDoctorId();
        return ResponseEntity.ok(clinicalResultService.updateResult(documentId, doctorId, request));
    }

    @PostMapping("/clinical-results/{documentId}/publish")
    public ResponseEntity<MedicalDocumentResponse> publishResult(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer documentId
    ) {
        String doctorId = securityUtils.resolveDoctor(userDetails).getDoctorId();
        return ResponseEntity.ok(clinicalResultService.publishResult(documentId, doctorId));
    }

    @DeleteMapping("/clinical-results/{documentId}")
    public ResponseEntity<Void> deleteResult(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer documentId
    ) {
        String doctorId = securityUtils.resolveDoctor(userDetails).getDoctorId();
        clinicalResultService.deleteResult(documentId, doctorId);
        return ResponseEntity.noContent().build();
    }
}
