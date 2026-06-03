package com.HealthLink.service.impl.payment;

import com.HealthLink.config.PayPalConfig;
import com.HealthLink.dto.payment.AppointmentPayPalCaptureRequest;
import com.HealthLink.dto.response.AppointmentResponse;
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
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.notification.DeviceTokenRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.repository.payment.InvoiceRepository;
import com.HealthLink.repository.payment.PaymentRepository;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.appointment.AppointmentService;
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
import static org.mockito.Mockito.never;
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
    private AppointmentService appointmentService;

    @Mock
    private DoctorRepository doctorRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PrescriptionHeaderRepository prescriptionHeaderRepository;

    @Mock
    private PharmacyOrderRepository pharmacyOrderRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private DeviceTokenRepository deviceTokenRepository;

    @Mock
    private CommissionService commissionService;

    @InjectMocks
    private FinanceServiceImpl financeService;

    @Test
    void captureAppointmentPayPalPayment_shouldCreateAppointmentAndPaidInvoiceAfterCapture() throws Exception {
        User doctorUser = User.builder().id("doctor-user-1").build();
        Patient patient = Patient.builder()
                .patientId("patient-1")
                .fullName("Patient One")
                .build();
        Doctor doctor = Doctor.builder()
                .doctorId("doctor-1")
                .fullName("Doctor One")
                .user(doctorUser)
                .consultationFee(new BigDecimal("100.00"))
                .build();
        Appointment appointment = Appointment.builder()
                .appointmentId(33)
                .status("PENDINGPAYMENT")
                .patient(patient)
                .doctor(doctor)
                .appointmentTime(java.time.LocalDateTime.now().plusDays(2))
                .consultationType("Video")
                .fee(new BigDecimal("100.00"))
                .build();

        AppointmentPayPalCaptureRequest request = new AppointmentPayPalCaptureRequest();
        request.setOrderId("paypal-order-2");
        request.setPatientId("patient-1");
        request.setDoctorId("doctor-1");
        request.setAppointmentTime(appointment.getAppointmentTime());
        request.setConsultationType("Video");
        request.setPaymentMethod("EWallet");

        Map<String, Object> captureBody = Map.of(
                "status", "COMPLETED",
                "purchase_units", List.of(Map.of(
                        "reference_id", "appointment-checkout",
                        "payments", Map.of(
                                "captures", List.of(Map.of(
                                        "amount", Map.of(
                                                "currency_code", "USD",
                                                "value", "100.00"
                                        )
                                ))
                        )
                ))
        );

        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(paymentRepository.findByTransactionId("paypal-order-2")).thenReturn(Optional.empty());
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
                eq("https://paypal.example/v2/checkout/orders/paypal-order-2/capture"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Map.class)
        )).thenReturn(new ResponseEntity<>(captureBody, HttpStatus.OK));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        when(appointmentService.createAppointment(any())).thenReturn(AppointmentResponse.builder()
                .appointmentId(33)
                .build());
        when(appointmentRepository.findById(33)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(invoiceRepository.count()).thenReturn(0L);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice invoice = invocation.getArgument(0);
            invoice.setInvoiceId(2);
            return invoice;
        });
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(invoiceRepository.findById(2)).thenAnswer(invocation -> Optional.of(appointment.getInvoice()));

        var response = financeService.captureAppointmentPayPalPayment(request);

        assertThat(response.getStatus()).isEqualTo("PAID");
        assertThat(response.getAppointmentId()).isEqualTo(33);
        assertThat(appointment.getStatus()).isEqualTo("SCHEDULED");
        assertThat(appointment.getConfirmedAt()).isNotNull();
        verify(appointmentService).createAppointment(any());
        verify(commissionService).processConsultationCommission(any(Invoice.class));
        verify(notificationService).sendWebSocketNotification(
                eq(doctorUser),
                eq(NotificationType.NEW_APPOINTMENT),
                eq("New appointment booked"),
                contains("Patient One booked a Video appointment at"),
                eq(33),
                eq("/appointments/33")
        );
    }

    @Test
    void capturePharmacyOrderPayPalPayment_shouldNotifyDoctorWhenOrderAlreadyCompleted() throws Exception {
        User doctorUser = User.builder().id("doctor-user-1").build();
        User patientUser = User.builder().id("patient-user-1").build();
        User pharmacyUser = User.builder().id("pharmacy-user-1").build();

        PharmacyOrder pharmacyOrder = PharmacyOrder.builder()
                .orderId(77)
                .orderNumber("ORD-20260520-0001")
                .status("COMPLETED")
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
        assertThat(orderCaptor.getValue().getPaymentStatus()).isEqualTo("PAID");
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
        assertThat(response.getPaymentStatus()).isEqualTo("PAID");
    }
}
