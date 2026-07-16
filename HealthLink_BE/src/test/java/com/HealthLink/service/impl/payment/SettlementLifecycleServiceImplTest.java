package com.HealthLink.service.impl.payment;

import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.PartnerWalletEntry;
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SettlementLifecycleServiceImplTest {

    @Mock
    private PaymentSettlementRepository settlementRepository;
    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private PharmacyRepository pharmacyRepository;
    @Mock
    private PartnerWalletLedgerService walletLedgerService;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @InjectMocks
    private SettlementLifecycleServiceImpl lifecycleService;

    @Test
    void beginWithdrawal_reservesLockedBalanceAndCreatesProcessingWithdrawalEntry() {
        Doctor doctor = Doctor.builder()
                .doctorId("doctor-1")
                .pendingSettlement(new BigDecimal("25.00"))
                .paypalEmail("doctor@example.com")
                .build();
        when(doctorRepository.findByIdForWalletUpdate("doctor-1")).thenReturn(Optional.of(doctor));
        when(settlementRepository.save(any(Settlement.class))).thenAnswer(invocation -> {
            Settlement settlement = invocation.getArgument(0);
            settlement.setSettlementId(7);
            return settlement;
        });
        when(walletLedgerService.createWithdrawal(any(Settlement.class))).thenAnswer(invocation -> {
            doctor.setPendingSettlement(new BigDecimal("15.00"));
            return PartnerWalletEntry.builder()
                    .status(PartnerWalletEntryStatus.PROCESSING)
                    .amount(new BigDecimal("-10.00"))
                    .idempotencyKey("WITHDRAWAL:STL:7")
                    .build();
        });

        Settlement settlement = lifecycleService.beginWithdrawal(
                "DOCTOR", "doctor-1", "Doctor One", new BigDecimal("10.00"),
                "doctor@example.com", "Partner requested payout");

        assertThat(settlement.getStatus()).isEqualTo("PROCESSING");
        assertThat(doctor.getPendingSettlement()).isEqualByComparingTo("15.00");
        ArgumentCaptor<Settlement> settlementCaptor = ArgumentCaptor.forClass(Settlement.class);
        verify(walletLedgerService).createWithdrawal(settlementCaptor.capture());
        assertThat(settlementCaptor.getValue().getSettlementId()).isEqualTo(7);
        assertThat(settlementCaptor.getValue().getNetAmount()).isEqualByComparingTo("10.00");
        verify(doctorRepository).findByIdForWalletUpdate("doctor-1");
    }

    @Test
    void beginWithdrawal_doesNotReserveWhenLockedBalanceWouldFallToTen() {
        Doctor doctor = Doctor.builder()
                .doctorId("doctor-1")
                .pendingSettlement(new BigDecimal("20.00"))
                .paypalEmail("doctor@example.com")
                .build();
        when(doctorRepository.findByIdForWalletUpdate("doctor-1")).thenReturn(Optional.of(doctor));

        assertThatThrownBy(() -> lifecycleService.beginWithdrawal(
                "DOCTOR", "doctor-1", "Doctor One", new BigDecimal("10.00"),
                "doctor@example.com", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Remaining balance");

        verify(settlementRepository, never()).save(any());
        verify(walletLedgerService, never()).createWithdrawal(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void retryWithSameClientRequestIdReturnsExistingSettlementWithoutSecondReserveOrNotification() {
        User user = User.builder().id("doctor-user-1").build();
        Doctor doctor = Doctor.builder().doctorId("doctor-1").user(user).pendingSettlement(new BigDecimal("25.00"))
                .paypalEmail("doctor@example.com").build();
        Settlement existing = Settlement.builder().settlementId(7).status("PROCESSING")
                .clientRequestId("withdrawal-1").netAmount(new BigDecimal("10.00")).build();
        when(doctorRepository.findByIdForWalletUpdate("doctor-1")).thenReturn(Optional.of(doctor));
        when(settlementRepository.findByRecipientTypeAndRecipientIdAndClientRequestIdForUpdate(
                "DOCTOR", "doctor-1", "withdrawal-1"))
                .thenReturn(Optional.empty(), Optional.of(existing));
        when(settlementRepository.save(any(Settlement.class))).thenAnswer(invocation -> {
            Settlement settlement = invocation.getArgument(0);
            settlement.setSettlementId(7);
            return settlement;
        });
        when(walletLedgerService.createWithdrawal(any(Settlement.class))).thenAnswer(invocation -> {
            doctor.setPendingSettlement(new BigDecimal("15.00"));
            return new PartnerWalletEntry();
        });

        Settlement first = lifecycleService.beginWithdrawal("DOCTOR", "doctor-1", "Doctor One",
                new BigDecimal("10.00"), "doctor@example.com", null, "withdrawal-1");
        Settlement retry = lifecycleService.beginWithdrawal("DOCTOR", "doctor-1", "Doctor One",
                new BigDecimal("10.00"), "doctor@example.com", null, "withdrawal-1");

        assertThat(first.getSettlementId()).isEqualTo(7);
        assertThat(retry).isSameAs(existing);
        verify(walletLedgerService, times(1)).createWithdrawal(any());
        ArgumentCaptor<PartnerWalletBalanceChangedEvent> eventCaptor =
                ArgumentCaptor.forClass(PartnerWalletBalanceChangedEvent.class);
        verify(eventPublisher, times(1)).publishEvent(eventCaptor.capture());
        PartnerWalletBalanceChangedEvent event = eventCaptor.getValue();
        assertThat(event.getUser()).isSameAs(user);
        assertThat(event.getMessage()).contains("withdrawal");
        assertThat(event.getActionUrl()).isEqualTo("/profile-doctor?tab=wallet");
        assertThat(event.getMetadata()).contains("\"delta\":\"-10.00\"");
    }

    @Test
    void sameRequestIdForDifferentPartnerCreatesNewWithdrawalInsteadOfReplayingAnotherPartnersSettlement() {
        Doctor doctor = Doctor.builder().doctorId("doctor-1").pendingSettlement(new BigDecimal("25.00"))
                .paypalEmail("doctor@example.com").build();
        Pharmacy pharmacy = Pharmacy.builder().pharmacyId("pharmacy-1").pendingSettlement(new BigDecimal("25.00"))
                .paypalEmail("pharmacy@example.com").build();
        when(doctorRepository.findByIdForWalletUpdate("doctor-1")).thenReturn(Optional.of(doctor));
        when(pharmacyRepository.findByIdForWalletUpdate("pharmacy-1")).thenReturn(Optional.of(pharmacy));
        when(settlementRepository.findByRecipientTypeAndRecipientIdAndClientRequestIdForUpdate(
                "DOCTOR", "doctor-1", "shared-request"))
                .thenReturn(Optional.empty());
        when(settlementRepository.findByRecipientTypeAndRecipientIdAndClientRequestIdForUpdate(
                "PHARMACY", "pharmacy-1", "shared-request"))
                .thenReturn(Optional.empty());
        when(settlementRepository.save(any(Settlement.class))).thenAnswer(invocation -> {
            Settlement settlement = invocation.getArgument(0);
            settlement.setSettlementId("DOCTOR".equals(settlement.getRecipientType()) ? 7 : 8);
            return settlement;
        });
        when(walletLedgerService.createWithdrawal(any(Settlement.class))).thenReturn(new PartnerWalletEntry());

        Settlement doctorWithdrawal = lifecycleService.beginWithdrawal("DOCTOR", "doctor-1", "Doctor One",
                new BigDecimal("10.00"), "doctor@example.com", null, "shared-request");
        Settlement pharmacyWithdrawal = lifecycleService.beginWithdrawal("PHARMACY", "pharmacy-1", "Pharmacy One",
                new BigDecimal("10.00"), "pharmacy@example.com", null, "shared-request");

        assertThat(doctorWithdrawal.getSettlementId()).isEqualTo(7);
        assertThat(pharmacyWithdrawal.getSettlementId()).isEqualTo(8);
        assertThat(pharmacyWithdrawal.getRecipientId()).isEqualTo("pharmacy-1");
        verify(walletLedgerService, times(2)).createWithdrawal(any());
    }

    @Test
    void secondWithdrawalCannotReserveBalanceAlreadyReservedByFirstLockedWithdrawal() {
        Doctor doctor = Doctor.builder().doctorId("doctor-1")
                .pendingSettlement(new BigDecimal("25.00")).paypalEmail("doctor@example.com").build();
        when(doctorRepository.findByIdForWalletUpdate("doctor-1")).thenReturn(Optional.of(doctor));
        when(settlementRepository.save(any(Settlement.class))).thenAnswer(invocation -> {
            Settlement settlement = invocation.getArgument(0);
            settlement.setSettlementId(7);
            return settlement;
        });
        when(walletLedgerService.createWithdrawal(any(Settlement.class))).thenAnswer(invocation -> {
            doctor.setPendingSettlement(doctor.getPendingSettlement().subtract(new BigDecimal("10.00")));
            return new PartnerWalletEntry();
        });

        lifecycleService.beginWithdrawal("DOCTOR", "doctor-1", "Doctor One", new BigDecimal("10.00"),
                "doctor@example.com", null);

        assertThatThrownBy(() -> lifecycleService.beginWithdrawal("DOCTOR", "doctor-1", "Doctor One",
                new BigDecimal("10.00"), "doctor@example.com", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Remaining balance");
        verify(walletLedgerService, times(1)).createWithdrawal(any());
        verify(doctorRepository, times(2)).findByIdForWalletUpdate("doctor-1");
    }

    @Test
    void completeDoesNotCreateAReturn() {
        Settlement settlement = Settlement.builder()
                .settlementId(7)
                .status("PROCESSING")
                .recipientType("DOCTOR")
                .recipientId("doctor-1")
                .netAmount(new BigDecimal("10.00"))
                .build();
        when(settlementRepository.findByIdForUpdate(7)).thenReturn(Optional.of(settlement));
        when(settlementRepository.save(any(Settlement.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Settlement completed = lifecycleService.complete(7, "SUCCESS");

        assertThat(completed).isSameAs(settlement);
        assertThat(settlement.getStatus()).isEqualTo("COMPLETED");
        verify(walletLedgerService).updateWithdrawalStatus(7, PartnerWalletEntryStatus.COMPLETED);
        verify(walletLedgerService, never()).createReturn(any(), any());
    }

    @Test
    void failAndReturnIsIdempotent() {
        Settlement settlement = Settlement.builder()
                .settlementId(7)
                .status("PROCESSING")
                .externalStatus("DENIED")
                .recipientType("DOCTOR")
                .recipientId("doctor-1")
                .netAmount(new BigDecimal("10.00"))
                .build();
        User user = User.builder().id("doctor-user-1").build();
        Doctor doctor = Doctor.builder().doctorId("doctor-1").user(user).pendingSettlement(new BigDecimal("15.00"))
                .paypalEmail("doctor@example.com").build();
        when(settlementRepository.findByIdForUpdate(7)).thenReturn(Optional.of(settlement));
        when(settlementRepository.save(any(Settlement.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(doctorRepository.findByIdForWalletUpdate("doctor-1")).thenReturn(Optional.of(doctor));
        when(walletLedgerService.createReturn(eq(settlement), any())).thenAnswer(invocation -> {
            doctor.setPendingSettlement(new BigDecimal("25.00"));
            return new PartnerWalletEntry();
        });

        Settlement failed = lifecycleService.failAndReturn(7, "DENIED", "DENIED");
        lifecycleService.failAndReturn(7, "DENIED", "DENIED");

        assertThat(failed).isSameAs(settlement);
        assertThat(settlement.getStatus()).isEqualTo("FAILED");
        assertThat(settlement.getExternalStatus()).isEqualTo("DENIED");
        verify(walletLedgerService).updateWithdrawalStatus(7, PartnerWalletEntryStatus.FAILED);
        verify(walletLedgerService, times(1)).createReturn(eq(settlement), eq("DENIED"));
        ArgumentCaptor<PartnerWalletBalanceChangedEvent> eventCaptor =
                ArgumentCaptor.forClass(PartnerWalletBalanceChangedEvent.class);
        verify(eventPublisher, times(1)).publishEvent(eventCaptor.capture());
        PartnerWalletBalanceChangedEvent event = eventCaptor.getValue();
        assertThat(event.getUser()).isSameAs(user);
        assertThat(event.getMessage()).contains("returned");
        assertThat(event.getActionUrl()).isEqualTo("/profile-doctor?tab=wallet");
        assertThat(event.getMetadata()).contains("\"delta\":\"10.00\"");
    }

    @Test
    void terminalWinnerPreventsFailureReturnAndUnknownFailureStatusIsRejected() {
        Settlement settlement = Settlement.builder().settlementId(7).status("PROCESSING")
                .recipientType("DOCTOR").recipientId("doctor-1").netAmount(new BigDecimal("10.00")).build();
        when(settlementRepository.findByIdForUpdate(7)).thenReturn(Optional.of(settlement));

        lifecycleService.complete(7, "SUCCESS");
        Settlement winner = lifecycleService.failAndReturn(7, "DENIED", "DENIED");

        assertThat(winner).isSameAs(settlement);
        verify(walletLedgerService, never()).createReturn(any(), any());
        verify(eventPublisher, never()).publishEvent(any());

        assertThatThrownBy(() -> lifecycleService.failAndReturn(8, "UNKNOWN", "timeout"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("terminal");
        verify(walletLedgerService, never()).updateWithdrawalStatus(8, PartnerWalletEntryStatus.FAILED);
    }

    @Test
    void attachPayPalBatchDoesNotOverwriteProviderFieldsAfterTerminalState() {
        LocalDateTime reconciledAt = LocalDateTime.of(2026, 7, 16, 10, 30);
        Settlement settlement = Settlement.builder().settlementId(7).status("COMPLETED")
                .payoutBatchId("batch-original").externalStatus("SUCCESS").lastReconciledAt(reconciledAt)
                .notes("original terminal result").build();
        when(settlementRepository.findByIdForUpdate(7)).thenReturn(Optional.of(settlement));

        Settlement result = lifecycleService.attachPayPalBatch(7, PayPalPayoutResult.builder()
                .payoutBatchId("batch-overwrite").status("DENIED").message("should not replace terminal result").build());

        assertThat(result).isSameAs(settlement);
        assertThat(settlement.getPayoutBatchId()).isEqualTo("batch-original");
        assertThat(settlement.getExternalStatus()).isEqualTo("SUCCESS");
        assertThat(settlement.getLastReconciledAt()).isEqualTo(reconciledAt);
        assertThat(settlement.getNotes()).isEqualTo("original terminal result");
        verify(settlementRepository, never()).save(any());
    }
}
