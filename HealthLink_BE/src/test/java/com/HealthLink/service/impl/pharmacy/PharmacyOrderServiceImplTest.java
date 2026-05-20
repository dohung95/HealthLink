package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.dto.pharmacy.PharmacyOrderStatusRequest;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.repository.notification.DeviceTokenRepository;
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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
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
    void transferPrescription_shouldNotifyPharmacyAndDoctor() {
        User doctorUser = User.builder().id("doctor-user-1").build();
        User pharmacyUser = User.builder().id("pharmacy-user-1").build();

        PrescriptionHeader prescription = prescription(doctorUser);
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .deliveryFee(new BigDecimal("5.50"))
                .user(pharmacyUser)
                .build();

        PharmacyOrderRequest request = new PharmacyOrderRequest();
        request.setPrescriptionHeaderId(10);
        request.setPharmacyId("pharmacy-1");
        request.setDeliveryAddress("123 Main St");
        request.setPaymentMethod("COD");

        when(orderRepository.existsByPrescriptionHeader_PrescriptionHeaderId(10)).thenReturn(false);
        when(orderRepository.existsByOrderNumber(anyString())).thenReturn(false);
        when(prescriptionHeaderRepository.findById(10)).thenReturn(Optional.of(prescription));
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));
        when(orderRepository.save(any(PharmacyOrder.class))).thenAnswer(invocation -> {
            PharmacyOrder saved = invocation.getArgument(0);
            saved.setOrderId(77);
            return saved;
        });
        when(prescriptionHeaderRepository.save(any(PrescriptionHeader.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PharmacyOrderResponse response = pharmacyOrderService.transferPrescription(request);

        ArgumentCaptor<PrescriptionHeader> prescriptionCaptor = ArgumentCaptor.forClass(PrescriptionHeader.class);
        verify(prescriptionHeaderRepository).save(prescriptionCaptor.capture());
        assertThat(prescriptionCaptor.getValue().getStatus()).isEqualTo("Sent");

        verify(notificationService).sendWebSocketNotification(
                eq(pharmacyUser),
                eq(NotificationType.NEW_ORDER),
                eq("New pharmacy order"),
                contains("Patient One"),
                eq(77),
                eq("/pharmacy-orders/77")
        );
        verify(notificationService).sendWebSocketNotification(
                eq(doctorUser),
                eq(NotificationType.PRESCRIPTION_SENT_TO_PHARMACY),
                eq("Prescription sent to pharmacy"),
                contains("Central Pharmacy"),
                eq(77),
                eq("/pharmacy-orders/77")
        );

        assertThat(response.getOrderId()).isEqualTo(77);
        assertThat(response.getDoctorId()).isEqualTo("doctor-1");
        assertThat(response.getAppointmentId()).isEqualTo(22);
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
                contains("Confirmed"),
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

        assertThat(response.getStatus()).isEqualTo("Confirmed");
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

        assertThat(response.getStatus()).isEqualTo("Completed");
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
                .status("Issued")
                .build();
    }
}
