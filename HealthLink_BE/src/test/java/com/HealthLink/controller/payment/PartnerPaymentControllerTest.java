package com.HealthLink.controller.payment;

import com.HealthLink.dto.payment.PartnerWalletEntryFilter;
import com.HealthLink.dto.payment.PartnerWalletEntryResponse;
import com.HealthLink.entity.Doctor;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.service.payment.CommissionService;
import com.HealthLink.service.payment.PartnerWalletQueryService;
import com.HealthLink.service.payment.SettlementService;
import com.HealthLink.utility.payment.PartnerAccessValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartnerPaymentControllerTest {

    @Mock
    private CommissionService commissionService;

    @Mock
    private SettlementService settlementService;

    @Mock
    private PartnerAccessValidator partnerAccessValidator;

    @Mock
    private DoctorRepository doctorRepository;

    @Mock
    private PharmacyRepository pharmacyRepository;

    @Mock
    private PartnerWalletQueryService walletQueryService;

    @InjectMocks
    private PartnerPaymentController controller;

    @Test
    void returnsWalletEntriesOnlyAfterValidatingPartnerAccessAndCapsPageSize() {
        PartnerWalletEntryResponse entry = PartnerWalletEntryResponse.builder()
                .entryId(7L)
                .entryType("EARNING")
                .status("VESTED")
                .amount(new BigDecimal("25.00"))
                .effectiveAt(LocalDateTime.of(2026, 7, 16, 10, 0))
                .build();
        when(walletQueryService.getWalletEntries(eq("doctor-1"), any(PartnerWalletEntryFilter.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entry)));

        var response = controller.getPartnerWalletEntries(
                "doctor-1", "follow-up", "ADJUSTMENT", "RETURNED",
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 16), 2, 500);

        ArgumentCaptor<PartnerWalletEntryFilter> filterCaptor = ArgumentCaptor.forClass(PartnerWalletEntryFilter.class);
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(partnerAccessValidator).assertPartnerAccess("doctor-1", null);
        verify(walletQueryService).getWalletEntries(eq("doctor-1"), filterCaptor.capture(), pageableCaptor.capture());
        assertThat(response.getBody().getContent()).containsExactly(entry);
        assertThat(pageableCaptor.getValue().getPageNumber()).isEqualTo(2);
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(100);
        assertThat(filterCaptor.getValue())
                .extracting(PartnerWalletEntryFilter::getSearch,
                        PartnerWalletEntryFilter::getType,
                        PartnerWalletEntryFilter::getStatus,
                        PartnerWalletEntryFilter::getFrom,
                        PartnerWalletEntryFilter::getTo)
                .containsExactly("follow-up", "ADJUSTMENT", "RETURNED",
                        LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 16));
    }

    @Test
    void keepsPendingBalanceCompatibleAndExposesNegativeAvailableBalanceAsNotWithdrawable() {
        Doctor doctor = Doctor.builder()
                .doctorId("doctor-1")
                .fullName("Doctor One")
                .pendingSettlement(new BigDecimal("-5.00"))
                .totalEarnings(new BigDecimal("25.00"))
                .build();
        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));

        var response = controller.getPartnerBalance("doctor-1", "DOCTOR");

        assertThat(response.getBody().getPendingBalance()).isEqualByComparingTo("-5.00");
        assertThat(response.getBody().getAvailableBalance()).isEqualByComparingTo("-5.00");
        assertThat(response.getBody().isEligibleForWithdrawal()).isFalse();
    }
}
