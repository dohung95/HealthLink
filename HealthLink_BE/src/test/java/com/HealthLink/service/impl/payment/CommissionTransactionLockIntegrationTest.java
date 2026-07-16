package com.HealthLink.service.impl.payment;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.CommissionTransaction;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Invoice;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.PartnerWalletEntry;
import com.HealthLink.entity.enums.PartnerWalletEntryStatus;
import com.HealthLink.entity.enums.PartnerWalletEntryType;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.payment.InvoiceRepository;
import com.HealthLink.repository.payment.PartnerWalletEntryRepository;
import com.HealthLink.repository.payment.PaymentCommissionTransactionRepository;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.notification.NotificationService;
import com.HealthLink.service.payment.FeeCalculatorService;
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
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DataJpaTest
@ActiveProfiles("test")
@Import(PartnerWalletLedgerServiceImpl.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class CommissionTransactionLockIntegrationTest {

    private static final BigDecimal AMOUNT = new BigDecimal("42.50");

    @Autowired
    private PaymentCommissionTransactionRepository databaseCommissionTransactionRepository;

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
    private CommissionServiceImpl commissionService;
    private PaymentCommissionTransactionRepository commissionTransactionRepository;
    private final AtomicReference<LockProbe> lockProbe = new AtomicReference<>();

    @BeforeEach
    void setUp() {
        transactions = new TransactionTemplate(transactionManager);
        transactions.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        commissionTransactionRepository = instrumentRepository(databaseCommissionTransactionRepository);
        doctor = Doctor.builder()
                .doctorId("doctor-lock-test")
                .totalEarnings(BigDecimal.ZERO)
                .pendingSettlement(BigDecimal.ZERO)
                .build();
        when(doctorRepository.findByIdForWalletUpdate("doctor-lock-test"))
                .thenReturn(Optional.of(doctor));
        when(doctorRepository.save(doctor)).thenReturn(doctor);
        when(doctorRepository.findById("doctor-lock-test")).thenReturn(Optional.empty());

        InvoiceRepository invoiceRepository = mock(InvoiceRepository.class);
        PharmacyOrderRepository pharmacyOrderRepository = mock(PharmacyOrderRepository.class);
        PrescriptionHeaderRepository prescriptionHeaderRepository = mock(PrescriptionHeaderRepository.class);
        Invoice invoice = Invoice.builder()
                .invoiceId(700)
                .appointment(Appointment.builder()
                        .appointmentId(500)
                        .patient(Patient.builder().patientId("patient-lock-test").build())
                        .build())
                .build();
        when(invoiceRepository.findById(700)).thenReturn(Optional.of(invoice));
        when(prescriptionHeaderRepository.findByAppointment_AppointmentId(500)).thenReturn(List.of());
        when(pharmacyOrderRepository.findByPatient_PatientId(any())).thenReturn(List.of());
        commissionService = new CommissionServiceImpl(mock(FeeCalculatorService.class), commissionTransactionRepository,
                invoiceRepository, pharmacyOrderRepository, doctorRepository, pharmacyRepository,
                prescriptionHeaderRepository, mock(NotificationService.class), ledgerService);
    }

    @Test
    void realPessimisticLockVestsThenRefundsWithoutLeavingPositiveWalletBalance() throws Exception {
        Integer transactionId = seedPendingEarning("CTX-LOCK-VEST-REFUND");

        runInterleaving(true);

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

        runInterleaving(false);

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

    private void runInterleaving(boolean vestFirst) throws Exception {
        CountDownLatch firstHasTransactionLock = new CountDownLatch(1);
        CountDownLatch secondAttemptedTransactionLock = new CountDownLatch(1);
        CountDownLatch releaseFirstTransaction = new CountDownLatch(1);
        AtomicReference<Throwable> firstFailure = new AtomicReference<>();
        LockProbe probe = new LockProbe(firstHasTransactionLock, secondAttemptedTransactionLock,
                releaseFirstTransaction);
        lockProbe.set(probe);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<?> first = executor.submit(() -> {
                try {
                    transactions.executeWithoutResult(status -> {
                        if (vestFirst) {
                            commissionService.vestConsultationCommission(500);
                        } else {
                            commissionService.processRefund(700);
                        }
                    });
                } catch (Throwable failure) {
                    firstFailure.set(failure);
                    throw failure;
                }
            });

            await(firstHasTransactionLock, firstFailure);
            Future<?> second = executor.submit(() -> {
                transactions.executeWithoutResult(status -> {
                    if (vestFirst) {
                        commissionService.processRefund(700);
                    } else {
                        commissionService.vestConsultationCommission(500);
                    }
                });
            });

            await(secondAttemptedTransactionLock);
            assertThat(second.isDone()).isFalse();
            releaseFirstTransaction.countDown();
            first.get(5, TimeUnit.SECONDS);
            second.get(5, TimeUnit.SECONDS);
        } finally {
            lockProbe.set(null);
            executor.shutdownNow();
        }

        assertThat(probe.secondObservedStatus.get()).isEqualTo(vestFirst ? "VESTED" : "REFUNDED");
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
        await(latch, null);
    }

    private void await(CountDownLatch latch, AtomicReference<Throwable> failure) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                if (failure != null && failure.get() != null) {
                    throw new AssertionError("Transaction worker failed before reaching the expected lock", failure.get());
                }
                throw new AssertionError("Timed out waiting for transaction interleaving");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AssertionError("Interrupted while waiting for transaction interleaving", exception);
        }
    }

    private PaymentCommissionTransactionRepository instrumentRepository(
            PaymentCommissionTransactionRepository databaseRepository
    ) {
        return (PaymentCommissionTransactionRepository) Proxy.newProxyInstance(
                PaymentCommissionTransactionRepository.class.getClassLoader(),
                new Class<?>[]{PaymentCommissionTransactionRepository.class},
                (proxy, method, arguments) -> invokeInstrumentedRepository(databaseRepository, method, arguments));
    }

    private Object invokeInstrumentedRepository(
            PaymentCommissionTransactionRepository databaseRepository,
            Method method,
            Object[] arguments
    ) throws Throwable {
        LockProbe probe = lockProbe.get();
        if (probe != null && "findByIdForUpdate".equals(method.getName())) {
            return probe.invoke(() -> invokeRepository(databaseRepository, method, arguments));
        }
        return invokeRepository(databaseRepository, method, arguments);
    }

    private Object invokeRepository(
            PaymentCommissionTransactionRepository databaseRepository,
            Method method,
            Object[] arguments
    ) throws Throwable {
        try {
            return method.invoke(databaseRepository, arguments);
        } catch (InvocationTargetException exception) {
            throw exception.getCause();
        }
    }

    private final class LockProbe {
        private final CountDownLatch firstHasTransactionLock;
        private final CountDownLatch secondAttemptedTransactionLock;
        private final CountDownLatch releaseFirstTransaction;
        private final AtomicReference<String> firstThread = new AtomicReference<>();
        private final AtomicReference<String> secondObservedStatus = new AtomicReference<>();

        private LockProbe(
                CountDownLatch firstHasTransactionLock,
                CountDownLatch secondAttemptedTransactionLock,
                CountDownLatch releaseFirstTransaction
        ) {
            this.firstHasTransactionLock = firstHasTransactionLock;
            this.secondAttemptedTransactionLock = secondAttemptedTransactionLock;
            this.releaseFirstTransaction = releaseFirstTransaction;
        }

        private Object invoke(ThrowingSupplier supplier) throws Throwable {
            if (firstThread.compareAndSet(null, Thread.currentThread().getName())) {
                Object locked = supplier.get();
                firstHasTransactionLock.countDown();
                await(secondAttemptedTransactionLock);
                await(releaseFirstTransaction);
                return locked;
            }

            secondAttemptedTransactionLock.countDown();
            Object locked = supplier.get();
            ((Optional<CommissionTransaction>) locked)
                    .ifPresent(transaction -> secondObservedStatus.set(transaction.getStatus()));
            return locked;
        }
    }

    @FunctionalInterface
    private interface ThrowingSupplier {
        Object get() throws Throwable;
    }
}
