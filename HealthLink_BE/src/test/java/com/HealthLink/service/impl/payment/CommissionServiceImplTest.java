package com.HealthLink.service.impl.payment;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.CommissionTransaction;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Invoice;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.payment.InvoiceRepository;
import com.HealthLink.repository.payment.PaymentCommissionTransactionRepository;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.notification.NotificationService;
import com.HealthLink.service.payment.FeeCalculatorService;
import com.HealthLink.service.payment.PartnerWalletLedgerService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.ReentrantLock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommissionServiceImplTest {

    @Mock
    private FeeCalculatorService feeCalculatorService;

    @Mock
    private PaymentCommissionTransactionRepository commissionTransactionRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private PharmacyOrderRepository pharmacyOrderRepository;

    @Mock
    private DoctorRepository doctorRepository;

    @Mock
    private PharmacyRepository pharmacyRepository;

    @Mock
    private PrescriptionHeaderRepository prescriptionHeaderRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private PartnerWalletLedgerService partnerWalletLedgerService;

    @InjectMocks
    private CommissionServiceImpl commissionService;

    @Test
    void processConsultationCommission_shouldProcessDoctorCommission() {
        User doctorUser = User.builder().id("doctor-user-1").build();
        Doctor doctor = Doctor.builder()
                .doctorId("doctor-1")
                .fullName("Doctor One")
                .user(doctorUser)
                .pendingSettlement(new BigDecimal("20.00"))
                .totalEarnings(new BigDecimal("100.00"))
                .build();
        Appointment appointment = Appointment.builder()
                .appointmentId(55)
                .doctor(doctor)
                .build();
        Invoice invoice = Invoice.builder()
                .invoiceId(77)
                .appointment(appointment)
                .consultationFee(new BigDecimal("50.00"))
                .build();

        when(commissionTransactionRepository.count()).thenReturn(0L);
        when(feeCalculatorService.calculateConsultationFee(appointment))
                .thenReturn(new FeeCalculatorService.FeeResult(
                        new BigDecimal("0.15"),
                        new BigDecimal("7.50"),
                        new BigDecimal("42.50"),
                        "ONLINE_CONSULTATION"
                ));

        commissionService.processConsultationCommission(invoice);

        verify(partnerWalletLedgerService).recordPendingEarning(any());
        assertThat(doctor.getTotalEarnings()).isEqualByComparingTo("100.00");
        assertThat(doctor.getPendingSettlement()).isEqualByComparingTo("20.00");
    }

    @Test
    void processPharmacyOrderCommission_recordsPendingEarningWithoutDirectBalanceMutation() {
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Pharmacy One")
                .totalEarnings(new BigDecimal("100.00"))
                .build();
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(56)
                .pharmacy(pharmacy)
                .medicineAmount(new BigDecimal("50.00"))
                .build();

        when(commissionTransactionRepository.count()).thenReturn(0L);
        when(feeCalculatorService.calculatePharmacyOrderFee(order))
                .thenReturn(new FeeCalculatorService.FeeResult(
                        new BigDecimal("0.15"),
                        new BigDecimal("7.50"),
                        new BigDecimal("42.50"),
                        "PHARMACY_ORDER"
                ));

        commissionService.processPharmacyOrderCommission(order);

        verify(partnerWalletLedgerService).recordPendingEarning(any());
        assertThat(pharmacy.getTotalEarnings()).isEqualByComparingTo("100.00");
    }

    @Test
    void vestConsultationCommission_vestsEarningThroughLedger() {
        CommissionTransaction tx = CommissionTransaction.builder()
                .transactionId(101)
                .appointmentId(55)
                .recipientType("DOCTOR")
                .status("PENDING")
                .netAmount(new BigDecimal("42.50"))
                .build();
        when(commissionTransactionRepository.findByAppointmentId(55)).thenReturn(List.of(tx));
        when(commissionTransactionRepository.findByIdForUpdate(101)).thenReturn(java.util.Optional.of(tx));

        commissionService.vestConsultationCommission(55);

        verify(partnerWalletLedgerService).vestEarning(tx);
        assertThat(tx.getStatus()).isEqualTo("VESTED");
        assertThat(tx.getVestedAt()).isNotNull();
    }

    @Test
    void vestPharmacyCommission_vestsEarningThroughLedger() {
        CommissionTransaction tx = CommissionTransaction.builder()
                .transactionId(102)
                .pharmacyOrderId(56)
                .recipientType("PHARMACY")
                .status("PENDING")
                .netAmount(new BigDecimal("42.50"))
                .build();
        when(commissionTransactionRepository.findByPharmacyOrderId(56)).thenReturn(List.of(tx));
        when(commissionTransactionRepository.findByIdForUpdate(102)).thenReturn(java.util.Optional.of(tx));

        commissionService.vestPharmacyCommission(56);

        verify(partnerWalletLedgerService).vestEarning(tx);
        assertThat(tx.getStatus()).isEqualTo("VESTED");
        assertThat(tx.getVestedAt()).isNotNull();
    }

    @Test
    void processRefund_recordsVestedEarningRefundAndTimestamp() {
        Appointment appointment = refundAppointment();
        Invoice invoice = Invoice.builder().invoiceId(77).appointment(appointment).build();
        CommissionTransaction tx = CommissionTransaction.builder()
                .transactionId(103)
                .appointmentId(55)
                .recipientType("DOCTOR")
                .status("VESTED")
                .netAmount(new BigDecimal("42.50"))
                .build();
        when(invoiceRepository.findById(77)).thenReturn(java.util.Optional.of(invoice));
        when(commissionTransactionRepository.findByAppointmentId(55)).thenReturn(List.of(tx));
        when(commissionTransactionRepository.findByIdForUpdate(103)).thenReturn(java.util.Optional.of(tx));
        when(prescriptionHeaderRepository.findByAppointment_AppointmentId(55)).thenReturn(List.of());
        when(pharmacyOrderRepository.findByPatient_PatientId(any())).thenReturn(List.of());

        commissionService.processRefund(77);

        verify(partnerWalletLedgerService).recordPatientRefund(tx, "VESTED");
        assertThat(tx.getStatus()).isEqualTo("REFUNDED");
        assertThat(tx.getRefundedAt()).isInstanceOf(LocalDateTime.class);
    }

    @Test
    void processRefund_cancelsPendingEarningWithoutDirectPartnerDebit() {
        Appointment appointment = refundAppointment();
        Invoice invoice = Invoice.builder().invoiceId(77).appointment(appointment).build();
        CommissionTransaction tx = CommissionTransaction.builder()
                .transactionId(104)
                .appointmentId(55)
                .recipientType("DOCTOR")
                .status("PENDING")
                .netAmount(new BigDecimal("42.50"))
                .build();
        when(invoiceRepository.findById(77)).thenReturn(java.util.Optional.of(invoice));
        when(commissionTransactionRepository.findByAppointmentId(55)).thenReturn(List.of(tx));
        when(commissionTransactionRepository.findByIdForUpdate(104)).thenReturn(java.util.Optional.of(tx));
        when(prescriptionHeaderRepository.findByAppointment_AppointmentId(55)).thenReturn(List.of());
        when(pharmacyOrderRepository.findByPatient_PatientId(any())).thenReturn(List.of());

        commissionService.processRefund(77);

        verify(partnerWalletLedgerService).recordPatientRefund(tx, "PENDING");
        verifyNoInteractions(doctorRepository);
    }

    @Test
    void processRefund_forwardsLegacySettledEarningForNegativeLedgerAdjustment() {
        Appointment appointment = refundAppointment();
        Invoice invoice = Invoice.builder().invoiceId(77).appointment(appointment).build();
        CommissionTransaction tx = CommissionTransaction.builder()
                .transactionId(105)
                .appointmentId(55)
                .recipientType("DOCTOR")
                .status("SETTLED")
                .netAmount(new BigDecimal("42.50"))
                .build();
        when(invoiceRepository.findById(77)).thenReturn(java.util.Optional.of(invoice));
        when(commissionTransactionRepository.findByAppointmentId(55)).thenReturn(List.of(tx));
        when(commissionTransactionRepository.findByIdForUpdate(105)).thenReturn(java.util.Optional.of(tx));
        when(prescriptionHeaderRepository.findByAppointment_AppointmentId(55)).thenReturn(List.of());
        when(pharmacyOrderRepository.findByPatient_PatientId(any())).thenReturn(List.of());

        commissionService.processRefund(77);

        verify(partnerWalletLedgerService).recordPatientRefund(tx, "SETTLED");
        verify(doctorRepository, never()).save(any());
    }

    @Test
    void concurrentVestAndRefundConvergeToRefundedTransactionAndZeroWalletBalance() throws Exception {
        Appointment appointment = refundAppointment();
        Invoice invoice = Invoice.builder().invoiceId(77).appointment(appointment).build();
        CommissionTransaction canonical = CommissionTransaction.builder()
                .transactionId(901)
                .appointmentId(55)
                .recipientType("DOCTOR")
                .recipientId("doctor-1")
                .status("PENDING")
                .netAmount(new BigDecimal("42.50"))
                .build();
        CountDownLatch bothReadPending = new CountDownLatch(2);
        CountDownLatch vestSaved = new CountDownLatch(1);
        CountDownLatch refundSaved = new CountDownLatch(1);
        CountDownLatch vestLedgered = new CountDownLatch(1);
        CountDownLatch vestLockedTransaction = new CountDownLatch(1);
        ReentrantLock transactionLock = new ReentrantLock(true);
        AtomicReference<BigDecimal> walletBalance = new AtomicReference<>(BigDecimal.ZERO);
        AtomicReference<String> earningStatus = new AtomicReference<>("PENDING");

        when(invoiceRepository.findById(77)).thenReturn(java.util.Optional.of(invoice));
        when(commissionTransactionRepository.findByAppointmentId(55)).thenAnswer(invocation -> {
            bothReadPending.countDown();
            await(bothReadPending);
            return List.of(CommissionTransaction.builder()
                    .transactionId(901)
                    .appointmentId(55)
                    .recipientType("DOCTOR")
                    .recipientId("doctor-1")
                    .status("PENDING")
                    .netAmount(new BigDecimal("42.50"))
                    .build());
        });
        when(prescriptionHeaderRepository.findByAppointment_AppointmentId(55)).thenReturn(List.of());
        when(pharmacyOrderRepository.findByPatient_PatientId(any())).thenReturn(List.of());
        when(commissionTransactionRepository.findByIdForUpdate(901)).thenAnswer(invocation -> {
            if (Thread.currentThread().getName().equals("refund")) {
                await(vestLockedTransaction);
            }
            transactionLock.lock();
            if (Thread.currentThread().getName().equals("vest")) {
                vestLockedTransaction.countDown();
            }
            return java.util.Optional.of(canonical);
        });
        when(commissionTransactionRepository.save(any(CommissionTransaction.class))).thenAnswer(invocation -> {
            CommissionTransaction saved = invocation.getArgument(0);
            if (transactionLock.isHeldByCurrentThread()) {
                return saved;
            }
            if (Thread.currentThread().getName().equals("vest")) {
                canonical.setStatus(saved.getStatus());
                vestSaved.countDown();
                await(refundSaved);
            } else {
                await(vestSaved);
                canonical.setStatus(saved.getStatus());
                refundSaved.countDown();
            }
            return saved;
        });
        org.mockito.Mockito.doAnswer(invocation -> {
            boolean lockHeld = transactionLock.isHeldByCurrentThread();
            if (!lockHeld) {
                await(refundSaved);
            }
            earningStatus.set("VESTED");
            walletBalance.updateAndGet(balance -> balance.add(new BigDecimal("42.50")));
            vestLedgered.countDown();
            if (lockHeld) {
                transactionLock.unlock();
            }
            return null;
        }).when(partnerWalletLedgerService).vestEarning(any(CommissionTransaction.class));
        org.mockito.Mockito.doAnswer(invocation -> {
            boolean lockHeld = transactionLock.isHeldByCurrentThread();
            if (!lockHeld) {
                await(vestLedgered);
            }
            if ("VESTED".equals(invocation.getArgument(1))) {
                earningStatus.set("REFUNDED");
                walletBalance.updateAndGet(balance -> balance.subtract(new BigDecimal("42.50")));
            }
            if (lockHeld) {
                transactionLock.unlock();
            }
            return null;
        }).when(partnerWalletLedgerService).recordPatientRefund(any(CommissionTransaction.class), any());

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<?> vest = executor.submit(() -> {
                Thread.currentThread().setName("vest");
                commissionService.vestConsultationCommission(55);
            });
            Future<?> refund = executor.submit(() -> {
                Thread.currentThread().setName("refund");
                commissionService.processRefund(77);
            });

            vest.get(2, TimeUnit.SECONDS);
            refund.get(2, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
        }

        assertThat(canonical.getStatus()).isEqualTo("REFUNDED");
        assertThat(earningStatus.get()).isEqualTo("REFUNDED");
        assertThat(walletBalance.get()).isEqualByComparingTo("0.00");
    }

    @Test
    void concurrentRefundThenVestLeavesPendingEarningCancelledAndWalletAtZero() throws Exception {
        Appointment appointment = refundAppointment();
        Invoice invoice = Invoice.builder().invoiceId(78).appointment(appointment).build();
        CommissionTransaction canonical = CommissionTransaction.builder()
                .transactionId(902)
                .appointmentId(55)
                .recipientType("DOCTOR")
                .recipientId("doctor-1")
                .status("PENDING")
                .netAmount(new BigDecimal("42.50"))
                .build();
        CountDownLatch refundLedgered = new CountDownLatch(1);
        AtomicReference<BigDecimal> walletBalance = new AtomicReference<>(BigDecimal.ZERO);
        AtomicReference<String> earningStatus = new AtomicReference<>("PENDING");

        when(invoiceRepository.findById(78)).thenReturn(java.util.Optional.of(invoice));
        when(commissionTransactionRepository.findByAppointmentId(55)).thenReturn(List.of(canonical));
        when(prescriptionHeaderRepository.findByAppointment_AppointmentId(55)).thenReturn(List.of());
        when(pharmacyOrderRepository.findByPatient_PatientId(any())).thenReturn(List.of());
        when(commissionTransactionRepository.findByIdForUpdate(902)).thenAnswer(invocation -> {
            if (Thread.currentThread().getName().equals("vest")) {
                await(refundLedgered);
            }
            return java.util.Optional.of(canonical);
        });
        when(commissionTransactionRepository.save(any(CommissionTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        org.mockito.Mockito.doAnswer(invocation -> {
            earningStatus.set("CANCELLED");
            refundLedgered.countDown();
            return null;
        }).when(partnerWalletLedgerService).recordPatientRefund(any(CommissionTransaction.class), any());

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<?> refund = executor.submit(() -> {
                Thread.currentThread().setName("refund");
                commissionService.processRefund(78);
            });
            Future<?> vest = executor.submit(() -> {
                Thread.currentThread().setName("vest");
                commissionService.vestConsultationCommission(55);
            });

            refund.get(2, TimeUnit.SECONDS);
            vest.get(2, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
        }

        assertThat(canonical.getStatus()).isEqualTo("REFUNDED");
        assertThat(earningStatus.get()).isEqualTo("CANCELLED");
        assertThat(walletBalance.get()).isEqualByComparingTo("0.00");
        verify(partnerWalletLedgerService, never()).vestEarning(any(CommissionTransaction.class));
    }

    private void await(CountDownLatch latch) throws InterruptedException {
        if (!latch.await(2, TimeUnit.SECONDS)) {
            throw new AssertionError("Timed out waiting for deterministic interleaving");
        }
    }

    private Appointment refundAppointment() {
        return Appointment.builder()
                .appointmentId(55)
                .patient(Patient.builder().patientId("patient-1").build())
                .build();
    }
}
