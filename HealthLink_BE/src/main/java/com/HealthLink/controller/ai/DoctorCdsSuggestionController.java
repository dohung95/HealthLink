package com.HealthLink.controller.ai;

import com.HealthLink.dto.ai.CdsSuggestionCreateRequest;
import com.HealthLink.dto.ai.CdsSuggestionResponse;
import com.HealthLink.dto.ai.CdsSuggestionDetailResponse;
import com.HealthLink.dto.ai.ApplyCdsDecisionRequest;
import com.HealthLink.dto.ai.CdsAuditEventResponse;
import com.HealthLink.dto.ai.CdsDecisionResponse;
import com.HealthLink.dto.ai.SubmitCdsDecisionRequest;
import com.HealthLink.service.ai.CdsApplyService;
import com.HealthLink.service.ai.CdsDecisionService;
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
    private final CdsDecisionService decisions;
    private final CdsApplyService apply;

    public DoctorCdsSuggestionController(CdsOrchestrationService service,
                                         CdsDecisionService decisions,
                                         CdsApplyService apply) {
        this.service = service;
        this.decisions = decisions;
        this.apply = apply;
    }
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

    @PostMapping("/cds-suggestions/{runId}/decision")
    public ResponseEntity<CdsDecisionResponse> submitDecision(
            @PathVariable UUID runId,
            @RequestBody SubmitCdsDecisionRequest request) {
        return ResponseEntity.ok(decisions.submit(runId, request));
    }

    @GetMapping("/cds-suggestions/{runId}/decision")
    public ResponseEntity<CdsDecisionResponse> decision(@PathVariable UUID runId) {
        return decisions.detail(runId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/cds-suggestions/{runId}/apply")
    public ResponseEntity<CdsDecisionResponse> apply(
            @PathVariable UUID runId,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestBody ApplyCdsDecisionRequest request) {
        return ResponseEntity.ok(apply.apply(runId, idempotencyKey, request));
    }

    @GetMapping("/cds-suggestions/{runId}/audit")
    public ResponseEntity<List<CdsAuditEventResponse>> audit(@PathVariable UUID runId) {
        return ResponseEntity.ok(decisions.audit(runId));
    }
}
