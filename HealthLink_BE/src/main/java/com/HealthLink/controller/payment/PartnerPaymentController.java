package com.HealthLink.controller.payment;

import com.HealthLink.dto.payment.CommissionTransactionResponse;
import com.HealthLink.dto.payment.PartnerBalanceResponse;
import com.HealthLink.dto.payment.PartnerWalletEntryFilter;
import com.HealthLink.dto.payment.PartnerWalletEntryResponse;
import com.HealthLink.dto.payment.SettlementRequest;
import com.HealthLink.dto.payment.SettlementResponse;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.service.payment.CommissionService;
import com.HealthLink.service.payment.PartnerWalletQueryService;
import com.HealthLink.service.payment.SettlementService;
import com.HealthLink.utility.payment.PartnerAccessValidator;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Partner-facing payment controller for doctor and pharmacy users.
 */
@Slf4j
@RestController
@RequestMapping("/api/payment/partner")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('DOCTOR', 'PHARMACY')")
public class PartnerPaymentController {

    private static final BigDecimal MIN_REMAINING_BALANCE = new BigDecimal("10.00");
    private static final BigDecimal MIN_WITHDRAWAL_AMOUNT = new BigDecimal("0.01");

    private static final String PARTNER_TYPE_DOCTOR = "DOCTOR";
    private static final String PARTNER_TYPE_PHARMACY = "PHARMACY";

    private final CommissionService commissionService;
    private final SettlementService settlementService;
    private final PartnerWalletQueryService walletQueryService;
    private final PartnerAccessValidator partnerAccessValidator;
    private final DoctorRepository doctorRepository;
    private final PharmacyRepository pharmacyRepository;

    @GetMapping("/{partnerId}/balance")
    public ResponseEntity<PartnerBalanceResponse> getPartnerBalance(
            @PathVariable String partnerId,
            @RequestParam String type) {

        log.info("GET partner balance: partnerId={}, type={}", partnerId, type);
        partnerAccessValidator.assertPartnerAccess(partnerId, type);

        PartnerBalanceResponse response;
        if (PARTNER_TYPE_DOCTOR.equalsIgnoreCase(type)) {
            response = buildDoctorBalance(partnerId);
        } else if (PARTNER_TYPE_PHARMACY.equalsIgnoreCase(type)) {
            response = buildPharmacyBalance(partnerId);
        } else {
            throw new BadRequestException(
                    "Invalid partner type: '" + type + "'. Accepted values: DOCTOR, PHARMACY");
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{partnerId}/transactions")
    public ResponseEntity<List<CommissionTransactionResponse>> getPartnerTransactions(
            @PathVariable String partnerId) {

        log.info("GET partner commission transactions: partnerId={}", partnerId);
        partnerAccessValidator.assertPartnerAccess(partnerId, null);

        List<CommissionTransactionResponse> transactions =
                commissionService.getTransactionsByRecipient(partnerId);

        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/{partnerId}/wallet-entries")
    public ResponseEntity<Page<PartnerWalletEntryResponse>> getPartnerWalletEntries(
            @PathVariable String partnerId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "ALL") String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        partnerAccessValidator.assertPartnerAccess(partnerId, null);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        PartnerWalletEntryFilter filter = PartnerWalletEntryFilter.builder()
                .search(search)
                .type(type)
                .status(status)
                .from(from)
                .to(to)
                .build();
        return ResponseEntity.ok(walletQueryService.getWalletEntries(partnerId, filter, pageable));
    }

    @PostMapping("/{partnerId}/settle")
    public ResponseEntity<SettlementResponse> requestSettlement(
            @PathVariable String partnerId,
            @RequestParam String type,
            @Valid @RequestBody SettlementRequest request) {

        log.info("POST on-demand settlement: partnerId={}, type={}, amount={}",
                partnerId, type, request.getAmount());
        partnerAccessValidator.assertPartnerAccess(partnerId, type);

        SettlementResponse response;
        if (PARTNER_TYPE_DOCTOR.equalsIgnoreCase(type)) {
            response = settlementService.withdrawDoctorEarnings(partnerId, request);
        } else if (PARTNER_TYPE_PHARMACY.equalsIgnoreCase(type)) {
            response = settlementService.withdrawPharmacyEarnings(partnerId, request);
        } else {
            throw new BadRequestException(
                    "Invalid partner type: '" + type + "'. Accepted values: DOCTOR, PHARMACY");
        }

        log.info("Settlement initiated: settlementId={}, settlementNumber={}, status={}",
                response.getSettlementId(), response.getSettlementNumber(), response.getStatus());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{partnerId}/settlements")
    public ResponseEntity<List<SettlementResponse>> getPartnerSettlements(
            @PathVariable String partnerId) {

        log.info("GET partner settlement history: partnerId={}", partnerId);
        partnerAccessValidator.assertPartnerAccess(partnerId, null);

        List<SettlementResponse> history = settlementService.getSettlementHistory(partnerId);
        return ResponseEntity.ok(history);
    }

    private PartnerBalanceResponse buildDoctorBalance(String doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new BadRequestException("Doctor not found with ID: " + doctorId));

        BigDecimal pending = safeBalance(doctor.getPendingSettlement());
        BigDecimal totalEarning = safeBalance(doctor.getTotalEarnings());
        boolean eligible = pending.subtract(MIN_WITHDRAWAL_AMOUNT).compareTo(MIN_REMAINING_BALANCE) > 0;

        return PartnerBalanceResponse.builder()
                .partnerId(doctorId)
                .partnerType(PARTNER_TYPE_DOCTOR)
                .partnerName(doctor.getFullName())
                .pendingBalance(pending)
                .availableBalance(pending)
                .totalEarnings(totalEarning)
                .eligibleForWithdrawal(eligible)
                .withdrawalStatus(eligible
                        ? "Eligible for withdrawal. You must keep more than $" + MIN_REMAINING_BALANCE.toPlainString()
                        + " after withdrawing. Current balance: $" + pending.toPlainString()
                        : String.format("Insufficient balance. You need more than $%.2f to withdraw while keeping over $%.2f remaining. Current: $%.2f",
                                MIN_REMAINING_BALANCE.add(MIN_WITHDRAWAL_AMOUNT), MIN_REMAINING_BALANCE, pending))
                .build();
    }

    private PartnerBalanceResponse buildPharmacyBalance(String pharmacyId) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new BadRequestException("Pharmacy not found with ID: " + pharmacyId));

        BigDecimal pending = safeBalance(pharmacy.getPendingSettlement());
        BigDecimal totalEarning = safeBalance(pharmacy.getTotalEarnings());
        boolean eligible = pending.subtract(MIN_WITHDRAWAL_AMOUNT).compareTo(MIN_REMAINING_BALANCE) > 0;

        return PartnerBalanceResponse.builder()
                .partnerId(pharmacyId)
                .partnerType(PARTNER_TYPE_PHARMACY)
                .partnerName(pharmacy.getName())
                .pendingBalance(pending)
                .availableBalance(pending)
                .totalEarnings(totalEarning)
                .eligibleForWithdrawal(eligible)
                .withdrawalStatus(eligible
                        ? "Eligible for withdrawal. You must keep more than $" + MIN_REMAINING_BALANCE.toPlainString()
                        + " after withdrawing. Current balance: $" + pending.toPlainString()
                        : String.format("Insufficient balance. You need more than $%.2f to withdraw while keeping over $%.2f remaining. Current: $%.2f",
                                MIN_REMAINING_BALANCE.add(MIN_WITHDRAWAL_AMOUNT), MIN_REMAINING_BALANCE, pending))
                .build();
    }

    private BigDecimal safeBalance(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
