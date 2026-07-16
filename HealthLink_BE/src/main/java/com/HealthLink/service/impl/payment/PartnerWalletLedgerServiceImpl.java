package com.HealthLink.service.impl.payment;

import com.HealthLink.entity.CommissionTransaction;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.PartnerWalletEntry;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.Settlement;
import com.HealthLink.entity.enums.PartnerWalletEntryStatus;
import com.HealthLink.entity.enums.PartnerWalletEntryType;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.payment.PartnerWalletEntryRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.service.payment.PartnerWalletLedgerService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PartnerWalletLedgerServiceImpl implements PartnerWalletLedgerService {

    private static final String DOCTOR = "DOCTOR";
    private static final String PHARMACY = "PHARMACY";

    private final PartnerWalletEntryRepository entryRepository;
    private final DoctorRepository doctorRepository;
    private final PharmacyRepository pharmacyRepository;

    @Override
    @Transactional
    public void recordPendingEarning(CommissionTransaction tx) {
        String key = earningKey(tx);
        if (entryRepository.findByIdempotencyKey(key).isPresent()) {
            return;
        }

        Object partner = lockPartner(tx.getRecipientType(), tx.getRecipientId());
        if (entryRepository.findByIdempotencyKey(key).isPresent()) {
            return;
        }
        addTotalEarnings(partner, amountOf(tx));
        savePartner(partner);
        entryRepository.save(transactionEntry(tx, PartnerWalletEntryType.EARNING,
                PartnerWalletEntryStatus.PENDING, amountOf(tx), key, "Pending earning"));
    }

    @Override
    @Transactional
    public void vestEarning(CommissionTransaction tx) {
        PartnerWalletEntry entry = entryRepository.findByIdempotencyKey(earningKey(tx)).orElse(null);
        if (entry == null || entry.getStatus() != PartnerWalletEntryStatus.PENDING) {
            return;
        }

        Object partner = lockPartner(tx.getRecipientType(), tx.getRecipientId());
        entry = entryRepository.findByIdempotencyKey(earningKey(tx)).orElse(null);
        if (entry == null || entry.getStatus() != PartnerWalletEntryStatus.PENDING) {
            return;
        }
        addPendingSettlement(partner, amountOf(tx));
        savePartner(partner);
        entry.setStatus(PartnerWalletEntryStatus.VESTED);
        entryRepository.save(entry);
    }

    @Override
    @Transactional
    public void cancelPendingEarning(CommissionTransaction tx) {
        PartnerWalletEntry entry = entryRepository.findByIdempotencyKey(earningKey(tx)).orElse(null);
        if (entry == null || entry.getStatus() != PartnerWalletEntryStatus.PENDING) {
            return;
        }

        lockPartner(tx.getRecipientType(), tx.getRecipientId());
        entry = entryRepository.findByIdempotencyKey(earningKey(tx)).orElse(null);
        if (entry == null || entry.getStatus() != PartnerWalletEntryStatus.PENDING) {
            return;
        }
        entry.setStatus(PartnerWalletEntryStatus.CANCELLED);
        entryRepository.save(entry);
    }

    @Override
    @Transactional
    public void recordPatientRefund(CommissionTransaction tx, String previousStatus) {
        if ("PENDING".equals(previousStatus)) {
            cancelPendingEarning(tx);
            return;
        }
        if (!"VESTED".equals(previousStatus) && !"SETTLED".equals(previousStatus)) {
            return;
        }

        String key = refundKey(tx);
        if (entryRepository.findByIdempotencyKey(key).isPresent()) {
            return;
        }

        BigDecimal refundAmount = amountOf(tx).negate();
        Object partner = lockPartner(tx.getRecipientType(), tx.getRecipientId());
        if (entryRepository.findByIdempotencyKey(key).isPresent()) {
            return;
        }
        addPendingSettlement(partner, refundAmount);
        savePartner(partner);
        entryRepository.save(transactionEntry(tx, PartnerWalletEntryType.REFUND,
                PartnerWalletEntryStatus.REFUNDED, refundAmount, key, "Patient refund"));
    }

    @Override
    @Transactional
    public PartnerWalletEntry createWithdrawal(Settlement settlement) {
        String key = withdrawalKey(settlement);
        PartnerWalletEntry existing = entryRepository.findByIdempotencyKey(key).orElse(null);
        if (existing != null) {
            return existing;
        }

        Object partner = lockPartner(settlement.getRecipientType(), settlement.getRecipientId());
        existing = entryRepository.findByIdempotencyKey(key).orElse(null);
        if (existing != null) {
            return existing;
        }
        BigDecimal amount = amountOf(settlement).negate();
        addPendingSettlement(partner, amount);
        savePartner(partner);
        return entryRepository.save(settlementEntry(settlement, PartnerWalletEntryType.WITHDRAWAL,
                PartnerWalletEntryStatus.PROCESSING, amount, key, "Withdrawal processing"));
    }

    @Override
    @Transactional
    public PartnerWalletEntry updateWithdrawalStatus(Integer settlementId, PartnerWalletEntryStatus status) {
        PartnerWalletEntry entry = withdrawalFor(settlementId);
        if (entry.getStatus() == status || isTerminal(entry.getStatus())) {
            return entry;
        }
        entry.setStatus(status);
        return entryRepository.save(entry);
    }

    @Override
    @Transactional
    public PartnerWalletEntry createReturn(Settlement settlement, String reason) {
        String key = returnKey(settlement);
        PartnerWalletEntry existing = entryRepository.findByIdempotencyKey(key).orElse(null);
        if (existing != null) {
            return existing;
        }

        Object partner = lockPartner(settlement.getRecipientType(), settlement.getRecipientId());
        existing = entryRepository.findByIdempotencyKey(key).orElse(null);
        if (existing != null) {
            return existing;
        }
        BigDecimal amount = amountOf(settlement);
        addPendingSettlement(partner, amount);
        savePartner(partner);
        return entryRepository.save(settlementEntry(settlement, PartnerWalletEntryType.RETURN,
                PartnerWalletEntryStatus.RETURNED, amount, key, reason));
    }

    private PartnerWalletEntry withdrawalFor(Integer settlementId) {
        List<PartnerWalletEntry> entries = entryRepository.findBySettlementIdAndEntryType(
                settlementId, PartnerWalletEntryType.WITHDRAWAL);
        if (entries.isEmpty()) {
            throw new BadRequestException("Withdrawal ledger entry not found for settlement: " + settlementId);
        }
        return entries.getFirst();
    }

    private PartnerWalletEntry transactionEntry(CommissionTransaction tx, PartnerWalletEntryType type,
                                                PartnerWalletEntryStatus status, BigDecimal amount,
                                                String key, String description) {
        return PartnerWalletEntry.builder()
                .partnerType(tx.getRecipientType())
                .partnerId(tx.getRecipientId())
                .entryType(type)
                .status(status)
                .amount(amount)
                .commissionTransactionId(tx.getTransactionId())
                .appointmentId(tx.getAppointmentId())
                .pharmacyOrderId(tx.getPharmacyOrderId())
                .idempotencyKey(key)
                .description(description)
                .effectiveAt(LocalDateTime.now())
                .build();
    }

    private PartnerWalletEntry settlementEntry(Settlement settlement, PartnerWalletEntryType type,
                                               PartnerWalletEntryStatus status, BigDecimal amount,
                                               String key, String description) {
        return PartnerWalletEntry.builder()
                .partnerType(settlement.getRecipientType())
                .partnerId(settlement.getRecipientId())
                .entryType(type)
                .status(status)
                .amount(amount)
                .settlementId(settlement.getSettlementId())
                .idempotencyKey(key)
                .description(description)
                .effectiveAt(LocalDateTime.now())
                .build();
    }

    private Object lockPartner(String partnerType, String partnerId) {
        if (DOCTOR.equals(partnerType)) {
            return doctorRepository.findByIdForWalletUpdate(partnerId)
                    .orElseThrow(() -> new BadRequestException("Doctor not found: " + partnerId));
        }
        if (PHARMACY.equals(partnerType)) {
            return pharmacyRepository.findByIdForWalletUpdate(partnerId)
                    .orElseThrow(() -> new BadRequestException("Pharmacy not found: " + partnerId));
        }
        throw new BadRequestException("Unsupported partner type: " + partnerType);
    }

    private void addTotalEarnings(Object partner, BigDecimal amount) {
        if (partner instanceof Doctor doctor) {
            doctor.setTotalEarnings(zeroIfNull(doctor.getTotalEarnings()).add(amount));
        } else if (partner instanceof Pharmacy pharmacy) {
            pharmacy.setTotalEarnings(zeroIfNull(pharmacy.getTotalEarnings()).add(amount));
        }
    }

    private void addPendingSettlement(Object partner, BigDecimal amount) {
        if (partner instanceof Doctor doctor) {
            doctor.setPendingSettlement(zeroIfNull(doctor.getPendingSettlement()).add(amount));
        } else if (partner instanceof Pharmacy pharmacy) {
            pharmacy.setPendingSettlement(zeroIfNull(pharmacy.getPendingSettlement()).add(amount));
        }
    }

    private void savePartner(Object partner) {
        if (partner instanceof Doctor doctor) {
            doctorRepository.save(doctor);
        } else if (partner instanceof Pharmacy pharmacy) {
            pharmacyRepository.save(pharmacy);
        }
    }

    private boolean isTerminal(PartnerWalletEntryStatus status) {
        return status == PartnerWalletEntryStatus.COMPLETED
                || status == PartnerWalletEntryStatus.FAILED
                || status == PartnerWalletEntryStatus.RETURNED
                || status == PartnerWalletEntryStatus.REFUNDED
                || status == PartnerWalletEntryStatus.CANCELLED
                || status == PartnerWalletEntryStatus.VESTED;
    }

    private BigDecimal amountOf(CommissionTransaction tx) {
        return zeroIfNull(tx.getNetAmount());
    }

    private BigDecimal amountOf(Settlement settlement) {
        return zeroIfNull(settlement.getNetAmount());
    }

    private BigDecimal zeroIfNull(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }

    private String earningKey(CommissionTransaction tx) {
        return "EARNING:CTX:" + tx.getTransactionId();
    }

    private String refundKey(CommissionTransaction tx) {
        return "REFUND:CTX:" + tx.getTransactionId();
    }

    private String withdrawalKey(Settlement settlement) {
        return "WITHDRAWAL:STL:" + settlement.getSettlementId();
    }

    private String returnKey(Settlement settlement) {
        return "RETURN:STL:" + settlement.getSettlementId();
    }
}
