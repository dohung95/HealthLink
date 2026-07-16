package com.HealthLink.service.impl.payment;

import com.HealthLink.entity.CommissionTransaction;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.PartnerWalletEntry;
import com.HealthLink.entity.enums.PartnerWalletEntryStatus;
import com.HealthLink.entity.enums.PartnerWalletEntryType;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.payment.PartnerWalletEntryRepository;
import com.HealthLink.repository.payment.PaymentCommissionTransactionRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.service.payment.PartnerWalletLedgerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@DataJpaTest
@ActiveProfiles("test")
@Import(PartnerWalletLedgerServiceImpl.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class CommissionTransactionLockIntegrationTest {

    private static final BigDecimal AMOUNT = new BigDecimal("42.50");

    @Autowired
    private PaymentCommissionTransactionRepository commissionTransactionRepository;

    @Autowired
    private PartnerWalletEntryRepository entryRepository;

    @Autowired
    private PartnerWalletLedgerService ledgerService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @MockBean
    private DoctorRepository doctorRepository;

    @MockBean
    private PharmacyRepository pharmacyRepository;

    private TransactionTemplate transactions;
    private Doctor doctor;

    @BeforeEach
    void setUp() {
        transactions = new TransactionTemplate(transactionManager);
        transactions.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        doctor = Doctor.builder()
                .doctorId("doctor-lock-test")
                .totalEarnings(BigDecimal.ZERO)
                .pendingSettlement(BigDecimal.ZERO)
                .build();
        when(doctorRepository.findByIdForWalletUpdate("doctor-lock-test"))
                .thenReturn(Optional.of(doctor));
        when(doctorRepository.save(doctor)).thenReturn(doctor);
    }

    @Test
    void realPessimisticLockVestsThenRefundsWithoutLeavingPositiveWalletBalance() throws Exception {
        Integer transactionId = seedPendingEarning("CTX-LOCK-VEST-REFUND");

        runInterleaving(transactionId, true);

        CommissionTransaction transaction = readTransaction(transactionId);
        assertThat(transaction.getStatus()).isEqualTo("REFUNDED");
        assertThat(doctor.getPendingSettlement()).isEqualByComparingTo("0.00");
        assertThat(entriesFor(transactionId)).extracting(PartnerWalletEntry::getEntryType)
                .containsExactlyInAnyOrder(PartnerWalletEntryType.EARNING, PartnerWalletEntryType.REFUND);
        assertThat(entryByType(transactionId, PartnerWalletEntryType.EARNING).getStatus())
                .isEqualTo(PartnerWalletEntryStatus.VESTED);
        assertThat(entryByType(transactionId, PartnerWalletEntryType.REFUND).getAmount())
                .isEqualByComparingTo("-42.50");
    }

    @Test
    void realPessimisticLockRefundsThenPreventsVestAndLeavesWalletAtZero() throws Exception {
        Integer transactionId = seedPendingEarning("CTX-LOCK-REFUND-VEST");

        runInterleaving(transactionId, false);

        CommissionTransaction transaction = readTransaction(transactionId);
        assertThat(transaction.getStatus()).isEqualTo("REFUNDED");
        assertThat(doctor.getPendingSettlement()).isEqualByComparingTo("0.00");
        assertThat(entriesFor(transactionId)).singleElement().satisfies(entry -> {
            assertThat(entry.getEntryType()).isEqualTo(PartnerWalletEntryType.EARNING);
            assertThat(entry.getStatus()).isEqualTo(PartnerWalletEntryStatus.CANCELLED);
        });
    }

    private Integer seedPendingEarning(String transactionNumber) {
        return transactions.execute(status -> {
            CommissionTransaction transaction = commissionTransactionRepository.saveAndFlush(CommissionTransaction.builder()
                    .transactionNumber(transactionNumber)
                    .sourceType("APPOINTMENT")
                    .appointmentId(500)
                    .recipientType("DOCTOR")
                    .recipientId("doctor-lock-test")
                    .recipientName("Lock Test Doctor")
                    .serviceType("ONLINE_CONSULTATION")
                    .grossAmount(new BigDecimal("50.00"))
                    .commissionRate(new BigDecimal("0.1500"))
                    .commissionAmount(new BigDecimal("7.50"))
                    .netAmount(AMOUNT)
                    .status("PENDING")
                    .build());
            ledgerService.recordPendingEarning(transaction);
            return transaction.getTransactionId();
        });
    }

    private void runInterleaving(Integer transactionId, boolean vestFirst) throws Exception {
        CountDownLatch firstHasTransactionLock = new CountDownLatch(1);
        CountDownLatch releaseFirstTransaction = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicReference<String> secondObservedStatus = new AtomicReference<>();
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<?> first = executor.submit(() -> transactions.executeWithoutResult(status -> {
                CommissionTransaction transaction = commissionTransactionRepository.findByIdForUpdate(transactionId)
                        .orElseThrow();
                if (vestFirst) {
                    vest(transaction);
                } else {
                    refund(transaction);
                }
                firstHasTransactionLock.countDown();
                await(releaseFirstTransaction);
            }));

            await(firstHasTransactionLock);
            Future<?> second = executor.submit(() -> {
                secondStarted.countDown();
                transactions.executeWithoutResult(status -> {
                    CommissionTransaction transaction = commissionTransactionRepository.findByIdForUpdate(transactionId)
                            .orElseThrow();
                    secondObservedStatus.set(transaction.getStatus());
                    if (vestFirst) {
                        refund(transaction);
                    } else {
                        vest(transaction);
                    }
                });
            });

            await(secondStarted);
            releaseFirstTransaction.countDown();
            first.get(5, TimeUnit.SECONDS);
            second.get(5, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
        }

        assertThat(secondObservedStatus.get()).isEqualTo(vestFirst ? "VESTED" : "REFUNDED");
    }

    private void vest(CommissionTransaction transaction) {
        if (!"PENDING".equals(transaction.getStatus())) {
            return;
        }
        transaction.setStatus("VESTED");
        ledgerService.vestEarning(transaction);
    }

    private void refund(CommissionTransaction transaction) {
        if ("REFUNDED".equals(transaction.getStatus())) {
            return;
        }
        String previousStatus = transaction.getStatus();
        transaction.setStatus("REFUNDED");
        ledgerService.recordPatientRefund(transaction, previousStatus);
    }

    private CommissionTransaction readTransaction(Integer transactionId) {
        return transactions.execute(status -> commissionTransactionRepository.findById(transactionId).orElseThrow());
    }

    private List<PartnerWalletEntry> entriesFor(Integer transactionId) {
        return transactions.execute(status -> entryRepository.findAll().stream()
                .filter(entry -> transactionId.equals(entry.getCommissionTransactionId()))
                .toList());
    }

    private PartnerWalletEntry entryByType(Integer transactionId, PartnerWalletEntryType type) {
        return entriesFor(transactionId).stream().filter(entry -> entry.getEntryType() == type).findFirst().orElseThrow();
    }

    private void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new AssertionError("Timed out waiting for transaction interleaving");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AssertionError("Interrupted while waiting for transaction interleaving", exception);
        }
    }
}
