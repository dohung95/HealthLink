package com.HealthLink.controller.admin;

import com.HealthLink.dto.commission.*;
import com.HealthLink.service.commission.CommissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

@CrossOrigin(origins = "http://localhost:63527")
@RestController
@RequestMapping("/api/admin/commission")
@RequiredArgsConstructor
public class AdminCommissionController {

    private final CommissionService commissionService;

    @GetMapping("/dashboard")
    public ResponseEntity<CommissionDashboardDto> getDashboard() {
        return ResponseEntity.ok(commissionService.getDashboard());
    }

    @GetMapping("/configs")
    public ResponseEntity<List<CommissionConfigDto>> getAllConfigs() {
        return ResponseEntity.ok(commissionService.getAllConfigs());
    }

    @GetMapping("/configs/{id}")
    public ResponseEntity<CommissionConfigDto> getConfigById(@PathVariable Integer id) {
        return ResponseEntity.ok(commissionService.getConfigById(id));
    }

    @PutMapping("/configs/{id}")
    public ResponseEntity<CommissionConfigDto> updateConfig(
            @PathVariable Integer id,
            @RequestBody CommissionConfigUpdateDto dto) {
        return ResponseEntity.ok(commissionService.updateConfig(id, dto));
    }

    @GetMapping("/transactions")
    public ResponseEntity<Page<CommissionTransactionDto>> getTransactions(
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

        CommissionFilterDto filter = CommissionFilterDto.builder()
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
    public ResponseEntity<CommissionTransactionDto> getTransactionById(@PathVariable Integer id) {
        return ResponseEntity.ok(commissionService.getTransactionById(id));
    }

    @GetMapping("/settlements")
    public ResponseEntity<Page<SettlementDto>> getSettlements(
            @RequestParam(required = false) String recipientType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        CommissionFilterDto filter = CommissionFilterDto.builder()
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
    public ResponseEntity<SettlementDto> getSettlementById(@PathVariable Integer id) {
        return ResponseEntity.ok(commissionService.getSettlementById(id));
    }

    @PostMapping("/settlements")
    public ResponseEntity<SettlementDto> createSettlement(@RequestBody SettlementCreateDto dto) {
        return ResponseEntity.ok(commissionService.createSettlement(dto));
    }

    @PostMapping("/settlements/process")
    public ResponseEntity<SettlementDto> processSettlement(@RequestBody SettlementProcessDto dto) {
        return ResponseEntity.ok(commissionService.processSettlement(dto));
    }

    @GetMapping("/recipients/doctors")
    public ResponseEntity<List<RecipientSummaryDto>> getDoctorSummaries(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(commissionService.getRecipientSummaries("DOCTOR", limit));
    }

    @GetMapping("/recipients/pharmacies")
    public ResponseEntity<List<RecipientSummaryDto>> getPharmacySummaries(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(commissionService.getRecipientSummaries("PHARMACY", limit));
    }

    @GetMapping("/recipients/{type}/{id}/transactions")
    public ResponseEntity<List<CommissionTransactionDto>> getRecipientTransactions(
            @PathVariable String type,
            @PathVariable String id,
            @RequestParam(defaultValue = "PENDING") String status) {
        return ResponseEntity.ok(
            commissionService.getPendingTransactionsByRecipient(type.toUpperCase(), id));
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
