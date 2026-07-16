package com.HealthLink.controller.admin;

import com.HealthLink.dto.admin.financial.*;
import com.HealthLink.service.admin.AdminFinancialService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/financial")
@CrossOrigin(origins = "http://localhost:5173")
@PreAuthorize("hasRole('ADMIN')")
public class AdminFinancialController {

    private final AdminFinancialService financialService;

    public AdminFinancialController(AdminFinancialService financialService) {
        this.financialService = financialService;
    }

    /**
     * Get financial overview statistics
     * GET /api/admin/financial/overview
     */
    @GetMapping("/overview")
    public ResponseEntity<FinancialOverviewDto> getFinancialOverview(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        return ResponseEntity.ok(financialService.getFinancialOverview(year, month));
    }

    /**
     * Get paginated transactions list
     * GET /api/admin/financial/transactions
     */
    @GetMapping("/transactions")
    public ResponseEntity<FinancialTransactionPageDto> getTransactions(
            @RequestParam(defaultValue = "1") int pageNumber,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String transactionType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String searchTerm) {

        return ResponseEntity.ok(financialService.getTransactions(
                pageNumber, pageSize, status, transactionType, fromDate, toDate, searchTerm));
    }

    /**
     * Get revenue by day for a specific month
     * GET /api/admin/financial/revenue-by-day
     */
    @GetMapping("/revenue-by-day")
    public ResponseEntity<RevenueByDayDto> getRevenueByDay(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        return ResponseEntity.ok(financialService.getRevenueByDay(year, month));
    }

    /**
     * Get revenue by week for a specific month
     * GET /api/admin/financial/revenue-by-week
     */
    @GetMapping("/revenue-by-week")
    public ResponseEntity<RevenueByWeekDto> getRevenueByWeek(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        return ResponseEntity.ok(financialService.getRevenueByWeek(year, month));
    }
}
