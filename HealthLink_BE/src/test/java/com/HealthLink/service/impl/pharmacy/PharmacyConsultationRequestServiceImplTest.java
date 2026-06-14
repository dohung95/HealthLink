package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyConsultationRequestCreateRequest;
import com.HealthLink.dto.pharmacy.PharmacyConsultationRequestResponse;
import com.HealthLink.dto.pharmacy.PharmacyConsultationRequestStatusUpdateRequest;
import com.HealthLink.dto.prescription.PrescriptionResponse;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.PharmacyConsultationRequest;
import com.HealthLink.entity.PharmacyConsultationRequestPrescription;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ForbiddenException;
import com.HealthLink.repository.notification.DeviceTokenRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.repository.pharmacy.PharmacyConsultationRequestRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.chat.ChatService;
import com.HealthLink.service.notification.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;

@ExtendWith(MockitoExtension.class)
class PharmacyConsultationRequestServiceImplTest {

    @Mock
    private PharmacyConsultationRequestRepository consultationRequestRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private PharmacyRepository pharmacyRepository;

    @Mock
    private PrescriptionHeaderRepository prescriptionHeaderRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private DeviceTokenRepository deviceTokenRepository;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private ChatService chatService;

    @InjectMocks
    private PharmacyConsultationRequestServiceImpl consultationRequestService;

    @Test
    void createRequest_shouldSaveSelectedPrescriptionLinksAndDeduplicateIds() {
        Patient patient = Patient.builder().patientId("patient-1").fullName("Patient One").build();
        Pharmacy pharmacy = Pharmacy.builder().pharmacyId("pharmacy-1").name("Central Pharmacy").build();
        PrescriptionHeader firstPrescription = prescription(1, patient, "ISSUED", LocalDateTime.now().plusDays(5));
        PrescriptionHeader secondPrescription = prescription(2, patient, "ISSUED", LocalDateTime.now().plusDays(10));
        PharmacyConsultationRequestCreateRequest request = new PharmacyConsultationRequestCreateRequest();
        request.setPatientId("patient-1");
        request.setPharmacyId("pharmacy-1");
        request.setDescription("Need medication review");
        request.setPrescriptionHeaderIds(List.of(1, 1, 2));

        when(patientRepository.findById("patient-1")).thenReturn(Optional.of(patient));
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));
        when(prescriptionHeaderRepository.findById(1)).thenReturn(Optional.of(firstPrescription));
        when(prescriptionHeaderRepository.findById(2)).thenReturn(Optional.of(secondPrescription));
        when(consultationRequestRepository.save(any(PharmacyConsultationRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PharmacyConsultationRequestResponse response = consultationRequestService.createRequest(request);

        ArgumentCaptor<PharmacyConsultationRequest> requestCaptor =
                ArgumentCaptor.forClass(PharmacyConsultationRequest.class);
        verify(consultationRequestRepository).save(requestCaptor.capture());
        PharmacyConsultationRequest saved = requestCaptor.getValue();

        assertThat(saved.getRequestPrescriptions())
                .extracting(link -> link.getPrescriptionHeader().getPrescriptionHeaderId())
                .containsExactly(1, 2);
        assertThat(saved.getRequestPrescriptions())
                .allSatisfy(link -> assertThat(link.getConsultationRequest()).isSameAs(saved));
        assertThat(response.getPrescriptionHeaderIds()).containsExactly(1, 2);
        verify(prescriptionHeaderRepository).findById(1);
        verify(prescriptionHeaderRepository).findById(2);
    }

    @Test
    void createRequest_shouldRejectPrescriptionNotOwnedByPatient() {
        Patient patient = Patient.builder().patientId("patient-1").fullName("Patient One").build();
        Patient otherPatient = Patient.builder().patientId("patient-2").fullName("Patient Two").build();
        Pharmacy pharmacy = Pharmacy.builder().pharmacyId("pharmacy-1").name("Central Pharmacy").build();
        PharmacyConsultationRequestCreateRequest request = new PharmacyConsultationRequestCreateRequest();
        request.setPatientId("patient-1");
        request.setPharmacyId("pharmacy-1");
        request.setDescription("Need medication review");
        request.setPrescriptionHeaderIds(List.of(9));

        when(patientRepository.findById("patient-1")).thenReturn(Optional.of(patient));
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));
        when(prescriptionHeaderRepository.findById(9))
                .thenReturn(Optional.of(prescription(9, otherPatient, "ISSUED", LocalDateTime.now().plusDays(5))));

        assertThatThrownBy(() -> consultationRequestService.createRequest(request))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("Prescription does not belong to this patient");

        verify(consultationRequestRepository, never()).save(any(PharmacyConsultationRequest.class));
    }

    @Test
    void getRequestPrescriptions_shouldReturnOnlyPrescriptionsSentWithRequest() {
        Patient patient = Patient.builder().patientId("patient-1").fullName("Patient One").build();
        Pharmacy pharmacy = Pharmacy.builder().pharmacyId("pharmacy-1").name("Central Pharmacy").build();
        PharmacyConsultationRequest request = PharmacyConsultationRequest.builder()
                .requestId(15)
                .patient(patient)
                .pharmacy(pharmacy)
                .build();
        attachPrescription(request, prescription(1, patient, "ISSUED", LocalDateTime.now().plusDays(5)));
        attachPrescription(request, prescription(3, patient, "Expired", LocalDateTime.now().minusDays(1)));

        when(consultationRequestRepository.findById(15)).thenReturn(Optional.of(request));

        List<PrescriptionResponse> response =
                consultationRequestService.getRequestPrescriptions(15, "pharmacy-1");

        assertThat(response).extracting(PrescriptionResponse::getPrescriptionHeaderId)
                .containsExactly(1, 3);
        assertThat(response).extracting(PrescriptionResponse::getPharmacyRequestId)
                .containsExactly(15, 15);
        verify(prescriptionHeaderRepository, never()).findByPatient_PatientId("patient-1");
    }

    @Test
    void getRequestPrescriptions_shouldRejectNonOwningPharmacy() {
        PharmacyConsultationRequest request = PharmacyConsultationRequest.builder()
                .requestId(15)
                .patient(Patient.builder().patientId("patient-1").build())
                .pharmacy(Pharmacy.builder().pharmacyId("pharmacy-1").build())
                .build();

        when(consultationRequestRepository.findById(15)).thenReturn(Optional.of(request));

        assertThatThrownBy(() ->
                consultationRequestService.getRequestPrescriptions(15, "pharmacy-2"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("You are not allowed to view prescriptions for this request");

        verify(prescriptionHeaderRepository, never()).findByPatient_PatientId("patient-1");
    }

    private void attachPrescription(
            PharmacyConsultationRequest request,
            PrescriptionHeader prescription
    ) {
        request.getRequestPrescriptions().add(PharmacyConsultationRequestPrescription.builder()
                .consultationRequest(request)
                .prescriptionHeader(prescription)
                .build());
    }

    @Test
    void createRequest_shouldNotifyPharmacyAboutNewRequest() {
        User pharmacyUser = User.builder().id("pharmacy-user-1").build();
        Patient patient = Patient.builder()
                .patientId("patient-1")
                .fullName("Patient One")
                .build();
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .user(pharmacyUser)
                .build();

        PharmacyConsultationRequestCreateRequest request = new PharmacyConsultationRequestCreateRequest();
        request.setPatientId("patient-1");
        request.setPharmacyId("pharmacy-1");
        request.setDescription("Need medication review");

        when(patientRepository.findById("patient-1")).thenReturn(Optional.of(patient));
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));
        when(consultationRequestRepository.save(any(PharmacyConsultationRequest.class)))
                .thenAnswer(invocation -> {
                    PharmacyConsultationRequest saved = invocation.getArgument(0);
                    saved.setRequestId(15);
                    return saved;
                });

        consultationRequestService.createRequest(request);

        verify(notificationService).sendWebSocketNotification(
                eq(pharmacyUser),
                eq(NotificationType.NEW_PHARMACY_REQUEST),
                eq("New pharmacy request"),
                contains("Patient One"),
                eq(15),
                eq("/pharmacy-requests/15")
        );
    }

    @Test
    void updateRequestStatus_shouldNotifyPatientWithRequestStatusType() {
        User patientUser = User.builder().id("patient-user-1").build();
        Patient patient = Patient.builder()
                .patientId("patient-1")
                .fullName("Patient One")
                .user(patientUser)
                .build();
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .user(User.builder().id("pharmacy-user-1").build())
                .build();
        PharmacyConsultationRequest consultationRequest = PharmacyConsultationRequest.builder()
                .requestId(15)
                .patient(patient)
                .pharmacy(pharmacy)
                .status("PENDING")
                .build();

        PharmacyConsultationRequestStatusUpdateRequest request =
                new PharmacyConsultationRequestStatusUpdateRequest();
        request.setStatus("IN_REVIEW");

        when(consultationRequestRepository.findById(15)).thenReturn(Optional.of(consultationRequest));
        when(consultationRequestRepository.save(any(PharmacyConsultationRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(deviceTokenRepository.findByUser_IdAndActiveTrue("patient-user-1"))
                .thenReturn(List.of());

        consultationRequestService.updateRequestStatus(15, request);

        verify(notificationService).sendWebSocketNotification(
                eq(patientUser),
                eq(NotificationType.PHARMACY_REQUEST_STATUS),
                eq("Pharmacy request updated"),
                contains("Request 15 is now IN_REVIEW"),
                eq(15),
                eq("/pharmacy-requests/15")
        );
    }

    @Test
    void createRequest_shouldDefaultMissingRequestTypeToConsultation() {
        Patient patient = Patient.builder().patientId("patient-1").fullName("Patient One").build();
        Pharmacy pharmacy = Pharmacy.builder().pharmacyId("pharmacy-1").name("Central Pharmacy").build();
        PharmacyConsultationRequestCreateRequest request = new PharmacyConsultationRequestCreateRequest();
        request.setPatientId("patient-1");
        request.setPharmacyId("pharmacy-1");
        request.setSymptoms("Headache");
        request.setRequestType(null);

        when(patientRepository.findById("patient-1")).thenReturn(Optional.of(patient));
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));
        when(consultationRequestRepository.save(any(PharmacyConsultationRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PharmacyConsultationRequestResponse response = consultationRequestService.createRequest(request);

        assertThat(response.getRequestType()).isEqualTo("CONSULTATION");
    }

    @Test
    void createRequest_shouldCreateOrderRequestWhenPrescriptionProvided() {
        Patient patient = Patient.builder().patientId("patient-1").fullName("Patient One").build();
        Pharmacy pharmacy = Pharmacy.builder().pharmacyId("pharmacy-1").name("Central Pharmacy").build();
        PrescriptionHeader prescription = prescription(1, patient, "ISSUED", LocalDateTime.now().plusDays(5));
        PharmacyConsultationRequestCreateRequest request = new PharmacyConsultationRequestCreateRequest();
        request.setPatientId("patient-1");
        request.setPharmacyId("pharmacy-1");
        request.setRequestType("ORDER_REQUEST");
        request.setPrescriptionHeaderIds(List.of(1));

        when(patientRepository.findById("patient-1")).thenReturn(Optional.of(patient));
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));
        when(prescriptionHeaderRepository.findById(1)).thenReturn(Optional.of(prescription));
        when(consultationRequestRepository.save(any(PharmacyConsultationRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PharmacyConsultationRequestResponse response = consultationRequestService.createRequest(request);

        assertThat(response.getRequestType()).isEqualTo("ORDER_REQUEST");
        assertThat(response.getPrescriptionHeaderIds()).containsExactly(1);
    }

    @Test
    void createRequest_shouldRejectOrderRequestWithoutPrescription() {
        Patient patient = Patient.builder().patientId("patient-1").fullName("Patient One").build();
        Pharmacy pharmacy = Pharmacy.builder().pharmacyId("pharmacy-1").name("Central Pharmacy").build();
        PharmacyConsultationRequestCreateRequest request = new PharmacyConsultationRequestCreateRequest();
        request.setPatientId("patient-1");
        request.setPharmacyId("pharmacy-1");
        request.setRequestType("ORDER_REQUEST");

        when(patientRepository.findById("patient-1")).thenReturn(Optional.of(patient));
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));

        assertThatThrownBy(() -> consultationRequestService.createRequest(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Prescription is required for an order request");

        verify(consultationRequestRepository, never()).save(any(PharmacyConsultationRequest.class));
    }

    @Test
    void createRequest_shouldSaveDeliverySnapshotForDeliveryRequest() {
        User patientUser = User.builder().id("patient-1").phoneNumber("0900000000").build();
        Patient patient = Patient.builder()
                .patientId("patient-1")
                .fullName("Patient One")
                .user(patientUser)
                .build();
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .deliveryAvailable(true)
                .active(true)
                .verified(true)
                .build();
        PharmacyConsultationRequestCreateRequest request = new PharmacyConsultationRequestCreateRequest();
        request.setPatientId("patient-1");
        request.setPharmacyId("pharmacy-1");
        request.setDescription("Need medication review");
        request.setDeliveryType("Delivery");
        request.setDeliveryAddress("12 Nguyen Trai, Hanoi");
        request.setDeliveryLatitude(21.0285);
        request.setDeliveryLongitude(105.8542);
        request.setDeliveryPhoneNumber("0912345678");
        request.setDeliveryAddressSource("MANUAL");

        when(patientRepository.findById("patient-1")).thenReturn(Optional.of(patient));
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));
        when(consultationRequestRepository.save(any(PharmacyConsultationRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PharmacyConsultationRequestResponse response = consultationRequestService.createRequest(request);

        assertThat(response.getDeliveryType()).isEqualTo("Delivery");
        assertThat(response.getDeliveryAddress()).isEqualTo("12 Nguyen Trai, Hanoi");
        assertThat(response.getDeliveryLatitude()).isEqualTo(21.0285);
        assertThat(response.getDeliveryLongitude()).isEqualTo(105.8542);
        assertThat(response.getDeliveryPhoneNumber()).isEqualTo("0912345678");
        assertThat(response.getDeliveryAddressSource()).isEqualTo("MANUAL");
    }

    @Test
    void createRequest_shouldRejectDeliveryRequestWithoutPhone() {
        Patient patient = Patient.builder().patientId("patient-1").fullName("Patient One").build();
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .deliveryAvailable(true)
                .active(true)
                .verified(true)
                .build();
        PharmacyConsultationRequestCreateRequest request = new PharmacyConsultationRequestCreateRequest();
        request.setPatientId("patient-1");
        request.setPharmacyId("pharmacy-1");
        request.setDescription("Need medication review");
        request.setDeliveryType("Delivery");
        request.setDeliveryAddress("12 Nguyen Trai, Hanoi");
        request.setDeliveryLatitude(21.0285);
        request.setDeliveryLongitude(105.8542);

        when(patientRepository.findById("patient-1")).thenReturn(Optional.of(patient));
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));

        assertThatThrownBy(() -> consultationRequestService.createRequest(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Delivery phone number is required for delivery requests");

        verify(consultationRequestRepository, never()).save(any(PharmacyConsultationRequest.class));
    }

    @Test
    void updateRequestStatus_shouldNotCreateChatRoomForOrderRequest() {
        User patientUser = User.builder().id("patient-user-1").build();
        Patient patient = Patient.builder()
                .patientId("patient-1")
                .fullName("Patient One")
                .user(patientUser)
                .build();
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .user(User.builder().id("pharmacy-user-1").build())
                .build();
        PharmacyConsultationRequest consultationRequest = PharmacyConsultationRequest.builder()
                .requestId(15)
                .patient(patient)
                .pharmacy(pharmacy)
                .status("PENDING")
                .requestType("ORDER_REQUEST")
                .build();

        PharmacyConsultationRequestStatusUpdateRequest request =
                new PharmacyConsultationRequestStatusUpdateRequest();
        request.setStatus("IN_REVIEW");

        when(consultationRequestRepository.findById(15)).thenReturn(Optional.of(consultationRequest));
        when(consultationRequestRepository.save(any(PharmacyConsultationRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(deviceTokenRepository.findByUser_IdAndActiveTrue("patient-user-1"))
                .thenReturn(List.of());

        consultationRequestService.updateRequestStatus(15, request);

        verify(chatService, never()).getOrCreateRoom(any());
    }

    private PrescriptionHeader prescription(
            Integer id,
            Patient patient,
            String status,
            LocalDateTime validUntil
    ) {
        return PrescriptionHeader.builder()
                .prescriptionHeaderId(id)
                .patient(patient)
                .issueDate(LocalDateTime.now())
                .validUntil(validUntil)
                .status(status)
                .build();
    }
}
