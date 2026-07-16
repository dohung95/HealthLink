package com.HealthLink.service.impl.payment;

import com.HealthLink.entity.CommissionTransaction;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.PartnerWalletEntry;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.enums.PartnerWalletEntryStatus;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.payment.PartnerWalletEntryRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartnerWalletLedgerServiceImplTest {

    @Mock
    private PartnerWalletEntryRepository entryRepository;

    @Mock
    private DoctorRepository doctorRepository;

    @Mock
    private PharmacyRepository pharmacyRepository;

    @InjectMocks
    private PartnerWalletLedgerServiceImpl ledgerService;

    @Test
    void vestsPendingDoctorEarningOnlyOnce() {
        CommissionTransaction tx = transaction("DOCTOR", "doctor-1", 1, new BigDecimal("25.00"));
        PartnerWalletEntry earning = earning(tx, PartnerWalletEntryStatus.PENDING);
        Doctor doctor = Doctor.builder()
                .doctorId("doctor-1")
                .pendingSettlement(new BigDecimal("5.00"))
                .totalEarnings(new BigDecimal("25.00"))
                .build();
        when(entryRepository.findByIdempotencyKey("EARNING:CTX:1")).thenReturn(Optional.of(earning));
        when(doctorRepository.findByIdForWalletUpdate("doctor-1")).thenReturn(Optional.of(doctor));

        ledgerService.vestEarning(tx);
        ledgerService.vestEarning(tx);

        assertThat(earning.getStatus()).isEqualTo(PartnerWalletEntryStatus.VESTED);
        assertThat(doctor.getPendingSettlement()).isEqualByComparingTo("30.00");
        verify(doctorRepository, times(1)).save(doctor);
        verify(entryRepository, times(1)).save(earning);
    }

    @Test
    void refundsVestedPharmacyEarningWithSignedEntryAndAllowsNegativeBalance() {
        CommissionTransaction tx = transaction("PHARMACY", "pharmacy-1", 2, new BigDecimal("25.00"));
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .pendingSettlement(new BigDecimal("5.00"))
                .totalEarnings(new BigDecimal("25.00"))
                .build();
        when(entryRepository.findByIdempotencyKey("REFUND:CTX:2")).thenReturn(Optional.empty());
        when(pharmacyRepository.findByIdForWalletUpdate("pharmacy-1")).thenReturn(Optional.of(pharmacy));

        ledgerService.recordPatientRefund(tx, "VESTED");

        assertThat(pharmacy.getPendingSettlement()).isEqualByComparingTo("-20.00");
        verify(entryRepository).save(org.mockito.ArgumentMatchers.argThat(entry ->
                entry.getIdempotencyKey().equals("REFUND:CTX:2")
                        && entry.getAmount().compareTo(new BigDecimal("-25.00")) == 0
                        && entry.getStatus() == PartnerWalletEntryStatus.REFUNDED));
        verify(pharmacyRepository).save(pharmacy);
    }

    @Test
    void refundsLegacySettledDoctorEarning() {
        CommissionTransaction tx = transaction("DOCTOR", "doctor-1", 3, new BigDecimal("25.00"));
        Doctor doctor = Doctor.builder()
                .doctorId("doctor-1")
                .pendingSettlement(new BigDecimal("5.00"))
                .build();
        when(entryRepository.findByIdempotencyKey("REFUND:CTX:3")).thenReturn(Optional.empty());
        when(doctorRepository.findByIdForWalletUpdate("doctor-1")).thenReturn(Optional.of(doctor));

        ledgerService.recordPatientRefund(tx, "SETTLED");

        assertThat(doctor.getPendingSettlement()).isEqualByComparingTo("-20.00");
        verify(doctorRepository).save(doctor);
        verify(entryRepository).save(any(PartnerWalletEntry.class));
    }

    @Test
    void cancelsPendingPharmacyEarningWithoutChangingWalletBalance() {
        CommissionTransaction tx = transaction("PHARMACY", "pharmacy-1", 4, new BigDecimal("25.00"));
        PartnerWalletEntry earning = earning(tx, PartnerWalletEntryStatus.PENDING);
        when(entryRepository.findByIdempotencyKey("EARNING:CTX:4")).thenReturn(Optional.of(earning));

        ledgerService.recordPatientRefund(tx, "PENDING");

        assertThat(earning.getStatus()).isEqualTo(PartnerWalletEntryStatus.CANCELLED);
        verify(entryRepository).save(earning);
        verify(pharmacyRepository, times(0)).save(any());
    }

    private CommissionTransaction transaction(String partnerType, String partnerId, int transactionId,
                                               BigDecimal netAmount) {
        return CommissionTransaction.builder()
                .transactionId(transactionId)
                .transactionNumber("CTX-202607-" + transactionId)
                .recipientType(partnerType)
                .recipientId(partnerId)
                .recipientName(partnerType + " One")
                .netAmount(netAmount)
                .build();
    }

    private PartnerWalletEntry earning(CommissionTransaction tx, PartnerWalletEntryStatus status) {
        PartnerWalletEntry entry = new PartnerWalletEntry();
        entry.setPartnerType(tx.getRecipientType());
        entry.setPartnerId(tx.getRecipientId());
        entry.setStatus(status);
        entry.setAmount(tx.getNetAmount());
        entry.setIdempotencyKey("EARNING:CTX:" + tx.getTransactionId());
        return entry;
    }
}
