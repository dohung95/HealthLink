package com.HealthLink.controller.vitalsign;

import com.HealthLink.dto.request.VitalSignRequest;
import com.HealthLink.dto.response.VitalSignResponse;
import com.HealthLink.service.vitalsign.VitalSignService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller for patient vital signs before/during consultations.
 */
@RestController
@RequestMapping("/api/vital-signs")
@RequiredArgsConstructor
public class VitalSignController {

    private final VitalSignService vitalSignService;

    @PostMapping
    public ResponseEntity<VitalSignResponse> createVitalSign(
            @RequestBody VitalSignRequest request
    ) {
        VitalSignResponse response = vitalSignService.createVitalSign(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<List<VitalSignResponse>> getByAppointment(
            @PathVariable Integer appointmentId
    ) {
        return ResponseEntity.ok(
                vitalSignService.getByAppointment(appointmentId)
        );
    }

    @GetMapping("/appointment/{appointmentId}/latest")
    public ResponseEntity<VitalSignResponse> getLatestByAppointment(
            @PathVariable Integer appointmentId
    ) {
        return ResponseEntity.ok(
                vitalSignService.getLatestByAppointment(appointmentId)
        );
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<VitalSignResponse>> getByPatient(
            @PathVariable String patientId
    ) {
        return ResponseEntity.ok(
                vitalSignService.getByPatient(patientId)
        );
    }
}