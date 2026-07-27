package com.HealthLink.controller.ai;

import com.HealthLink.dto.ai.CdsSuggestionCreateRequest;
import com.HealthLink.dto.ai.CdsSuggestionResponse;
import com.HealthLink.dto.ai.CdsSuggestionDetailResponse;
import com.HealthLink.service.ai.CdsOrchestrationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/doctor")
public class DoctorCdsSuggestionController {
    private final CdsOrchestrationService service;
    public DoctorCdsSuggestionController(CdsOrchestrationService service) { this.service = service; }
    @PostMapping("/appointments/{appointmentId}/cds-suggestions")
    public ResponseEntity<CdsSuggestionResponse> create(@PathVariable Integer appointmentId, @Valid @RequestBody CdsSuggestionCreateRequest request) {
        return ResponseEntity.accepted().body(service.create(appointmentId, request));
    }
    @GetMapping("/appointments/{appointmentId}/cds-suggestions")
    public ResponseEntity<List<CdsSuggestionDetailResponse>> list(@PathVariable Integer appointmentId) {
        return ResponseEntity.ok(service.list(appointmentId));
    }
    @GetMapping("/appointments/{appointmentId}/cds-suggestions/{runId}")
    public ResponseEntity<CdsSuggestionDetailResponse> detail(@PathVariable Integer appointmentId, @PathVariable UUID runId) {
        return ResponseEntity.ok(service.detail(appointmentId, runId));
    }
    @GetMapping("/cds-suggestions/{runId}")
    public ResponseEntity<CdsSuggestionDetailResponse> detail(@PathVariable UUID runId) {
        return ResponseEntity.ok(service.detail(runId));
    }
}
