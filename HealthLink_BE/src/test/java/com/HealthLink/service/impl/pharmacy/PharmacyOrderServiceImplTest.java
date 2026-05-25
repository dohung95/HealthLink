package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyConsultationOrderCreateRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.dto.pharmacy.PharmacyOrderStatusRequest;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.PharmacyConsultationRequest;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.exception.ForbiddenException;
import com.HealthLink.repository.notification.DeviceTokenRepository;
import com.HealthLink.repository.pharmacy.PharmacyConsultationRequestRepository;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.notification.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PharmacyOrderServiceImplTest {

    @Mock
    private PharmacyOrderRepository orderRepository;

    @Mock
    private PharmacyConsultationRequestRepository consultationRequestRepository;

    @Mock
    private PharmacyRepository pharmacyRepository;

    @Mock
    private PrescriptionHeaderRepository prescriptionHeaderRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private DeviceTokenRepository deviceTokenRepository;

    @InjectMocks
    private PharmacyOrderServiceImpl pharmacyOrderService;

    @Test
    void createOrderFromPrescription_shouldNotifyPharmacyAndKeepPrescriptionIssued() {
        User doctorUser = User.builder().id("doctor-user-1").build();
        User pharmacyUser = User.builder().id("pharmacy-user-1").build();

        PrescriptionHeader prescription = prescription(doctorUser);
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .deliveryFee(new BigDecimal("5.50"))
                .deliveryAvailable(true)
                .active(true)
                .verified(true)
                .user(pharmacyUser)
                .build();

        PharmacyOrderRequest request = new PharmacyOrderRequest();
        request.setPrescriptionHeaderId(10);
        request.setPharmacyId("pharmacy-1");
        request.setDeliveryAddress("123 Main St");
        request.setPaymentMethod("COD");

        when(prescriptionHeaderRepository.findById(10)).thenReturn(Optional.of(prescription));
        when(orderRepository.existsByPrescriptionHeader_PrescriptionHeaderId(10)).thenReturn(false);
        when(orderRepository.existsByOrderNumber(anyString())).thenReturn(false);
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));
        when(orderRepository.save(any(PharmacyOrder.class))).thenAnswer(invocation -> {
            PharmacyOrder saved = invocation.getArgument(0);
            saved.setOrderId(77);
            return saved;
        });

        PharmacyOrderResponse response =
                pharmacyOrderService.createOrderFromPrescription(request, "patient-1");

        verify(prescriptionHeaderRepository, never()).save(any(PrescriptionHeader.class));
        assertThat(prescription.getStatus()).isEqualTo("ISSUED");

        verify(notificationService).sendWebSocketNotification(
                eq(pharmacyUser),
                eq(NotificationType.NEW_ORDER),
                eq("New pharmacy order"),
                contains("Patient One"),
                eq(77),
                eq("/pharmacy-orders/77")
        );
        verify(notificationService, never()).sendWebSocketNotification(
                eq(doctorUser),
                any(NotificationType.class),
                anyString(),
                anyString(),
                eq(77),
                eq("/pharmacy-orders/77")
        );

        assertThat(response.getOrderId()).isEqualTo(77);
        assertThat(response.getDoctorId()).isEqualTo("doctor-1");
        assertThat(response.getAppointmentId()).isEqualTo(22);
        assertThat(response.getDeliveryFee()).isEqualByComparingTo("5.50");
        assertThat(response.getTotalAmount()).isEqualByComparingTo("35.50");
    }

    @Test
    void createOrderFromPrescription_shouldRejectPrescriptionOwnedByAnotherPatient() {
        PharmacyOrderRequest request = new PharmacyOrderRequest();
        request.setPrescriptionHeaderId(10);
        request.setPharmacyId("pharmacy-1");

        when(prescriptionHeaderRepository.findById(10)).thenReturn(Optional.of(prescription(User.builder().build())));

        assertThatThrownBy(() -> pharmacyOrderService.createOrderFromPrescription(request, "patient-2"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("You are not allowed to create an order for this prescription");

        verify(orderRepository, never()).save(any(PharmacyOrder.class));
        verify(pharmacyRepository, never()).findById(anyString());
    }

    @Test
    void createOrderFromConsultationRequest_shouldCreateDirectOrderAndNotifyPatient() {
        User patientUser = User.builder().id("patient-user-1").build();
        User pharmacyUser = User.builder().id("pharmacy-user-1").build();

        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .deliveryFee(new BigDecimal("4.00"))
                .deliveryAvailable(true)
                .active(true)
                .verified(true)
                .user(pharmacyUser)
                .build();

        Patient patient = Patient.builder()
                .patientId("patient-1")
                .fullName("Patient One")
                .address("45 Oak Street")
                .city("New York")
                .country("USA")
                .latitude(40.7128)
                .longitude(-74.0060)
                .user(patientUser)
                .build();

        PharmacyConsultationRequest consultationRequest = PharmacyConsultationRequest.builder()
                .requestId(15)
                .patient(patient)
                .pharmacy(pharmacy)
                .preferredDeliveryType("Delivery")
                .additionalNotes("Needs delivery after 6 PM")
                .status("IN_REVIEW")
                .build();

        PharmacyConsultationOrderCreateRequest request = new PharmacyConsultationOrderCreateRequest();
        request.setMedicineAmount(new BigDecimal("30.00"));
        request.setPaymentMethod("COD");
        request.setPharmacistNotes("Prepared based on consultation");

        when(consultationRequestRepository.findById(15)).thenReturn(Optional.of(consultationRequest));
        when(orderRepository.existsByConsultationRequest_RequestId(15)).thenReturn(false);
        when(orderRepository.existsByOrderNumber(anyString())).thenReturn(false);
        when(orderRepository.save(any(PharmacyOrder.class))).thenAnswer(invocation -> {
            PharmacyOrder saved = invocation.getArgument(0);
            saved.setOrderId(88);
            return saved;
        });
        when(consultationRequestRepository.save(any(PharmacyConsultationRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(deviceTokenRepository.findByUser_IdAndActiveTrue("patient-user-1")).thenReturn(List.of());

        PharmacyOrderResponse response =
                pharmacyOrderService.createOrderFromConsultationRequest(15, request, "pharmacy-1");

        verify(notificationService).sendWebSocketNotification(
                eq(patientUser),
                eq(NotificationType.NEW_ORDER),
                eq("Pharmacy order created"),
                contains("request 15"),
                eq(88),
                eq("/pharmacy-orders/88")
        );

        ArgumentCaptor<PharmacyConsultationRequest> consultationRequestCaptor =
                ArgumentCaptor.forClass(PharmacyConsultationRequest.class);
        verify(consultationRequestRepository).save(consultationRequestCaptor.capture());
        assertThat(consultationRequestCaptor.getValue().getStatus()).isEqualTo("ORDER_CREATED");

        assertThat(response.getOrderId()).isEqualTo(88);
        assertThat(response.getPharmacyRequestId()).isEqualTo(15);
        assertThat(response.getPrescriptionHeaderId()).isNull();
        assertThat(response.getDeliveryFee()).isEqualByComparingTo("4.00");
        assertThat(response.getTotalAmount()).isEqualByComparingTo("34.00");
    }

    @Test
    void updateOrderStatus_shouldNotifyPatientOnlyForIntermediateStatus() {
        User doctorUser = User.builder().id("doctor-user-1").build();
        User patientUser = User.builder().id("patient-user-1").build();

        PrescriptionHeader prescription = prescription(doctorUser);
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(77)
                .orderNumber("ORD-20260520-0001")
                .prescriptionHeader(prescription)
                .pharmacy(Pharmacy.builder()
                        .pharmacyId("pharmacy-1")
                        .name("Central Pharmacy")
                        .build())
                .patient(Patient.builder()
                        .patientId("patient-1")
                        .fullName("Patient One")
                        .user(patientUser)
                        .build())
                .status("Pending")
                .build();

        PharmacyOrderStatusRequest request = new PharmacyOrderStatusRequest();
        request.setStatus("Confirmed");

        when(orderRepository.findById(77)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(PharmacyOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(deviceTokenRepository.findByUser_IdAndActiveTrue("patient-user-1")).thenReturn(List.of());

        PharmacyOrderResponse response = pharmacyOrderService.updateOrderStatus(77, request);

        verify(notificationService).sendWebSocketNotification(
                eq(patientUser),
                eq(NotificationType.ORDER_STATUS),
                eq("Order status updated"),
                contains("CONFIRMED"),
                eq(77),
                eq("/pharmacy-orders/77")
        );
        verify(notificationService, never()).sendWebSocketNotification(
                eq(doctorUser),
                eq(NotificationType.INVOICE_PAID),
                anyString(),
                anyString(),
                eq(77),
                eq("/pharmacy-orders/77")
        );

        assertThat(response.getStatus()).isEqualTo("CONFIRMED");
        assertThat(response.getConfirmedAt()).isNotNull();
    }

    @Test
    void updateOrderStatus_shouldNotifyDoctorWhenOrderBecomesCompletedAndAlreadyPaid() {
        User doctorUser = User.builder().id("doctor-user-1").build();
        User patientUser = User.builder().id("patient-user-1").build();

        PrescriptionHeader prescription = prescription(doctorUser);
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(77)
                .orderNumber("ORD-20260520-0001")
                .prescriptionHeader(prescription)
                .pharmacy(Pharmacy.builder()
                        .pharmacyId("pharmacy-1")
                        .name("Central Pharmacy")
                        .build())
                .patient(Patient.builder()
                        .patientId("patient-1")
                        .fullName("Patient One")
                        .user(patientUser)
                        .build())
                .status("Delivered")
                .paymentStatus("Paid")
                .build();

        PharmacyOrderStatusRequest request = new PharmacyOrderStatusRequest();
        request.setStatus("Completed");

        when(orderRepository.findById(77)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(PharmacyOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(deviceTokenRepository.findByUser_IdAndActiveTrue("patient-user-1")).thenReturn(List.of());

        PharmacyOrderResponse response = pharmacyOrderService.updateOrderStatus(77, request);

        verify(notificationService).sendWebSocketNotification(
                eq(doctorUser),
                eq(NotificationType.INVOICE_PAID),
                eq("Pharmacy order completed and paid"),
                contains("payment has been confirmed"),
                eq(77),
                eq("/pharmacy-orders/77")
        );

        assertThat(response.getStatus()).isEqualTo("COMPLETED");
    }

    private PrescriptionHeader prescription(User doctorUser) {
        Doctor doctor = Doctor.builder()
                .doctorId("doctor-1")
                .fullName("Doctor One")
                .user(doctorUser)
                .build();

        return PrescriptionHeader.builder()
                .prescriptionHeaderId(10)
                .appointment(Appointment.builder().appointmentId(22).build())
                .patient(Patient.builder()
                        .patientId("patient-1")
                        .fullName("Patient One")
                        .address("45 Oak Street")
                        .city("New York")
                        .country("USA")
                        .build())
                .doctor(doctor)
                .totalAmount(new BigDecimal("30.00"))
                .status("ISSUED")
                .build();
    }
}
