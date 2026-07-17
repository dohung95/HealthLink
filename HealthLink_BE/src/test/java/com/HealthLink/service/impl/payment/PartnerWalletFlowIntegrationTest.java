package com.HealthLink.service.impl.payment;

import com.HealthLink.entity.CommissionTransaction;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.PartnerWalletEntry;
import com.HealthLink.entity.Role;
import com.HealthLink.entity.Settlement;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.PartnerWalletEntryStatus;
import com.HealthLink.entity.enums.PartnerWalletEntryType;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.payment.PartnerWalletEntryRepository;
import com.HealthLink.repository.payment.PaymentSettlementRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.utility.payment.PartnerAccessValidator;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Exercises the ledger and payout lifecycle together with a small in-memory repository harness.
 * The production services stay real; repository mocks only stand in for the SQL Server boundary.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PartnerWalletFlowIntegrationTest {

    @Mock
    private PartnerWalletEntryRepository entryRepository;
    @Mock
    private PaymentSettlementRepository settlementRepository;
    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private PharmacyRepository pharmacyRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private UserRepository userRepository;

    private final Map<String, PartnerWalletEntry> entriesByKey = new LinkedHashMap<>();
    private final Map<Integer, Settlement> settlementsById = new LinkedHashMap<>();
    private final AtomicInteger settlementIds = new AtomicInteger();

    private Doctor doctor;
    private PartnerWalletLedgerServiceImpl ledgerService;
    private SettlementLifecycleServiceImpl lifecycleService;

    @BeforeEach
    void setUp() {
        doctor = Doctor.builder()
                .doctorId("doctor-a")
                .fullName("Doctor A")
                .paypalEmail("doctor-a@example.com")
                .pendingSettlement(BigDecimal.ZERO)
                .totalEarnings(BigDecimal.ZERO)
                .build();
        ledgerService = new PartnerWalletLedgerServiceImpl(entryRepository, doctorRepository, pharmacyRepository);
        lifecycleService = new SettlementLifecycleServiceImpl(
                settlementRepository, doctorRepository, pharmacyRepository, ledgerService, eventPublisher);

        when(doctorRepository.findByIdForWalletUpdate("doctor-a")).thenReturn(Optional.of(doctor));
        when(doctorRepository.save(any(Doctor.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(entryRepository.findByIdempotencyKey(anyString()))
                .thenAnswer(invocation -> Optional.ofNullable(entriesByKey.get(invocation.getArgument(0))));
        when(entryRepository.save(any(PartnerWalletEntry.class))).thenAnswer(invocation -> {
            PartnerWalletEntry entry = invocation.getArgument(0);
            entriesByKey.put(entry.getIdempotencyKey(), entry);
            return entry;
        });
        when(entryRepository.findBySettlementIdAndEntryType(anyInt(), any(PartnerWalletEntryType.class)))
                .thenAnswer(invocation -> entriesByKey.values().stream()
                        .filter(entry -> invocation.getArgument(0, Integer.class).equals(entry.getSettlementId()))
                        .filter(entry -> invocation.getArgument(1, PartnerWalletEntryType.class) == entry.getEntryType())
                        .toList());
        when(settlementRepository.save(any(Settlement.class))).thenAnswer(invocation -> {
            Settlement settlement = invocation.getArgument(0);
            if (settlement.getSettlementId() == null) {
                settlement.setSettlementId(settlementIds.incrementAndGet());
            }
            settlementsById.put(settlement.getSettlementId(), settlement);
            return settlement;
        });
        when(settlementRepository.findByIdForUpdate(anyInt()))
                .thenAnswer(invocation -> Optional.ofNullable(settlementsById.get(invocation.getArgument(0))));
        when(settlementRepository.findByRecipientTypeAndRecipientIdAndClientRequestIdForUpdate(
                anyString(), anyString(), anyString())).thenAnswer(invocation -> settlementsById.values().stream()
                .filter(settlement -> invocation.getArgument(0, String.class).equals(settlement.getRecipientType()))
                .filter(settlement -> invocation.getArgument(1, String.class).equals(settlement.getRecipientId()))
                .filter(settlement -> invocation.getArgument(2, String.class).equals(settlement.getClientRequestId()))
                .findFirst());
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void paymentCompletionWithdrawalAndRefundKeepTheLedgerAndBalanceInSync() {
        CommissionTransaction firstEarning = commission(1, "50.00");

        ledgerService.recordPendingEarning(firstEarning);
        assertThat(entriesByKey.get("EARNING:CTX:1"))
                .extracting(PartnerWalletEntry::getStatus, PartnerWalletEntry::getAmount)
                .containsExactly(PartnerWalletEntryStatus.PENDING, new BigDecimal("50.00"));

        ledgerService.vestEarning(firstEarning);
        assertThat(doctor.getPendingSettlement()).isEqualByComparingTo("50.00");

        Settlement withdrawal = lifecycleService.beginWithdrawal(
                "DOCTOR", "doctor-a", "Doctor A", new BigDecimal("40.00"),
                "doctor-a@example.com", "wallet test", "withdrawal-1");

        assertThat(doctor.getPendingSettlement()).isEqualByComparingTo("10.00");
        assertThat(withdrawals()).singleElement().satisfies(entry -> {
            assertThat(entry.getSettlementId()).isEqualTo(withdrawal.getSettlementId());
            assertThat(entry.getStatus()).isEqualTo(PartnerWalletEntryStatus.PROCESSING);
            assertThat(entry.getAmount()).isEqualByComparingTo("-40.00");
        });

        lifecycleService.complete(withdrawal.getSettlementId(), "SUCCESS");
        assertThat(doctor.getPendingSettlement()).isEqualByComparingTo("10.00");
        assertThat(withdrawals()).singleElement()
                .extracting(PartnerWalletEntry::getStatus)
                .isEqualTo(PartnerWalletEntryStatus.COMPLETED);

        ledgerService.recordPatientRefund(firstEarning, "VESTED");
        assertThat(doctor.getPendingSettlement()).isEqualByComparingTo("-40.00");
        assertThat(entriesByKey.get("REFUND:CTX:1"))
                .extracting(PartnerWalletEntry::getStatus, PartnerWalletEntry::getAmount)
                .containsExactly(PartnerWalletEntryStatus.REFUNDED, new BigDecimal("-50.00"));

        CommissionTransaction nextEarning = commission(2, "25.00");
        ledgerService.recordPendingEarning(nextEarning);
        ledgerService.vestEarning(nextEarning);
        assertThat(doctor.getPendingSettlement()).isEqualByComparingTo("-15.00");
    }

    @Test
    void confirmedPayoutFailureReturnsFundsOnceAndRepeatedReconciliationIsANoOp() {
        doctor.setPendingSettlement(new BigDecimal("50.00"));
        Settlement withdrawal = lifecycleService.beginWithdrawal(
                "DOCTOR", "doctor-a", "Doctor A", new BigDecimal("40.00"),
                "doctor-a@example.com", "wallet test", "withdrawal-failure");

        lifecycleService.failAndReturn(withdrawal.getSettlementId(), "DENIED", "recipient rejected payout");
        lifecycleService.failAndReturn(withdrawal.getSettlementId(), "DENIED", "replayed provider event");

        assertThat(doctor.getPendingSettlement()).isEqualByComparingTo("50.00");
        assertThat(withdrawals()).singleElement().extracting(PartnerWalletEntry::getStatus)
                .isEqualTo(PartnerWalletEntryStatus.FAILED);
        assertThat(entriesByKey.values().stream()
                .filter(entry -> entry.getEntryType() == PartnerWalletEntryType.RETURN)
                .toList()).singleElement().satisfies(entry -> {
                    assertThat(entry.getStatus()).isEqualTo(PartnerWalletEntryStatus.RETURNED);
                    assertThat(entry.getAmount()).isEqualByComparingTo("40.00");
                });
    }

    @Test
    void sequentialWithdrawalCannotReserveBalanceAlreadyReservedByTheFirstWithdrawal() {
        doctor.setPendingSettlement(new BigDecimal("50.00"));
        lifecycleService.beginWithdrawal("DOCTOR", "doctor-a", "Doctor A", new BigDecimal("40.00"),
                "doctor-a@example.com", "wallet test", "withdrawal-first");

        assertThatThrownBy(() -> lifecycleService.beginWithdrawal(
                "DOCTOR", "doctor-a", "Doctor A", new BigDecimal("40.00"),
                "doctor-a@example.com", "wallet test", "withdrawal-second"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("exceeds available balance");
        assertThat(withdrawals()).hasSize(1);
        assertThat(doctor.getPendingSettlement()).isEqualByComparingTo("10.00");
    }

    @Test
    void partnerCannotReadAnotherPartnersEntries() {
        User currentUser = User.builder()
                .id("doctor-a")
                .email("doctor-a@example.com")
                .role(Role.builder().name("DOCTOR").build())
                .build();
        when(userRepository.findByEmail("doctor-a@example.com")).thenReturn(Optional.of(currentUser));
        when(doctorRepository.findByIdWithUser("doctor-b")).thenReturn(Optional.of(Doctor.builder()
                .doctorId("doctor-b")
                .user(User.builder().id("doctor-b").email("doctor-b@example.com").build())
                .build()));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("doctor-a@example.com", "unused", List.of()));
        PartnerAccessValidator accessValidator = new PartnerAccessValidator(
                userRepository, doctorRepository, pharmacyRepository);

        assertThatThrownBy(() -> accessValidator.assertPartnerAccess("doctor-b", null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("cannot access doctor partnerId doctor-b");
    }

    @Test
    void migrationBackfillIsGuardedForRepeatedSqlServerRunsAndSkipsLegacySettledEarnings() throws Exception {
        String migration = Files.readString(Path.of("src/main/resources/db/migration-v21-add-partner-wallet-ledger.sql"));

        assertThat(migration)
                .contains("IF OBJECT_ID('dbo.PartnerWalletEntries', 'U') IS NULL")
                .contains("IF NOT EXISTS (", "FROM sys.indexes")
                .contains("WHERE ctx.status IN ('PENDING', 'VESTED')")
                .doesNotContain("ctx.status IN ('PENDING', 'VESTED', 'SETTLED')");
        assertThat(count(migration, "WHERE entry.IdempotencyKey = CONCAT("))
                .isEqualTo(3);
        assertThat(count(migration, "NOT EXISTS ("))
                .isGreaterThanOrEqualTo(6);
    }

    private CommissionTransaction commission(int id, String amount) {
        return CommissionTransaction.builder()
                .transactionId(id)
                .transactionNumber("CTX-" + id)
                .recipientType("DOCTOR")
                .recipientId("doctor-a")
                .recipientName("Doctor A")
                .netAmount(new BigDecimal(amount))
                .build();
    }

    private List<PartnerWalletEntry> withdrawals() {
        return new ArrayList<>(entriesByKey.values()).stream()
                .filter(entry -> entry.getEntryType() == PartnerWalletEntryType.WITHDRAWAL)
                .toList();
    }

    private int count(String value, String needle) {
        return value.split(java.util.regex.Pattern.quote(needle), -1).length - 1;
    }
}
