package com.HealthLink.service.impl.payment;

import com.HealthLink.config.PayPalConfig;
import com.HealthLink.dto.payment.PharmacyOrderPayPalCaptureRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Invoice;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.Payment;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.notification.DeviceTokenRepository;
import com.HealthLink.repository.payment.InvoiceRepository;
import com.HealthLink.repository.payment.PaymentRepository;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.notification.NotificationService;
import com.HealthLink.service.payment.CommissionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FinanceServiceImplTest {

    @Mock
    private PayPalConfig payPalConfig;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PrescriptionHeaderRepository prescriptionHeaderRepository;

    @Mock
    private PharmacyOrderRepository pharmacyOrderRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private DeviceTokenRepository deviceTokenRepository;

    @Mock
    private CommissionService commissionService;

    @InjectMocks
    private FinanceServiceImpl financeService;

    @Test
    void generateInvoice_shouldOnlyChargeConsultationFee() {
        Appointment appointment = Appointment.builder()
                .appointmentId(22)
                .status("Completed")
                .patient(Patient.builder()
                        .patientId("patient-1")
                        .build())
                .doctor(Doctor.builder()
                        .doctorId("doctor-1")
                        .consultationFee(new BigDecimal("80.00"))
                        .build())
                .build();

        when(appointmentRepository.findById(22)).thenReturn(Optional.of(appointment));
        when(invoiceRepository.existsByAppointment_AppointmentId(22)).thenReturn(false);
        when(invoiceRepository.count()).thenReturn(0L);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice invoice = invocation.getArgument(0);
            invoice.setInvoiceId(1);
            return invoice;
        });

        var response = financeService.generateInvoice(22);

        assertThat(response.getConsultationFee()).isEqualByComparingTo("80.00");
        assertThat(response.getMedicineFee()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getDeliveryFee()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getAmount()).isEqualByComparingTo("80.00");
        verifyNoInteractions(prescriptionHeaderRepository);
    }

    @Test
    void capturePharmacyOrderPayPalPayment_shouldNotifyDoctorWhenOrderAlreadyCompleted() throws Exception {
        User doctorUser = User.builder().id("doctor-user-1").build();
        User patientUser = User.builder().id("patient-user-1").build();
        User pharmacyUser = User.builder().id("pharmacy-user-1").build();

        PharmacyOrder pharmacyOrder = PharmacyOrder.builder()
                .orderId(77)
                .orderNumber("ORD-20260520-0001")
                .status("Completed")
                .paymentStatus("Pending")
                .totalAmount(new BigDecimal("35.50"))
                .patient(Patient.builder()
                        .patientId("patient-1")
                        .fullName("Patient One")
                        .user(patientUser)
                        .build())
                .pharmacy(Pharmacy.builder()
                        .pharmacyId("pharmacy-1")
                        .name("Central Pharmacy")
                        .user(pharmacyUser)
                        .build())
                .prescriptionHeader(PrescriptionHeader.builder()
                        .prescriptionHeaderId(10)
                        .doctor(Doctor.builder()
                                .doctorId("doctor-1")
                                .user(doctorUser)
                                .build())
                        .build())
                .build();

        PharmacyOrderPayPalCaptureRequest request = new PharmacyOrderPayPalCaptureRequest();
        request.setPharmacyOrderId(77);
        request.setOrderId("paypal-order-1");
        request.setPaymentMethod("Card");

        when(pharmacyOrderRepository.findById(77)).thenReturn(Optional.of(pharmacyOrder), Optional.of(pharmacyOrder));
        when(paymentRepository.findByTransactionId("paypal-order-1")).thenReturn(Optional.empty());
        when(payPalConfig.getClientId()).thenReturn("client-id");
        when(payPalConfig.getClientSecret()).thenReturn("client-secret");
        when(payPalConfig.getBaseUrl()).thenReturn("https://paypal.example");
        when(restTemplate.exchange(
                eq("https://paypal.example/v1/oauth2/token"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Map.class)
        )).thenReturn(new ResponseEntity<>(Map.of("access_token", "token-1"), HttpStatus.OK));
        when(restTemplate.exchange(
                eq("https://paypal.example/v2/checkout/orders/paypal-order-1/capture"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Map.class)
        )).thenReturn(new ResponseEntity<>(Map.of("status", "COMPLETED"), HttpStatus.OK));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(pharmacyOrderRepository.save(any(PharmacyOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(deviceTokenRepository.findByUser_IdAndActiveTrue("patient-user-1")).thenReturn(List.of());

        PharmacyOrderResponse response = financeService.capturePharmacyOrderPayPalPayment(request);

        ArgumentCaptor<PharmacyOrder> orderCaptor = ArgumentCaptor.forClass(PharmacyOrder.class);
        verify(pharmacyOrderRepository).save(orderCaptor.capture());
        assertThat(orderCaptor.getValue().getPaymentStatus()).isEqualTo("Paid");
        assertThat(orderCaptor.getValue().getDoctorCompletionPaidNotified()).isTrue();

        verify(notificationService).sendWebSocketNotification(
                eq(doctorUser),
                eq(NotificationType.INVOICE_PAID),
                eq("Pharmacy order completed and paid"),
                contains("payment has been confirmed"),
                eq(77),
                eq("/pharmacy-orders/77")
        );

        assertThat(response.getOrderId()).isEqualTo(77);
        assertThat(response.getPaymentStatus()).isEqualTo("Paid");
    }
}
