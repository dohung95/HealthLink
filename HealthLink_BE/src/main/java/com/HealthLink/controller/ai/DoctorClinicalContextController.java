package com.HealthLink.controller.ai;

import com.HealthLink.dto.ai.ClinicalContextPreviewResponse;
import com.HealthLink.dto.ai.ClinicalContextSnapshotRequest;
import com.HealthLink.dto.ai.ClinicalContextSnapshotResponse;
import com.HealthLink.dto.ai.ClinicalContextUpdateRequest;
import com.HealthLink.service.ai.ClinicalContextService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/doctor/appointments/{appointmentId}/clinical-context")
public class DoctorClinicalContextController {
    private final ClinicalContextService service;

    public DoctorClinicalContextController(ClinicalContextService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ClinicalContextPreviewResponse> preview(@PathVariable Integer appointmentId) {
        return ResponseEntity.ok(service.preview(appointmentId));
    }

    @PutMapping
    public ResponseEntity<ClinicalContextPreviewResponse> update(@PathVariable Integer appointmentId,
                                                                   @Valid @RequestBody ClinicalContextUpdateRequest request) {
        return ResponseEntity.ok(service.update(appointmentId, request));
    }

    @PostMapping("/snapshots")
    public ResponseEntity<ClinicalContextSnapshotResponse> snapshot(@PathVariable Integer appointmentId,
                                                                      @Valid @RequestBody ClinicalContextSnapshotRequest request) {
        return ResponseEntity.ok(service.snapshot(appointmentId, request));
    }
}
