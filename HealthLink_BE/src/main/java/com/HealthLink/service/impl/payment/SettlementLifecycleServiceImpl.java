package com.HealthLink.service.impl.payment;

import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.Settlement;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.PartnerWalletEntryStatus;
import com.HealthLink.event.PartnerWalletBalanceChangedEvent;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.integration.paypal.PayPalPayoutResult;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.payment.PaymentSettlementRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.service.payment.PartnerWalletLedgerService;
import com.HealthLink.service.payment.SettlementLifecycleService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SettlementLifecycleServiceImpl implements SettlementLifecycleService {

    private static final String DOCTOR = "DOCTOR";
    private static final String PHARMACY = "PHARMACY";
    private static final BigDecimal MIN_REMAINING_BALANCE = new BigDecimal("10.00");

    private final PaymentSettlementRepository settlementRepository;
    private final DoctorRepository doctorRepository;
    private final PharmacyRepository pharmacyRepository;
    private final PartnerWalletLedgerService walletLedgerService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public Settlement beginWithdrawal(String partnerType, String partnerId, String partnerName,
                                      BigDecimal amount, String paypalEmail, String notes, String requestId) {
        PartnerWallet partner = lockPartner(partnerType, partnerId);
        String clientRequestId = requestId == null || requestId.isBlank() ? UUID.randomUUID().toString() : requestId;
        Settlement existing = settlementRepository
                .findByRecipientTypeAndRecipientIdAndClientRequestIdForUpdate(partnerType, partnerId, clientRequestId)
                .orElse(null);
        if (existing != null) {
            existing.setPayoutSubmissionRequired(false);
            return existing;
        }
        validateWithdrawal(partner.balance(), amount, paypalEmail, partner.paypalEmail());
        LocalDateTime now = LocalDateTime.now();
        Settlement settlement = settlementRepository.save(Settlement.builder()
                .settlementNumber("STL-" + UUID.randomUUID())
                .clientRequestId(clientRequestId)
                .recipientType(partnerType)
                .recipientId(partnerId)
                .recipientName(partnerName)
                .grossAmount(amount)
                .commissionAmount(BigDecimal.ZERO)
                .netAmount(amount)
                .status("PROCESSING")
                .paymentMethod("PAYPAL")
                .paypalEmail(paypalEmail)
                .periodStart(now)
                .periodEnd(now)
                .notes(notes)
                .build());
        walletLedgerService.createWithdrawal(settlement);
        settlement.setPayoutSubmissionRequired(true);
        publishWalletBalanceChanged(partner, amount.negate(), partner.balance().subtract(amount),
                "Your withdrawal of $" + amount.toPlainString() + " has been reserved.");
        return settlement;
    }

    @Override
    @Transactional
    public Settlement attachPayPalBatch(Integer settlementId, PayPalPayoutResult result) {
        Settlement settlement = settlementForUpdate(settlementId);
        if (!"PROCESSING".equalsIgnoreCase(settlement.getStatus())) {
            return settlement;
        }
        settlement.setPayoutBatchId(result.getPayoutBatchId());
        settlement.setExternalStatus(result.getStatus());
        settlement.setLastReconciledAt(LocalDateTime.now());
        if (result.getMessage() != null && !result.getMessage().isBlank()) {
            settlement.setNotes(result.getMessage());
        }
        return settlementRepository.save(settlement);
    }

    @Override
    @Transactional
    public Settlement complete(Integer settlementId, String externalStatus) {
        Settlement settlement = settlementForUpdate(settlementId);
        if (!"PROCESSING".equalsIgnoreCase(settlement.getStatus())) {
            return settlement;
        }
        LocalDateTime now = LocalDateTime.now();
        settlement.setStatus("COMPLETED");
        settlement.setExternalStatus(externalStatus);
        settlement.setCompletedAt(now);
        settlement.setProcessedAt(now);
        settlement.setLastReconciledAt(now);
        Settlement completed = settlementRepository.save(settlement);
        walletLedgerService.updateWithdrawalStatus(settlementId, PartnerWalletEntryStatus.COMPLETED);
        return completed;
    }

    @Override
    @Transactional
    public Settlement failAndReturn(Integer settlementId, String providerStatus, String reason) {
        if (!isTerminalFailure(providerStatus)) {
            throw new BadRequestException("PayPal provider status is not a confirmed terminal failure: " + providerStatus);
        }
        Settlement settlement = settlementForUpdate(settlementId);
        if (!"PROCESSING".equalsIgnoreCase(settlement.getStatus())) {
            return settlement;
        }
        PartnerWallet partner = lockPartner(settlement.getRecipientType(), settlement.getRecipientId());
        settlement.setStatus("FAILED");
        settlement.setExternalStatus(providerStatus.toUpperCase(Locale.ROOT));
        settlement.setLastReconciledAt(LocalDateTime.now());
        settlement.setNotes(reason);
        Settlement failed = settlementRepository.save(settlement);
        walletLedgerService.updateWithdrawalStatus(settlementId, PartnerWalletEntryStatus.FAILED);
        walletLedgerService.createReturn(failed, reason);
        publishWalletBalanceChanged(partner, settlement.getNetAmount(), partner.balance().add(settlement.getNetAmount()),
                "Your withdrawal of $" + settlement.getNetAmount().toPlainString() + " has been returned to your wallet.");
        return failed;
    }

    private Settlement settlementForUpdate(Integer settlementId) {
        return settlementRepository.findByIdForUpdate(settlementId)
                .orElseThrow(() -> new BadRequestException("Settlement not found: " + settlementId));
    }

    private PartnerWallet lockPartner(String partnerType, String partnerId) {
        if (DOCTOR.equals(partnerType)) {
            Doctor doctor = doctorRepository.findByIdForWalletUpdate(partnerId)
                    .orElseThrow(() -> new BadRequestException("Doctor not found: " + partnerId));
            return new PartnerWallet(doctor.getUser(), zeroIfNull(doctor.getPendingSettlement()), doctor.getPaypalEmail(),
                    "/profile-doctor?tab=wallet");
        }
        if (PHARMACY.equals(partnerType)) {
            Pharmacy pharmacy = pharmacyRepository.findByIdForWalletUpdate(partnerId)
                    .orElseThrow(() -> new BadRequestException("Pharmacy not found: " + partnerId));
            return new PartnerWallet(pharmacy.getUser(), zeroIfNull(pharmacy.getPendingSettlement()), pharmacy.getPaypalEmail(),
                    "/pharmacy-page/wallet");
        }
        throw new BadRequestException("Unsupported partner type: " + partnerType);
    }

    private void publishWalletBalanceChanged(PartnerWallet partner, BigDecimal delta, BigDecimal balance, String message) {
        if (partner.user() == null) {
            return;
        }
        String metadata = String.format("{\"delta\":\"%s\",\"balance\":\"%s\"}",
                delta.toPlainString(), balance.toPlainString());
        eventPublisher.publishEvent(new PartnerWalletBalanceChangedEvent(partner.user(),
                "Wallet balance updated", message, partner.actionUrl(), metadata));
    }

    private boolean isTerminalFailure(String providerStatus) {
        if (providerStatus == null) {
            return false;
        }
        String normalized = providerStatus.toUpperCase(Locale.ROOT);
        return "DENIED".equals(normalized) || "CANCELED".equals(normalized) || "CANCELLED".equals(normalized);
    }

    private void validateWithdrawal(BigDecimal balance, BigDecimal amount, String requestedEmail, String registeredEmail) {
        if (amount == null || amount.signum() <= 0) {
            throw new BadRequestException("Withdrawal amount must be positive.");
        }
        if (amount.compareTo(balance) > 0) {
            throw new BadRequestException("Requested amount exceeds available balance.");
        }
        if (balance.subtract(amount).compareTo(MIN_REMAINING_BALANCE) <= 0) {
            throw new BadRequestException("Remaining balance after withdrawal must be greater than $10.00.");
        }
        if (registeredEmail == null || !registeredEmail.equalsIgnoreCase(requestedEmail)) {
            throw new BadRequestException("PayPal email does not match the registered PayPal email on file.");
        }
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private record PartnerWallet(User user, BigDecimal balance, String paypalEmail, String actionUrl) {
    }
}
