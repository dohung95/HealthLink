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
                .appointmentId(55)
                .recipientType("DOCTOR")
                .status("PENDING")
                .netAmount(new BigDecimal("42.50"))
                .build();
        when(commissionTransactionRepository.findByAppointmentId(55)).thenReturn(List.of(tx));

        commissionService.vestConsultationCommission(55);

        verify(partnerWalletLedgerService).vestEarning(tx);
        assertThat(tx.getStatus()).isEqualTo("VESTED");
        assertThat(tx.getVestedAt()).isNotNull();
    }

    @Test
    void vestPharmacyCommission_vestsEarningThroughLedger() {
        CommissionTransaction tx = CommissionTransaction.builder()
                .pharmacyOrderId(56)
                .recipientType("PHARMACY")
                .status("PENDING")
                .netAmount(new BigDecimal("42.50"))
                .build();
        when(commissionTransactionRepository.findByPharmacyOrderId(56)).thenReturn(List.of(tx));

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
                .appointmentId(55)
                .recipientType("DOCTOR")
                .status("VESTED")
                .netAmount(new BigDecimal("42.50"))
                .build();
        when(invoiceRepository.findById(77)).thenReturn(java.util.Optional.of(invoice));
        when(commissionTransactionRepository.findByAppointmentId(55)).thenReturn(List.of(tx));
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
                .appointmentId(55)
                .recipientType("DOCTOR")
                .status("PENDING")
                .netAmount(new BigDecimal("42.50"))
                .build();
        when(invoiceRepository.findById(77)).thenReturn(java.util.Optional.of(invoice));
        when(commissionTransactionRepository.findByAppointmentId(55)).thenReturn(List.of(tx));
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
                .appointmentId(55)
                .recipientType("DOCTOR")
                .status("SETTLED")
                .netAmount(new BigDecimal("42.50"))
                .build();
        when(invoiceRepository.findById(77)).thenReturn(java.util.Optional.of(invoice));
        when(commissionTransactionRepository.findByAppointmentId(55)).thenReturn(List.of(tx));
        when(prescriptionHeaderRepository.findByAppointment_AppointmentId(55)).thenReturn(List.of());
        when(pharmacyOrderRepository.findByPatient_PatientId(any())).thenReturn(List.of());

        commissionService.processRefund(77);

        verify(partnerWalletLedgerService).recordPatientRefund(tx, "SETTLED");
        verify(doctorRepository, never()).save(any());
    }

    private Appointment refundAppointment() {
        return Appointment.builder()
                .appointmentId(55)
                .patient(Patient.builder().patientId("patient-1").build())
                .build();
    }
}
