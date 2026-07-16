package com.HealthLink.service.impl.payment;

import com.HealthLink.dto.payment.SettlementRequest;
import com.HealthLink.dto.payment.SettlementResponse;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.Settlement;
import com.HealthLink.entity.User;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.integration.paypal.PayPalPayoutClient;
import com.HealthLink.integration.paypal.PayPalPayoutResult;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.payment.PaymentSettlementRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.service.payment.PartnerWithdrawalSecurityService;
import com.HealthLink.service.payment.PartnerWithdrawalSecurityService.PinPolicy;
import com.HealthLink.service.payment.SettlementLifecycleService;
import com.HealthLink.service.payment.SettlementService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

/** Coordinates a self-service partner withdrawal without holding a database transaction over PayPal I/O. */
@Service
@RequiredArgsConstructor
public class SettlementServiceImpl implements SettlementService {

    private final PaymentSettlementRepository settlementRepository;
    private final DoctorRepository doctorRepository;
    private final PharmacyRepository pharmacyRepository;
    private final UserRepository userRepository;
    private final PartnerWithdrawalSecurityService withdrawalSecurityService;
    private final SettlementLifecycleService lifecycleService;
    private final PayPalPayoutClient payPalPayoutClient;

    @Override
    public SettlementResponse withdrawDoctorEarnings(String doctorId, SettlementRequest request) {
        User user = userRepository.findById(doctorId)
                .orElseThrow(() -> new BadRequestException("User not found with ID: " + doctorId));
        withdrawalSecurityService.verifyForWithdrawal(user, request.getPin(), PinPolicy.REQUIRED_IF_CONFIGURED);
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new BadRequestException("Doctor not found with ID: " + doctorId));
        Settlement settlement = lifecycleService.beginWithdrawal("DOCTOR", doctorId, doctor.getFullName(),
                request.getAmount(), request.getPaypalEmail(), request.getNotes(), requestIdFor(request));
        if (!settlement.isPayoutSubmissionRequired()) {
            return toResponse(settlement);
        }
        return submitPayPalPayout(settlement);
    }

    @Override
    public SettlementResponse withdrawPharmacyEarnings(String pharmacyId, SettlementRequest request) {
        User user = userRepository.findById(pharmacyId)
                .orElseThrow(() -> new BadRequestException("User not found with ID: " + pharmacyId));
        withdrawalSecurityService.verifyForWithdrawal(user, request.getPin(), PinPolicy.REQUIRED);
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new BadRequestException("Pharmacy not found with ID: " + pharmacyId));
        Settlement settlement = lifecycleService.beginWithdrawal("PHARMACY", pharmacyId, pharmacy.getName(),
                request.getAmount(), request.getPaypalEmail(), request.getNotes(), requestIdFor(request));
        if (!settlement.isPayoutSubmissionRequired()) {
            return toResponse(settlement);
        }
        return submitPayPalPayout(settlement);
    }

    private SettlementResponse submitPayPalPayout(Settlement settlement) {
        PayPalPayoutResult result;
        try {
            result = payPalPayoutClient.createPayout(settlement);
        } catch (Exception ex) {
            result = PayPalPayoutResult.builder().status("UNKNOWN")
                    .message("PayPal submission outcome is unknown: " + ex.getMessage()).build();
        }

        Settlement persisted = lifecycleService.attachPayPalBatch(settlement.getSettlementId(), result);
        String status = result.getStatus() == null ? "UNKNOWN" : result.getStatus().toUpperCase(Locale.ROOT);
        if ("SUCCESS".equals(status)) {
            persisted = lifecycleService.complete(settlement.getSettlementId(), status);
        } else if ("DENIED".equals(status) || "CANCELED".equals(status) || "CANCELLED".equals(status)) {
            String reason = result.getMessage() == null ? "PayPal payout " + status : result.getMessage();
            persisted = lifecycleService.failAndReturn(settlement.getSettlementId(), status, reason);
        }
        return toResponse(persisted);
    }

    private String requestIdFor(SettlementRequest request) {
        return request.getRequestId() == null || request.getRequestId().isBlank()
                ? UUID.randomUUID().toString()
                : request.getRequestId();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SettlementResponse> getSettlementHistory(String recipientId) {
        return settlementRepository.findByRecipientIdOrderByCreatedAtDesc(recipientId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    private SettlementResponse toResponse(Settlement settlement) {
        return SettlementResponse.builder()
                .settlementId(settlement.getSettlementId())
                .settlementNumber(settlement.getSettlementNumber())
                .recipientType(settlement.getRecipientType())
                .recipientId(settlement.getRecipientId())
                .recipientName(settlement.getRecipientName())
                .grossAmount(settlement.getGrossAmount())
                .commissionAmount(settlement.getCommissionAmount())
                .netAmount(settlement.getNetAmount())
                .status(settlement.getStatus())
                .paymentMethod(settlement.getPaymentMethod())
                .paypalEmail(settlement.getPaypalEmail())
                .periodStart(settlement.getPeriodStart())
                .periodEnd(settlement.getPeriodEnd())
                .processedAt(settlement.getProcessedAt())
                .completedAt(settlement.getCompletedAt())
                .payoutBatchId(settlement.getPayoutBatchId())
                .externalStatus(settlement.getExternalStatus())
                .lastReconciledAt(settlement.getLastReconciledAt())
                .notes(settlement.getNotes())
                .createdAt(settlement.getCreatedAt())
                .build();
    }
}
