package com.HealthLink.controller.ai;

import com.HealthLink.dto.ai.GuidelineChunkAuditBatchRequest;
import com.HealthLink.service.ai.GuidelineRegistryService;
import com.HealthLink.service.impl.ai.GuidelineChunkWorkerKeyGuard;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal/ai")
public class GuidelineChunkAuditController {
    private final GuidelineChunkWorkerKeyGuard workerKeyGuard;
    private final GuidelineRegistryService registry;

    public GuidelineChunkAuditController(GuidelineChunkWorkerKeyGuard workerKeyGuard, GuidelineRegistryService registry) {
        this.workerKeyGuard = workerKeyGuard;
        this.registry = registry;
    }

    @PostMapping("/guideline-chunks")
    public ResponseEntity<Void> register(@RequestHeader(value = "X-HealthLink-Worker-Key", required = false) String workerKey,
                                         @Valid @RequestBody GuidelineChunkAuditBatchRequest request) {
        workerKeyGuard.require(workerKey);
        registry.registerChunkAudits(request.chunks());
        return ResponseEntity.noContent().build();
    }
}
