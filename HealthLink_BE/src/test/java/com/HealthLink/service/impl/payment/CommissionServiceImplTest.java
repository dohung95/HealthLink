package com.HealthLink.service.impl.payment;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Invoice;
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
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

        assertThat(doctor.getTotalEarnings()).isEqualByComparingTo("142.50");
        assertThat(doctor.getPendingSettlement()).isEqualByComparingTo("20.00");
    }
}
