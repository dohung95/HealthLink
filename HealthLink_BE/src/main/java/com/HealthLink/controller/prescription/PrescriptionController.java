package com.HealthLink.controller.prescription;

import com.HealthLink.dto.prescription.PrescriptionOpenedResponse;
import com.HealthLink.dto.prescription.PrescriptionRequest;
import com.HealthLink.dto.prescription.PrescriptionResponse;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.prescription.PrescriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<PrescriptionResponse> createPrescription(
            @Valid @RequestBody PrescriptionRequest request) {
        PrescriptionResponse response = prescriptionService.createPrescription(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PrescriptionResponse> getPrescriptionById(
            @PathVariable Integer id,
            @RequestParam(required = false) String timing) {
        return ResponseEntity.ok(prescriptionService.getPrescriptionById(id, timing));
    }

    @PatchMapping("/{id}/opened")
    public ResponseEntity<PrescriptionOpenedResponse> markPrescriptionAsOpened(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String patientId = resolveUserId(userDetails);
        return ResponseEntity.ok(prescriptionService.markPrescriptionAsOpened(id, patientId));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<PrescriptionResponse>> getByPatient(
            @PathVariable String patientId) {
        return ResponseEntity.ok(prescriptionService.getPrescriptionsByPatient(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<PrescriptionResponse>> getByDoctor(
            @PathVariable String doctorId) {
        return ResponseEntity.ok(prescriptionService.getPrescriptionsByDoctor(doctorId));
    }

    private String resolveUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User", "email", userDetails.getUsername()))
                .getId();
    }
}
