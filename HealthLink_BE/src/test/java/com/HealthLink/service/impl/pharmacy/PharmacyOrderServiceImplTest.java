package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.CancelOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyConsultationOrderCreateRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderItemRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderRevisionRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.dto.pharmacy.PharmacyOrderStatusRequest;
import com.HealthLink.dto.pharmacy.RetailCartItemRequest;
import com.HealthLink.dto.pharmacy.RetailOrderRequest;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Medicine;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.PharmacyConsultationRequest;
import com.HealthLink.entity.PharmacyConsultationRequestPrescription;
import com.HealthLink.entity.PharmacyInventory;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.entity.PrescriptionItem;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ForbiddenException;
import com.HealthLink.repository.medicine.MedicineRepository;
import com.HealthLink.repository.notification.DeviceTokenRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.repository.pharmacy.PharmacyConsultationRequestRepository;
import com.HealthLink.repository.pharmacy.PharmacyInventoryRepository;
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
    private MedicineRepository medicineRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private PharmacyInventoryRepository inventoryRepository;

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
                .deliveryRadius(10.0)
                .latitude(40.7128)
                .longitude(-74.0060)
                .deliveryAvailable(true)
                .active(true)
                .verified(true)
                .user(pharmacyUser)
                .build();

        PharmacyOrderRequest request = new PharmacyOrderRequest();
        request.setPrescriptionHeaderId(10);
        request.setPharmacyId("pharmacy-1");
        request.setDeliveryAddress("123 Main St");
        request.setDeliveryLatitude(40.7128);
        request.setDeliveryLongitude(-74.0060);
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
        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getItems().get(0).getMedicationName()).isEqualTo("Amlodipine 5mg");
        assertThat(response.getItems().get(0).getSourcePrescriptionHeaderId()).isEqualTo(10);
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
    void createOrderFromConsultationRequest_shouldCreateItemizedOrderAndNotifyPatient() {
        User patientUser = User.builder().id("patient-user-1").build();
        User pharmacyUser = User.builder().id("pharmacy-user-1").build();

        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .deliveryFee(new BigDecimal("4.00"))
                .deliveryRadius(10.0)
                .latitude(40.7128)
                .longitude(-74.0060)
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
                .deliveryType("Delivery")
                .deliveryAddress("12 Nguyen Trai, Hanoi")
                .deliveryLatitude(21.0285)
                .deliveryLongitude(105.8542)
                .deliveryPhoneNumber("0912345678")
                .deliveryAddressSource("MANUAL")
                .build();

        PharmacyConsultationOrderCreateRequest request = new PharmacyConsultationOrderCreateRequest();
        request.setItems(List.of(orderItemRequest(1, 2)));
        // Explicitly set delivery fields on request (overrides consultation request defaults)
        request.setDeliveryAddress("12 Nguyen Trai, Hanoi");
        request.setDeliveryLatitude(40.7130);
        request.setDeliveryLongitude(-74.0055);
        request.setDeliveryPhoneNumber("0912345678");
        request.setDeliveryAddressSource("MANUAL");
        request.setEstimatedDeliveryMinutes(45);
        request.setPaymentMethod("COD");
        request.setPharmacistNotes("Prepared based on consultation");

        when(consultationRequestRepository.findById(15)).thenReturn(Optional.of(consultationRequest));
        when(orderRepository.existsByConsultationRequest_RequestId(15)).thenReturn(false);
        when(orderRepository.existsByOrderNumber(anyString())).thenReturn(false);
        when(medicineRepository.findById(1)).thenReturn(Optional.of(medicine(1, "Amlodipine 5mg", "tablet")));
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
        assertThat(response.getMedicineAmount()).isEqualByComparingTo("30.00");
        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getItems().get(0).getTotalPrice()).isEqualByComparingTo("30.00");

        assertThat(response.getDeliveryAddress()).isEqualTo("12 Nguyen Trai, Hanoi");
        assertThat(response.getDeliveryLatitude()).isEqualTo(40.7130);
        assertThat(response.getDeliveryLongitude()).isEqualTo(-74.0055);
        assertThat(response.getDeliveryPhoneNumber()).isEqualTo("0912345678");
        assertThat(response.getDeliveryAddressSource()).isEqualTo("MANUAL");
    }

    @Test
    void createOrderFromConsultationRequest_shouldRejectEmptyMedicationList() {
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .deliveryAvailable(true)
                .active(true)
                .verified(true)
                .build();
        PharmacyConsultationRequest consultationRequest = PharmacyConsultationRequest.builder()
                .requestId(15)
                .patient(Patient.builder().patientId("patient-1").build())
                .pharmacy(pharmacy)
                .status("IN_REVIEW")
                .build();
        PharmacyConsultationOrderCreateRequest request = new PharmacyConsultationOrderCreateRequest();

        when(consultationRequestRepository.findById(15)).thenReturn(Optional.of(consultationRequest));
        when(orderRepository.existsByConsultationRequest_RequestId(15)).thenReturn(false);

        assertThatThrownBy(() ->
                pharmacyOrderService.createOrderFromConsultationRequest(15, request, "pharmacy-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Order must have at least 1 medication");

        verify(orderRepository, never()).save(any(PharmacyOrder.class));
    }

    @Test
    void createOrderFromConsultationRequest_shouldAcceptSourcePrescriptionSentWithRequest() {
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .active(true)
                .verified(true)
                .build();
        Patient patient = Patient.builder().patientId("patient-1").fullName("Patient One").build();
        PrescriptionHeader prescription = prescription(User.builder().build());
        PharmacyConsultationRequest consultationRequest = PharmacyConsultationRequest.builder()
                .requestId(15)
                .patient(patient)
                .pharmacy(pharmacy)
                .preferredDeliveryType("Pickup")
                .status("IN_REVIEW")
                .build();
        consultationRequest.getRequestPrescriptions().add(PharmacyConsultationRequestPrescription.builder()
                .consultationRequest(consultationRequest)
                .prescriptionHeader(prescription)
                .build());
        PharmacyOrderItemRequest itemRequest = orderItemRequest(1, 2);
        itemRequest.setSourcePrescriptionHeaderId(10);
        itemRequest.setSourcePrescriptionItemId(101);
        PharmacyConsultationOrderCreateRequest request = new PharmacyConsultationOrderCreateRequest();
        request.setDeliveryType("Pickup");
        request.setItems(List.of(itemRequest));

        when(consultationRequestRepository.findById(15)).thenReturn(Optional.of(consultationRequest));
        when(orderRepository.existsByConsultationRequest_RequestId(15)).thenReturn(false);
        when(orderRepository.existsByOrderNumber(anyString())).thenReturn(false);
        when(medicineRepository.findById(1)).thenReturn(Optional.of(medicine(1, "Amlodipine 5mg", "tablet")));
        when(orderRepository.save(any(PharmacyOrder.class))).thenAnswer(invocation -> {
            PharmacyOrder saved = invocation.getArgument(0);
            saved.setOrderId(89);
            return saved;
        });
        when(consultationRequestRepository.save(any(PharmacyConsultationRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PharmacyOrderResponse response =
                pharmacyOrderService.createOrderFromConsultationRequest(15, request, "pharmacy-1");

        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getItems().get(0).getSourcePrescriptionHeaderId()).isEqualTo(10);
        assertThat(response.getItems().get(0).getSourcePrescriptionItemId()).isEqualTo(101);
    }

    @Test
    void createRetailOrder_shouldRejectPrescriptionRequiredMedicine() {
        User patientUser = User.builder().id("patient-user-1").phoneNumber("0900000000").build();
        Patient patient = Patient.builder()
                .patientId("patient-1")
                .fullName("Patient One")
                .address("123 Main St")
                .city("New York")
                .country("USA")
                .latitude(40.7128)
                .longitude(-74.0060)
                .user(patientUser)
                .build();
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .deliveryAvailable(true)
                .deliveryRadius(10.0)
                .latitude(40.7128)
                .longitude(-74.0060)
                .active(true)
                .verified(true)
                .build();
        Medicine medicine = Medicine.builder()
                .medicineId(1)
                .name("Antibiotic")
                .active(true)
                .prescriptionRequired(true)
                .price(new BigDecimal("10.00"))
                .build();
        RetailOrderRequest request = RetailOrderRequest.builder()
                .pharmacyId("pharmacy-1")
                .deliveryType("Delivery")
                .deliveryAddress("123 Main St")
                .deliveryLatitude(40.7128)
                .deliveryLongitude(-74.0060)
                .items(List.of(RetailCartItemRequest.builder().medicineId(1).quantity(1).build()))
                .build();

        when(patientRepository.findById("patient-1")).thenReturn(Optional.of(patient));
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));
        when(medicineRepository.findAllById(any())).thenReturn(List.of(medicine));

        assertThatThrownBy(() -> pharmacyOrderService.createRetailOrder(request, "patient-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("requires a prescription");
    }

    @Test
    void createRetailOrder_shouldCreatePendingDirectOrderWithInventoryPricing() {
        User patientUser = User.builder().id("patient-user-1").phoneNumber("0900000000").build();
        User pharmacyUser = User.builder().id("pharmacy-user-1").build();
        Patient patient = Patient.builder()
                .patientId("patient-1")
                .fullName("Patient One")
                .address("123 Main St")
                .city("New York")
                .country("USA")
                .latitude(40.7128)
                .longitude(-74.0060)
                .user(patientUser)
                .build();
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .deliveryAvailable(true)
                .deliveryFee(new BigDecimal("5.00"))
                .deliveryRadius(10.0)
                .latitude(40.7128)
                .longitude(-74.0060)
                .active(true)
                .verified(true)
                .user(pharmacyUser)
                .build();
        Medicine medicine = Medicine.builder()
                .medicineId(1)
                .name("Vitamin C")
                .unit("box")
                .active(true)
                .prescriptionRequired(false)
                .price(new BigDecimal("12.00"))
                .build();
        PharmacyInventory inventory = PharmacyInventory.builder()
                .pharmacy(pharmacy)
                .medicine(medicine)
                .quantity(10)
                .reservedQuantity(0)
                .active(true)
                .build();
        RetailOrderRequest request = RetailOrderRequest.builder()
                .pharmacyId("pharmacy-1")
                .deliveryType("Delivery")
                .deliveryAddress("123 Main St")
                .deliveryLatitude(40.7128)
                .deliveryLongitude(-74.0060)
                .deliveryPhoneNumber("0900000000")
                .deliveryAddressSource("PROFILE")
                .paymentMethod("EWallet")
                .notes("Please call before delivery.")
                .items(List.of(RetailCartItemRequest.builder().medicineId(1).quantity(2).build()))
                .build();

        when(patientRepository.findById("patient-1")).thenReturn(Optional.of(patient));
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));
        when(medicineRepository.findAllById(any())).thenReturn(List.of(medicine));
        when(orderRepository.existsByOrderNumber(anyString())).thenReturn(false);
        when(orderRepository.save(any(PharmacyOrder.class))).thenAnswer(invocation -> {
            PharmacyOrder saved = invocation.getArgument(0);
            saved.setOrderId(91);
            return saved;
        });

        PharmacyOrderResponse response = pharmacyOrderService.createRetailOrder(request, "patient-1");

        assertThat(response.getOrderId()).isEqualTo(91);
        assertThat(response.getPrescriptionHeaderId()).isNull();
        assertThat(response.getPharmacyRequestId()).isNull();
        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.getPaymentStatus()).isEqualTo("PENDING");
        assertThat(response.getMedicineAmount()).isEqualByComparingTo("24.00");
        assertThat(response.getDeliveryFee()).isEqualByComparingTo("5.00");
        assertThat(response.getItems()).hasSize(1);

        verify(notificationService).sendWebSocketNotification(
                eq(pharmacyUser),
                eq(NotificationType.NEW_ORDER),
                eq("New pharmacy order"),
                contains("Patient One"),
                eq(91),
                eq("/pharmacy-orders/91")
        );
    }

    @Test
    void createOrderFromConsultationRequest_shouldRejectSourcePrescriptionNotSentWithRequest() {
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .active(true)
                .verified(true)
                .build();
        PharmacyConsultationRequest consultationRequest = PharmacyConsultationRequest.builder()
                .requestId(15)
                .patient(Patient.builder().patientId("patient-1").build())
                .pharmacy(pharmacy)
                .preferredDeliveryType("Pickup")
                .status("IN_REVIEW")
                .build();
        PharmacyOrderItemRequest itemRequest = orderItemRequest(1, 2);
        itemRequest.setSourcePrescriptionHeaderId(10);
        itemRequest.setSourcePrescriptionItemId(101);
        PharmacyConsultationOrderCreateRequest request = new PharmacyConsultationOrderCreateRequest();
        request.setDeliveryType("Pickup");
        request.setItems(List.of(itemRequest));

        when(consultationRequestRepository.findById(15)).thenReturn(Optional.of(consultationRequest));
        when(orderRepository.existsByConsultationRequest_RequestId(15)).thenReturn(false);
        when(medicineRepository.findById(1)).thenReturn(Optional.of(medicine(1, "Amlodipine 5mg", "tablet")));

        assertThatThrownBy(() ->
                pharmacyOrderService.createOrderFromConsultationRequest(15, request, "pharmacy-1"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("Source prescription was not sent with this request");

        verify(prescriptionHeaderRepository, never()).findById(10);
        verify(orderRepository, never()).save(any(PharmacyOrder.class));
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

        PharmacyOrderResponse response = pharmacyOrderService.updateOrderStatus(77, request);

        verify(notificationService).sendWebSocketNotification(
                eq(patientUser),
                eq(NotificationType.ORDER_STATUS),
                eq("Order confirmed"),
                contains("has been confirmed"),
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

    @Test
    void createOrderFromConsultationRequest_shouldResolveEstimatedDeliveryMinutes() {
        User pharmacyUser = User.builder().id("pharmacy-user-1").build();

        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .deliveryFee(new BigDecimal("4.00"))
                .deliveryRadius(10.0)
                .latitude(40.7128)
                .longitude(-74.0060)
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
                .build();

        PharmacyConsultationRequest consultationRequest = PharmacyConsultationRequest.builder()
                .requestId(15)
                .patient(patient)
                .pharmacy(pharmacy)
                .preferredDeliveryType("Delivery")
                .status("IN_REVIEW")
                .build();

        PharmacyConsultationOrderCreateRequest request = new PharmacyConsultationOrderCreateRequest();
        request.setItems(List.of(orderItemRequest(1, 2)));
        request.setEstimatedDeliveryMinutes(45);
        request.setPaymentMethod("COD");

        when(consultationRequestRepository.findById(15)).thenReturn(Optional.of(consultationRequest));
        when(orderRepository.existsByConsultationRequest_RequestId(15)).thenReturn(false);
        when(orderRepository.existsByOrderNumber(anyString())).thenReturn(false);
        when(medicineRepository.findById(1)).thenReturn(Optional.of(medicine(1, "Amlodipine 5mg", "tablet")));
        when(orderRepository.save(any(PharmacyOrder.class))).thenAnswer(invocation -> {
            PharmacyOrder saved = invocation.getArgument(0);
            saved.setOrderId(90);
            return saved;
        });

        LocalDateTime before = LocalDateTime.now();
        PharmacyOrderResponse response =
                pharmacyOrderService.createOrderFromConsultationRequest(15, request, "pharmacy-1");
        LocalDateTime after = LocalDateTime.now();

        assertThat(response.getEstimatedDeliveryTime()).isNotNull();
        assertThat(response.getEstimatedDeliveryTime()).isAfter(before);
        assertThat(response.getEstimatedDeliveryTime()).isBefore(after.plusMinutes(46));
    }

    @Test
    void createOrderFromConsultationRequest_shouldRejectDeliveryWithoutEstimatedTime() {
        User pharmacyUser = User.builder().id("pharmacy-user-1").build();

        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .deliveryFee(new BigDecimal("4.00"))
                .deliveryRadius(10.0)
                .latitude(40.7128)
                .longitude(-74.0060)
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
                .build();

        PharmacyConsultationRequest consultationRequest = PharmacyConsultationRequest.builder()
                .requestId(15)
                .patient(patient)
                .pharmacy(pharmacy)
                .preferredDeliveryType("Delivery")
                .status("IN_REVIEW")
                .build();

        PharmacyConsultationOrderCreateRequest request = new PharmacyConsultationOrderCreateRequest();
        request.setItems(List.of(orderItemRequest(1, 2)));
        request.setPaymentMethod("COD");

        when(consultationRequestRepository.findById(15)).thenReturn(Optional.of(consultationRequest));
        when(orderRepository.existsByConsultationRequest_RequestId(15)).thenReturn(false);
        when(medicineRepository.findById(1)).thenReturn(Optional.of(medicine(1, "Amlodipine 5mg", "tablet")));

        assertThatThrownBy(() ->
                pharmacyOrderService.createOrderFromConsultationRequest(15, request, "pharmacy-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Estimated delivery time is required for delivery orders");

        verify(orderRepository, never()).save(any(PharmacyOrder.class));
    }

    @Test
    void createOrderFromConsultationRequest_shouldRejectInvalidEstimatedDeliveryMinutes() {
        User pharmacyUser = User.builder().id("pharmacy-user-1").build();

        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .deliveryFee(new BigDecimal("4.00"))
                .deliveryRadius(10.0)
                .latitude(40.7128)
                .longitude(-74.0060)
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
                .build();

        PharmacyConsultationRequest consultationRequest = PharmacyConsultationRequest.builder()
                .requestId(15)
                .patient(patient)
                .pharmacy(pharmacy)
                .preferredDeliveryType("Delivery")
                .status("IN_REVIEW")
                .build();

        PharmacyConsultationOrderCreateRequest request = new PharmacyConsultationOrderCreateRequest();
        request.setItems(List.of(orderItemRequest(1, 2)));
        request.setEstimatedDeliveryMinutes(1000);
        request.setPaymentMethod("COD");

        when(consultationRequestRepository.findById(15)).thenReturn(Optional.of(consultationRequest));
        when(orderRepository.existsByConsultationRequest_RequestId(15)).thenReturn(false);
        when(medicineRepository.findById(1)).thenReturn(Optional.of(medicine(1, "Amlodipine 5mg", "tablet")));

        assertThatThrownBy(() ->
                pharmacyOrderService.createOrderFromConsultationRequest(15, request, "pharmacy-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Estimated delivery minutes must be between 1 and 999");

        verify(orderRepository, never()).save(any(PharmacyOrder.class));
    }

    @Test
    void createOrderFromConsultationRequest_shouldRejectNegativeDeliveryFee() {
        User pharmacyUser = User.builder().id("pharmacy-user-1").build();

        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .deliveryFee(new BigDecimal("4.00"))
                .deliveryRadius(10.0)
                .latitude(40.7128)
                .longitude(-74.0060)
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
                .build();

        PharmacyConsultationRequest consultationRequest = PharmacyConsultationRequest.builder()
                .requestId(15)
                .patient(patient)
                .pharmacy(pharmacy)
                .preferredDeliveryType("Delivery")
                .status("IN_REVIEW")
                .build();

        PharmacyConsultationOrderCreateRequest request = new PharmacyConsultationOrderCreateRequest();
        request.setItems(List.of(orderItemRequest(1, 2)));
        request.setDeliveryFee(new BigDecimal("-1"));
        request.setEstimatedDeliveryMinutes(45);
        request.setPaymentMethod("COD");

        when(consultationRequestRepository.findById(15)).thenReturn(Optional.of(consultationRequest));
        when(orderRepository.existsByConsultationRequest_RequestId(15)).thenReturn(false);
        when(medicineRepository.findById(1)).thenReturn(Optional.of(medicine(1, "Amlodipine 5mg", "tablet")));

        assertThatThrownBy(() ->
                pharmacyOrderService.createOrderFromConsultationRequest(15, request, "pharmacy-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Delivery fee must be greater than or equal to 0");

        verify(orderRepository, never()).save(any(PharmacyOrder.class));
    }

    // =========================================================================
    // Tests for patient revision requests
    // =========================================================================

    @Test
    void requestOrderRevision_shouldMarkRevisionRequestedAndClearPatientConfirmation() {
        User pharmacyUser = User.builder().id("pharmacy-user-1").build();
        User patientUser = User.builder().id("patient-user-1").build();
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(77)
                .orderNumber("ORD-20260520-0001")
                .status("CONFIRMED")
                .paymentStatus("PENDING")
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
                .patientConfirmedAt(LocalDateTime.now().minusHours(2))
                .build();
        PharmacyOrderRevisionRequest request = new PharmacyOrderRevisionRequest();
        request.setReason("Please adjust delivery time");

        when(orderRepository.findById(77)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(PharmacyOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PharmacyOrderResponse response =
                pharmacyOrderService.requestOrderRevision(77, request, "patient-1");

        assertThat(response.getStatus()).isEqualTo("REVISION_REQUESTED");
        assertThat(order.getRevisionRequestNotes()).isEqualTo("Please adjust delivery time");
        assertThat(order.getRevisionRequestedAt()).isNotNull();
        assertThat(order.getRevisionResolvedAt()).isNull();
        assertThat(order.getPatientConfirmedAt()).isNull();
        verify(orderRepository).save(order);
    }

    @Test
    void requestOrderRevision_shouldRejectOrderOwnedByAnotherPatient() {
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(77)
                .status("CONFIRMED")
                .paymentStatus("PENDING")
                .patient(Patient.builder().patientId("patient-2").build())
                .build();
        PharmacyOrderRevisionRequest request = new PharmacyOrderRevisionRequest();
        request.setReason("Wrong quote");

        when(orderRepository.findById(77)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> pharmacyOrderService.requestOrderRevision(77, request, "patient-1"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("You are not allowed to request revision for this order");

        verify(orderRepository, never()).save(any(PharmacyOrder.class));
    }

    @Test
    void requestOrderRevision_shouldRejectPaidOrder() {
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(77)
                .status("CONFIRMED")
                .paymentStatus("PAID")
                .patient(Patient.builder().patientId("patient-1").build())
                .build();
        PharmacyOrderRevisionRequest request = new PharmacyOrderRevisionRequest();
        request.setReason("Wrong quote");

        when(orderRepository.findById(77)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> pharmacyOrderService.requestOrderRevision(77, request, "patient-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Cannot request revision for a paid order");

        verify(orderRepository, never()).save(any(PharmacyOrder.class));
    }

    // =========================================================================
    // Tests for pharmacy quote updates
    // =========================================================================

    @Test
    void updateOrderQuote_shouldUpdateAmountsResetStatusAndClearPatientConfirmation() {
        User patientUser = User.builder().id("patient-user-1").build();
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .active(true)
                .verified(true)
                .build();
        Patient patient = Patient.builder()
                .patientId("patient-1")
                .fullName("Patient One")
                .user(patientUser)
                .build();
        PharmacyConsultationRequest consultationRequest = PharmacyConsultationRequest.builder()
                .requestId(15)
                .patient(patient)
                .pharmacy(pharmacy)
                .preferredDeliveryType("Delivery")
                .status("ORDER_CREATED")
                .build();
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(77)
                .orderNumber("ORD-20260520-0001")
                .status("REVISION_REQUESTED")
                .paymentStatus("PENDING")
                .patient(patient)
                .pharmacy(pharmacy)
                .consultationRequest(consultationRequest)
                .deliveryAddress("45 Oak Street")
                .deliveryLatitude(40.7128)
                .deliveryLongitude(-74.0060)
                .patientConfirmedAt(LocalDateTime.now().minusHours(1))
                .revisionRequestNotes("Need a different quote")
                .revisionRequestedAt(LocalDateTime.now().minusHours(2))
                .build();
        PharmacyConsultationOrderCreateRequest request = new PharmacyConsultationOrderCreateRequest();
        request.setDeliveryType("Delivery");
        request.setDeliveryFee(new BigDecimal("4.50"));
        request.setEstimatedDeliveryTime(LocalDateTime.now().plusHours(2));
        request.setPaymentMethod("COD");
        request.setPharmacistNotes("Updated quote");
        request.setItems(List.of(orderItemRequest(1, 3)));

        when(orderRepository.findById(77)).thenReturn(Optional.of(order));
        when(medicineRepository.findById(1)).thenReturn(Optional.of(medicine(1, "Amlodipine 5mg", "tablet")));
        when(orderRepository.save(any(PharmacyOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(deviceTokenRepository.findByUser_IdAndActiveTrue("patient-user-1")).thenReturn(List.of());

        PharmacyOrderResponse response =
                pharmacyOrderService.updateOrderQuote(77, request, "pharmacy-1");

        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.getMedicineAmount()).isEqualByComparingTo("45.00");
        assertThat(response.getDeliveryFee()).isEqualByComparingTo("4.50");
        assertThat(response.getTotalAmount()).isEqualByComparingTo("49.50");
        assertThat(response.getPharmacistNotes()).isEqualTo("Updated quote");
        assertThat(order.getPatientConfirmedAt()).isNull();
        assertThat(order.getRevisionResolvedAt()).isNotNull();
        assertThat(order.getOrderItems()).hasSize(1);
        verify(orderRepository).save(order);
    }

    @Test
    void updateOrderQuote_shouldRejectOrderOwnedByAnotherPharmacy() {
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(77)
                .status("REVISION_REQUESTED")
                .paymentStatus("PENDING")
                .pharmacy(Pharmacy.builder().pharmacyId("pharmacy-2").build())
                .build();
        PharmacyConsultationOrderCreateRequest request = new PharmacyConsultationOrderCreateRequest();

        when(orderRepository.findById(77)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> pharmacyOrderService.updateOrderQuote(77, request, "pharmacy-1"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("You are not allowed to update this order");

        verify(orderRepository, never()).save(any(PharmacyOrder.class));
    }

    @Test
    void updateOrderQuote_shouldRejectPaidOrder() {
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(77)
                .status("REVISION_REQUESTED")
                .paymentStatus("PAID")
                .pharmacy(Pharmacy.builder().pharmacyId("pharmacy-1").build())
                .build();
        PharmacyConsultationOrderCreateRequest request = new PharmacyConsultationOrderCreateRequest();

        when(orderRepository.findById(77)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> pharmacyOrderService.updateOrderQuote(77, request, "pharmacy-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Cannot update quote for a paid order");

        verify(orderRepository, never()).save(any(PharmacyOrder.class));
    }

    @Test
    void updateOrderQuote_shouldRejectTerminalOrderStatus() {
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(77)
                .status("CANCELLED")
                .paymentStatus("PENDING")
                .pharmacy(Pharmacy.builder().pharmacyId("pharmacy-1").build())
                .build();
        PharmacyConsultationOrderCreateRequest request = new PharmacyConsultationOrderCreateRequest();

        when(orderRepository.findById(77)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> pharmacyOrderService.updateOrderQuote(77, request, "pharmacy-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Cannot update quote for order with status CANCELLED");

        verify(orderRepository, never()).save(any(PharmacyOrder.class));
    }

    // =========================================================================
    // Tests for Order Request / Paid Cancel Policy (Task 3)
    // =========================================================================

    @Test
    void createOrderFromConsultationRequest_shouldAllowPendingOrderRequest() {
        User patientUser = User.builder().id("patient-user-1").build();
        User pharmacyUser = User.builder().id("pharmacy-user-1").build();

        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .deliveryFee(new BigDecimal("4.00"))
                .deliveryRadius(10.0)
                .latitude(40.7128)
                .longitude(-74.0060)
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

        PrescriptionHeader prescription = PrescriptionHeader.builder()
                .prescriptionHeaderId(10)
                .patient(patient)
                .totalAmount(new BigDecimal("30.00"))
                .status("ISSUED")
                .build();
        PrescriptionItem item = PrescriptionItem.builder()
                .prescriptionItemId(101)
                .prescriptionHeader(prescription)
                .medicine(medicine(1, "Amlodipine 5mg", "tablet"))
                .medicationName("Amlodipine 5mg")
                .totalSupplyDays(7)
                .quantity(2)
                .unit("tablet")
                .frequency("Twice daily")
                .timing("MORNING,EVENING")
                .build();
        prescription.setPrescriptionItems(List.of(item));

        PharmacyConsultationRequest consultationRequest = PharmacyConsultationRequest.builder()
                .requestId(15)
                .patient(patient)
                .pharmacy(pharmacy)
                .requestType("ORDER_REQUEST")
                .status("PENDING")
                .preferredDeliveryType("Pickup")
                .build();
        consultationRequest.getRequestPrescriptions().add(PharmacyConsultationRequestPrescription.builder()
                .consultationRequest(consultationRequest)
                .prescriptionHeader(prescription)
                .build());

        PharmacyConsultationOrderCreateRequest request = new PharmacyConsultationOrderCreateRequest();
        PharmacyOrderItemRequest itemRequest = orderItemRequest(1, 2);
        itemRequest.setSourcePrescriptionHeaderId(10);
        itemRequest.setSourcePrescriptionItemId(101);
        request.setDeliveryType("Pickup");
        request.setItems(List.of(itemRequest));
        request.setPaymentMethod("COD");

        when(consultationRequestRepository.findById(15)).thenReturn(Optional.of(consultationRequest));
        when(orderRepository.existsByConsultationRequest_RequestId(15)).thenReturn(false);
        when(orderRepository.existsByOrderNumber(anyString())).thenReturn(false);
        when(medicineRepository.findById(1)).thenReturn(Optional.of(medicine(1, "Amlodipine 5mg", "tablet")));
        when(orderRepository.save(any(PharmacyOrder.class))).thenAnswer(invocation -> {
            PharmacyOrder saved = invocation.getArgument(0);
            saved.setOrderId(91);
            return saved;
        });
        when(consultationRequestRepository.save(any(PharmacyConsultationRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PharmacyOrderResponse response =
                pharmacyOrderService.createOrderFromConsultationRequest(15, request, "pharmacy-1");

        assertThat(response.getOrderId()).isEqualTo(91);
        assertThat(response.getPharmacyRequestId()).isEqualTo(15);
        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.getItems()).hasSize(1);

        ArgumentCaptor<PharmacyConsultationRequest> captor =
                ArgumentCaptor.forClass(PharmacyConsultationRequest.class);
        verify(consultationRequestRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("ORDER_CREATED");
    }

    @Test
    void createOrderFromConsultationRequest_shouldRejectOrderRequestItemNotFromPrescription() {
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .deliveryAvailable(true)
                .active(true)
                .verified(true)
                .build();

        Patient patient = Patient.builder()
                .patientId("patient-1")
                .fullName("Patient One")
                .build();

        PrescriptionHeader prescription = PrescriptionHeader.builder()
                .prescriptionHeaderId(10)
                .patient(patient)
                .status("ISSUED")
                .build();
        PrescriptionItem item = PrescriptionItem.builder()
                .prescriptionItemId(101)
                .prescriptionHeader(prescription)
                .medicine(medicine(1, "Amlodipine 5mg", "tablet"))
                .medicationName("Amlodipine 5mg")
                .totalSupplyDays(7)
                .quantity(2)
                .unit("tablet")
                .build();
        prescription.setPrescriptionItems(List.of(item));

        PharmacyConsultationRequest consultationRequest = PharmacyConsultationRequest.builder()
                .requestId(15)
                .patient(patient)
                .pharmacy(pharmacy)
                .requestType("ORDER_REQUEST")
                .status("PENDING")
                .preferredDeliveryType("Pickup")
                .build();
        consultationRequest.getRequestPrescriptions().add(PharmacyConsultationRequestPrescription.builder()
                .consultationRequest(consultationRequest)
                .prescriptionHeader(prescription)
                .build());

        PharmacyConsultationOrderCreateRequest request = new PharmacyConsultationOrderCreateRequest();
        PharmacyOrderItemRequest itemRequest = orderItemRequest(1, 2);
        itemRequest.setSourcePrescriptionHeaderId(null);
        itemRequest.setSourcePrescriptionItemId(null);
        request.setDeliveryType("Pickup");
        request.setItems(List.of(itemRequest));

        when(consultationRequestRepository.findById(15)).thenReturn(Optional.of(consultationRequest));
        when(orderRepository.existsByConsultationRequest_RequestId(15)).thenReturn(false);
        when(medicineRepository.findById(1)).thenReturn(Optional.of(medicine(1, "Amlodipine 5mg", "tablet")));

        assertThatThrownBy(() ->
                pharmacyOrderService.createOrderFromConsultationRequest(15, request, "pharmacy-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Order request items must come from the submitted prescription");

        verify(orderRepository, never()).save(any(PharmacyOrder.class));
    }

    @Test
    void updateOrderStatus_shouldRejectCancellingPaidOrder() {
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(77)
                .orderNumber("ORD-20260520-0001")
                .status("PREPARING")
                .paymentStatus("PAID")
                .pharmacy(Pharmacy.builder()
                        .pharmacyId("pharmacy-1")
                        .name("Central Pharmacy")
                        .build())
                .patient(Patient.builder()
                        .patientId("patient-1")
                        .fullName("Patient One")
                        .build())
                .build();

        PharmacyOrderStatusRequest request = new PharmacyOrderStatusRequest();
        request.setStatus("CANCELLED");

        when(orderRepository.findById(77)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> pharmacyOrderService.updateOrderStatus(77, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Paid orders cannot be cancelled. Use the refund flow instead.");

        verify(orderRepository, never()).save(any(PharmacyOrder.class));
    }

    @Test
    void cancelOrderByPatient_shouldRejectPaidOrder() {
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(77)
                .orderNumber("ORD-20260520-0001")
                .status("CONFIRMED")
                .paymentStatus("PAID")
                .pharmacy(Pharmacy.builder()
                        .pharmacyId("pharmacy-1")
                        .name("Central Pharmacy")
                        .build())
                .patient(Patient.builder()
                        .patientId("patient-1")
                        .fullName("Patient One")
                        .build())
                .build();

        when(orderRepository.findById(77)).thenReturn(Optional.of(order));

        assertThatThrownBy(() ->
                pharmacyOrderService.cancelOrderByPatient(77, new CancelOrderRequest(), "patient-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Paid orders cannot be cancelled. Use the refund flow instead.");

        verify(orderRepository, never()).save(any(PharmacyOrder.class));
    }

    private PharmacyOrderItemRequest orderItemRequest(Integer medicineId, Integer quantity) {
        PharmacyOrderItemRequest request = new PharmacyOrderItemRequest();
        request.setMedicineId(medicineId);
        request.setQuantity(quantity);
        request.setTotalSupplyDays(7);
        request.setUnit("tablet");
        request.setFrequency("Twice daily");
        request.setTiming("MORNING,EVENING");
        return request;
    }

    private Medicine medicine(Integer medicineId, String name, String unit) {
        return Medicine.builder()
                .medicineId(medicineId)
                .name(name)
                .unit(unit)
                .price(new BigDecimal("15.00"))
                .build();
    }

    private PrescriptionHeader prescription(User doctorUser) {
        Doctor doctor = Doctor.builder()
                .doctorId("doctor-1")
                .fullName("Doctor One")
                .user(doctorUser)
                .build();

        PrescriptionHeader header = PrescriptionHeader.builder()
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
        PrescriptionItem item = PrescriptionItem.builder()
                .prescriptionItemId(101)
                .prescriptionHeader(header)
                .medicine(medicine(1, "Amlodipine 5mg", "tablet"))
                .medicationName("Amlodipine 5mg")
                .dosage("5mg")
                .instructions("Use as directed")
                .totalSupplyDays(7)
                .quantity(2)
                .unit("tablet")
                .frequency("Twice daily")
                .timing("MORNING,EVENING")
                .build();
        header.setPrescriptionItems(List.of(item));
        return header;
    }
}
