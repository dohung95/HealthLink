package com.HealthLink.controller.admin;

import com.HealthLink.dto.admin.AdminAuditLogDto;
import com.HealthLink.dto.admin.AdminAuditLogFilterRequest;
import com.HealthLink.dto.admin.AdminAuditLogPageResponse;
import com.HealthLink.service.admin.AdminAuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@CrossOrigin(origins = "http://localhost:63527")
@RestController
@RequestMapping("/api/admin/audit-logs")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminAuditLogController {

    private final AdminAuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<AdminAuditLogPageResponse> getAuditLogs(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String targetId,
            @RequestParam(required = false) String adminUserId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(defaultValue = "1") Integer pageNumber,
            @RequestParam(defaultValue = "20") Integer pageSize,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        AdminAuditLogFilterRequest filter = AdminAuditLogFilterRequest.builder()
                .category(category)
                .actionType(actionType)
                .targetType(targetType)
                .targetId(targetId)
                .adminUserId(adminUserId)
                .startTime(startTime)
                .endTime(endTime)
                .pageNumber(pageNumber)
                .pageSize(pageSize)
                .sortBy(sortBy)
                .sortDir(sortDir)
                .build();

        AdminAuditLogPageResponse response = auditLogService.getLogs(filter);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{logId}")
    public ResponseEntity<AdminAuditLogDto> getAuditLogById(@PathVariable Long logId) {
        AdminAuditLogDto log = auditLogService.getLogById(logId);
        if (log == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(log);
    }
}
