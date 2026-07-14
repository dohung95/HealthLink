package com.HealthLink.controller.admin;

import com.HealthLink.dto.commission.admin.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import com.HealthLink.service.admin.AdminCommissionService;

@CrossOrigin(origins = "http://localhost:63527")
@RestController
@RequestMapping("/api/admin/commission")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCommissionController {

    private final AdminCommissionService commissionService;

    @GetMapping("/dashboard")
    public ResponseEntity<AdminCommissionDashboardDto> getDashboard() {
        return ResponseEntity.ok(commissionService.getDashboard());
    }

    @GetMapping("/dashboard/monthly")
    public ResponseEntity<List<AdminMonthlyCommissionDto>> getDashboardMonthly(
            @RequestParam(defaultValue = "0") int year) {
        return ResponseEntity.ok(commissionService.getDashboardMonthly(year));
    }

    @GetMapping("/configs")
    public ResponseEntity<List<AdminCommissionConfigDto>> getAllConfigs() {
        return ResponseEntity.ok(commissionService.getAllConfigs());
    }

    @GetMapping("/configs/{id}")
    public ResponseEntity<AdminCommissionConfigDto> getConfigById(@PathVariable Integer id) {
        return ResponseEntity.ok(commissionService.getConfigById(id));
    }

    @PutMapping("/configs/{id}")
    public ResponseEntity<AdminCommissionConfigDto> updateConfig(
            @PathVariable Integer id,
            @RequestBody AdminCommissionConfigUpdateDto dto,
            Authentication authentication) {
        String adminUserId = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(commissionService.updateConfig(id, dto, adminUserId));
    }

    @GetMapping("/transactions")
    public ResponseEntity<Page<AdminCommissionTransactionDto>> getTransactions(
            @RequestParam(required = false) String recipientType,
            @RequestParam(required = false) String recipientId,
            @RequestParam(required = false) String serviceType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        AdminCommissionFilterDto filter = AdminCommissionFilterDto.builder()
            .recipientType(recipientType)
            .recipientId(recipientId)
            .serviceType(serviceType)
            .status(status)
            .dateFrom(parseDateTime(dateFrom))
            .dateTo(parseDateTime(dateTo))
            .page(page)
            .size(size)
            .sortBy(sortBy)
            .sortDir(sortDir)
            .build();

        return ResponseEntity.ok(commissionService.getTransactions(filter));
    }

    @GetMapping("/transactions/{id}")
    public ResponseEntity<AdminCommissionTransactionDto> getTransactionById(@PathVariable Integer id) {
        return ResponseEntity.ok(commissionService.getTransactionById(id));
    }

    @GetMapping("/settlements")
    public ResponseEntity<Page<AdminSettlementDto>> getSettlements(
            @RequestParam(required = false) String recipientType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        AdminCommissionFilterDto filter = AdminCommissionFilterDto.builder()
            .recipientType(recipientType)
            .status(status)
            .dateFrom(parseDateTime(dateFrom))
            .dateTo(parseDateTime(dateTo))
            .page(page)
            .size(size)
            .sortBy(sortBy)
            .sortDir(sortDir)
            .build();

        return ResponseEntity.ok(commissionService.getSettlements(filter));
    }

    @GetMapping("/settlements/{id}")
    public ResponseEntity<AdminSettlementDto> getSettlementById(@PathVariable Integer id) {
        return ResponseEntity.ok(commissionService.getSettlementById(id));
    }

    @PostMapping("/settlements")
    public ResponseEntity<AdminSettlementDto> createSettlement(@RequestBody AdminSettlementCreateDto dto) {
        return ResponseEntity.ok(commissionService.createSettlement(dto));
    }

    @PostMapping("/settlements/process")
    public ResponseEntity<AdminSettlementDto> processSettlement(@RequestBody AdminSettlementProcessDto dto) {
        return ResponseEntity.ok(commissionService.processSettlement(dto));
    }

    @GetMapping("/recipients/doctors")
    public ResponseEntity<List<AdminRecipientSummaryDto>> getDoctorSummaries(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(commissionService.getRecipientSummaries("DOCTOR", limit));
    }

    @GetMapping("/recipients/pharmacies")
    public ResponseEntity<List<AdminRecipientSummaryDto>> getPharmacySummaries(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(commissionService.getRecipientSummaries("PHARMACY", limit));
    }

    @GetMapping("/recipients/{type}/{id}/transactions")
    public ResponseEntity<List<AdminCommissionTransactionDto>> getRecipientTransactions(
            @PathVariable String type,
            @PathVariable String id,
            @RequestParam(defaultValue = "PENDING") String status) {
        return ResponseEntity.ok(
            commissionService.getPendingTransactionsByRecipient(type.toUpperCase(), id));
    }

    // ========================================================================
    // Partner Commission Management Endpoints
    // ========================================================================

    @GetMapping("/partners")
    public ResponseEntity<Page<AdminPartnerCommissionDto>> getPartnerCommissions(
            @RequestParam(defaultValue = "DOCTOR") String type,
            @RequestParam(required = false) String searchTerm,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(commissionService.getPartnerCommissions(type, searchTerm, page, size));
    }

    @GetMapping("/partners/{type}/{id}")
    public ResponseEntity<AdminPartnerCommissionDto> getPartnerCommission(
            @PathVariable String type,
            @PathVariable String id) {
        return ResponseEntity.ok(commissionService.getPartnerCommission(type, id));
    }

    @GetMapping("/partners/{type}/{id}/history")
    public ResponseEntity<AdminPartnerCommissionHistoryDto> getPartnerCommissionHistory(
            @PathVariable String type,
            @PathVariable String id) {
        return ResponseEntity.ok(commissionService.getPartnerCommissionHistory(type, id));
    }

    @PutMapping("/partners/{type}/{id}")
    public ResponseEntity<AdminPartnerCommissionDto> updatePartnerCommission(
            @PathVariable String type,
            @PathVariable String id,
            @RequestBody AdminPartnerCommissionUpdateDto dto,
            Authentication authentication) {
        String adminUserId = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(commissionService.updatePartnerCommission(type, id, dto, adminUserId));
    }

    @DeleteMapping("/partners/{type}/{id}/custom-rate")
    public ResponseEntity<Map<String, String>> removePartnerCustomCommission(
            @PathVariable String type,
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication) {
        String adminUserId = authentication != null ? authentication.getName() : null;
        String reason = body != null ? body.get("reason") : null;
        commissionService.removePartnerCustomCommission(type, id, adminUserId, reason);
        return ResponseEntity.ok(Map.of("message", "Custom commission rate removed successfully"));
    }

    private LocalDateTime parseDateTime(String input) {
        if (input == null || input.isBlank()) {
            return null;
        }

        try {
            return LocalDateTime.parse(input, DateTimeFormatter.ISO_DATE_TIME);
        } catch (DateTimeParseException ignored) {
        }

        try {
            LocalDate date = LocalDate.parse(input, DateTimeFormatter.ISO_DATE);
            return date.atStartOfDay();
        } catch (DateTimeParseException ignored) {
        }

        throw new IllegalArgumentException("Invalid date format: " + input + ". Use yyyy-MM-dd or yyyy-MM-dd'T'HH:mm:ss");
    }
}
