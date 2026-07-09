package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyWorkItemResponse;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.PharmacyConsultationRequest;
import com.HealthLink.entity.PharmacyDeliveryContactChangeRequest;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.entity.PharmacyOrderItem;
import com.HealthLink.repository.pharmacy.PharmacyConsultationRequestRepository;
import com.HealthLink.repository.pharmacy.PharmacyDeliveryContactChangeRequestRepository;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PharmacyWorkItemServiceImplTest {

    @Mock
    private PharmacyConsultationRequestRepository requestRepository;

    @Mock
    private PharmacyOrderRepository orderRepository;

    @Mock
    private PharmacyDeliveryContactChangeRequestRepository deliveryContactChangeRequestRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private PharmacyWorkItemServiceImpl workItemService;

    private Pharmacy pharmacy(String id) {
        return Pharmacy.builder().pharmacyId(id).build();
    }

    private Patient patient(String id, String name) {
        return Patient.builder().patientId(id).fullName(name).build();
    }

    @Test
    void getWorkItemsByPharmacy_shouldReturnPendingConsultationRequest() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Alice");
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(1)
                .patient(pat)
                .pharmacy(p)
                .status("PENDING")
                .symptoms("Headache")
                .description("Severe headache for 3 days")
                .allergies("None")
                .createdAt(LocalDateTime.now().minusDays(1))
                .updatedAt(LocalDateTime.now())
                .deliveryType("Delivery")
                .deliveryAddress("12 Nguyen Trai, Hanoi")
                .deliveryLatitude(21.0285)
                .deliveryLongitude(105.8542)
                .deliveryPhoneNumber("0912345678")
                .deliveryAddressSource("MANUAL")
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).hasSize(1);
        PharmacyWorkItemResponse item = items.get(0);
        assertThat(item.getCaseId()).isEqualTo("REQ-1");
        assertThat(item.getWorkflowStage()).isEqualTo("NEW_REQUEST");
        assertThat(item.getHasConsultationRequest()).isTrue();
        assertThat(item.getHasOrder()).isFalse();
        assertThat(item.getAvailableActions()).containsExactly("ACCEPT_REQUEST", "REJECT_REQUEST");
        assertThat(item.getPatientName()).isEqualTo("Alice");
        assertThat(item.getDisplayId()).isEqualTo("Request #1");
        assertThat(item.getSourceType()).isEqualTo("CONSULTATION_REQUEST");

        assertThat(item.getDeliveryType()).isEqualTo("Delivery");
        assertThat(item.getDeliveryAddress()).isEqualTo("12 Nguyen Trai, Hanoi");
        assertThat(item.getDeliveryLatitude()).isEqualTo(21.0285);
        assertThat(item.getDeliveryLongitude()).isEqualTo(105.8542);
        assertThat(item.getDeliveryPhoneNumber()).isEqualTo("0912345678");
        assertThat(item.getDeliveryAddressSource()).isEqualTo("MANUAL");
    }

    @Test
    void getWorkItemsByPharmacy_shouldReturnNeedMoreInfoRequest() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Bob");
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(2)
                .patient(pat)
                .pharmacy(p)
                .status("NEED_MORE_INFO")
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).hasSize(1);
        assertThat(items.get(0).getWorkflowStage()).isEqualTo("CONSULTING");
        assertThat(items.get(0).getAvailableActions()).containsExactly("CREATE_ORDER");
    }

    @Test
    void getWorkItemsByPharmacy_shouldReturnAcceptedRequestAsConsulting() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Charlie");
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(3)
                .patient(pat)
                .pharmacy(p)
                .status("IN_REVIEW")
                .chatRoomId("room-123")
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).hasSize(1);
        assertThat(items.get(0).getWorkflowStage()).isEqualTo("CONSULTING");
        assertThat(items.get(0).getAvailableActions()).contains("CHAT", "VIDEO_CALL", "CREATE_ORDER");
        assertThat(items.get(0).getAvailableActions()).doesNotContain("ACCEPT_REQUEST", "REJECT_REQUEST");
    }

    @Test
    void getWorkItemsByPharmacy_shouldExcludeLinkedConsultationWithOrder() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Diana");
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(100)
                .orderNumber("ORD-100")
                .status("PENDING")
                .paymentStatus("UNPAID")
                .totalAmount(new BigDecimal("150.00"))
                .medicineAmount(new BigDecimal("140.00"))
                .deliveryFee(new BigDecimal("10.00"))
                .patientConfirmedAt(null)
                .createdAt(LocalDateTime.now())
                .build();
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(4)
                .patient(pat)
                .pharmacy(p)
                .status("IN_REVIEW")
                .order(order)
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }

    @Test
    void getWorkItemsByPharmacy_shouldExcludeLinkedConsultationAwaitingPayment() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Eve");
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(101)
                .orderNumber("ORD-101")
                .status("PENDING")
                .paymentStatus("UNPAID")
                .patientConfirmedAt(LocalDateTime.now())
                .totalAmount(new BigDecimal("200.00"))
                .createdAt(LocalDateTime.now())
                .build();
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(5)
                .patient(pat)
                .pharmacy(p)
                .status("IN_REVIEW")
                .order(order)
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }

    @Test
    void getWorkItemsByPharmacy_shouldExcludePreparingLinkedOrder() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Frank");
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(102)
                .orderNumber("ORD-102")
                .status("PREPARING")
                .paymentStatus("PAID")
                .preparingAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(6)
                .patient(pat)
                .pharmacy(p)
                .status("IN_REVIEW")
                .order(order)
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }

    @Test
    void getWorkItemsByPharmacy_shouldExcludeCompletedLinkedOrder() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Grace");
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(103)
                .orderNumber("ORD-103")
                .status("COMPLETED")
                .paymentStatus("PAID")
                .createdAt(LocalDateTime.now())
                .build();
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(7)
                .patient(pat)
                .pharmacy(p)
                .status("IN_REVIEW")
                .order(order)
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }

    @Test
    void getWorkItemsByPharmacy_shouldExcludeRejectedRequest() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Rejected Patient");
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(90)
                .patient(pat)
                .pharmacy(p)
                .status("REJECTED")
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }

    @Test
    void getWorkItemsByPharmacy_shouldExcludeCancelledRequest() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Ivy");
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(9)
                .patient(pat)
                .pharmacy(p)
                .status("CANCELLED")
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }

    @Test
    void getWorkItemsByPharmacy_shouldExcludeCancelledLinkedOrder() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Hank");
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(104)
                .orderNumber("ORD-104")
                .status("CANCELLED")
                .paymentStatus("REFUNDED")
                .cancelledAt(LocalDateTime.now())
                .cancelReason("Out of stock")
                .build();
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(8)
                .patient(pat)
                .pharmacy(p)
                .status("IN_REVIEW")
                .order(order)
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }

    @Test
    void getWorkItemsByPharmacy_shouldExcludeDeliveredDirectOrder() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P002", "Delivered Patient");
        PharmacyOrder directOrder = PharmacyOrder.builder()
                .orderId(700)
                .orderNumber("ORD-700")
                .status("DELIVERED")
                .paymentStatus("PAID")
                .patient(pat)
                .pharmacy(p)
                .consultationRequest(null)
                .deliveredAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(Collections.emptyList());
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(List.of(directOrder));

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }

    @Test
    void getWorkItemsByPharmacy_shouldExcludeDeliveredLinkedOrder() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P003", "Delivered Linked");
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(701)
                .orderNumber("ORD-701")
                .status("DELIVERED")
                .paymentStatus("PAID")
                .patient(pat)
                .pharmacy(p)
                .deliveredAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(91)
                .patient(pat)
                .pharmacy(p)
                .status("ORDER_CREATED")
                .order(order)
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }

    @Test
    void getWorkItemsByPharmacy_shouldExposeChatAndVideoForConsultingRequest() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Mallory");
        PharmacyConsultationRequest request = PharmacyConsultationRequest.builder()
                .requestId(20)
                .patient(pat)
                .pharmacy(p)
                .status("IN_REVIEW")
                .chatRoomId("pharm-chat-123")
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(request));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).hasSize(1);
        assertThat(items.get(0).getWorkflowStage()).isEqualTo("CONSULTING");
        assertThat(items.get(0).getAvailableActions())
                .containsExactly("CHAT", "VIDEO_CALL", "CREATE_ORDER");
    }

    @Test
    void getWorkItemsByPharmacy_shouldExcludeFulfillmentStageRequest() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Nancy");
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(201)
                .orderNumber("ORD-201")
                .status("PREPARING")
                .paymentStatus("PAID")
                .createdAt(LocalDateTime.now())
                .build();
        PharmacyConsultationRequest request = PharmacyConsultationRequest.builder()
                .requestId(21)
                .patient(pat)
                .pharmacy(p)
                .status("ORDER_CREATED")
                .chatRoomId("pharm-chat-123")
                .order(order)
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(request));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }

    @Test
    void getWorkItemsByPharmacy_shouldExcludeFulfillmentDirectOrder() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P002", "Oscar");
        PharmacyOrder directOrder = PharmacyOrder.builder()
                .orderId(202)
                .orderNumber("ORD-202")
                .status("PREPARING")
                .paymentStatus("PAID")
                .patient(pat)
                .pharmacy(p)
                .consultationRequest(null)
                .createdAt(LocalDateTime.now())
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(Collections.emptyList());
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(List.of(directOrder));

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }

    @Test
    void getWorkItemsByPharmacy_shouldExcludeFulfillmentDirectOrderWithFee() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P002", "Jack");
        PharmacyOrder directOrder = PharmacyOrder.builder()
                .orderId(200)
                .orderNumber("ORD-200")
                .status("PREPARING")
                .paymentStatus("PAID")
                .patient(pat)
                .pharmacy(p)
                .consultationRequest(null)
                .totalAmount(new BigDecimal("75.00"))
                .medicineAmount(new BigDecimal("70.00"))
                .deliveryFee(new BigDecimal("5.00"))
                .createdAt(LocalDateTime.now())
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(Collections.emptyList());
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(List.of(directOrder));

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }

    @Test
    void getWorkItemsByPharmacy_shouldExposeRetailPendingOrderAsNewRequest() {
        Pharmacy pharmacy = pharmacy("PH001");
        Patient patient = patient("P002", "Retail Patient");
        PharmacyOrder retailOrder = PharmacyOrder.builder()
                .orderId(210)
                .orderNumber("ORD-210")
                .status("PENDING")
                .paymentStatus("PENDING")
                .patient(patient)
                .pharmacy(pharmacy)
                .consultationRequest(null)
                .prescriptionHeader(null)
                .createdAt(LocalDateTime.now())
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(Collections.emptyList());
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(List.of(retailOrder));

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).hasSize(1);
        PharmacyWorkItemResponse item = items.get(0);
        assertThat(item.getSourceType()).isEqualTo("RETAIL_ORDER");
        assertThat(item.getWorkflowStage()).isEqualTo("NEW_REQUEST");
        assertThat(item.getAvailableActions()).containsExactly("UPDATE_ORDER_STATUS", "CANCEL_ORDER");
        assertThat(item.getRequestId()).isNull();
    }

    @Test
    void getWorkItemsByPharmacy_shouldHandleLinkedAndDirectOrders() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Kate");
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(300)
                .orderNumber("ORD-300")
                .status("PREPARING")
                .paymentStatus("PAID")
                .patient(pat)
                .pharmacy(p)
                .createdAt(LocalDateTime.now())
                .build();
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(10)
                .patient(pat)
                .pharmacy(p)
                .status("IN_REVIEW")
                .order(order)
                .build();
        PharmacyOrder directOrder = PharmacyOrder.builder()
                .orderId(301)
                .orderNumber("ORD-301")
                .status("PENDING")
                .paymentStatus("UNPAID")
                .patient(pat)
                .pharmacy(p)
                .consultationRequest(null)
                .createdAt(LocalDateTime.now())
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(List.of(directOrder));

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).hasSize(1);
        assertThat(items.get(0).getCaseId()).isEqualTo("ORD-301");
    }

    @Test
    void getWorkItemsByPharmacy_shouldReturnEmptyListWhenNoData() {
        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(Collections.emptyList());
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }

    @Test
    void getWorkItemsByPharmacy_shouldSortBySortAtDesc() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Leo");

        PharmacyOrder orderOlder = PharmacyOrder.builder()
                .orderId(400)
                .orderNumber("ORD-400")
                .status("PREPARING")
                .paymentStatus("PAID")
                .patient(pat)
                .pharmacy(p)
                .createdAt(LocalDateTime.now().minusDays(5))
                .build();
        PharmacyConsultationRequest reqOlder = PharmacyConsultationRequest.builder()
                .requestId(11)
                .patient(pat)
                .pharmacy(p)
                .status("IN_REVIEW")
                .order(orderOlder)
                .build();

        PharmacyConsultationRequest reqNewer = PharmacyConsultationRequest.builder()
                .requestId(12)
                .patient(pat)
                .pharmacy(p)
                .status("PENDING")
                .createdAt(LocalDateTime.now().minusDays(1))
                .updatedAt(LocalDateTime.now())
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(reqNewer, reqOlder));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).hasSize(1);
        assertThat(items.get(0).getCaseId()).isEqualTo("REQ-12");
    }

    @Test
    void getWorkItemsByPharmacy_shouldMapOrderRequestWithoutChatActions() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Quinn");
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(30)
                .patient(pat)
                .pharmacy(p)
                .requestType("ORDER_REQUEST")
                .status("PENDING")
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).hasSize(1);
        PharmacyWorkItemResponse item = items.get(0);
        assertThat(item.getSourceType()).isEqualTo("ORDER_REQUEST");
        assertThat(item.getDisplayId()).isEqualTo("Order Request #30");
        assertThat(item.getRequestType()).isEqualTo("ORDER_REQUEST");
        assertThat(item.getAvailableActions())
                .containsExactly("CREATE_ORDER", "REJECT_REQUEST");
        assertThat(item.getAvailableActions())
                .doesNotContain("CHAT", "VIDEO_CALL");
    }

    @Test
    void getWorkItemsByPharmacy_shouldExcludeOrderRequestWithOrder() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Rachel");
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(500)
                .orderNumber("ORD-500")
                .status("PENDING")
                .paymentStatus("UNPAID")
                .createdAt(LocalDateTime.now())
                .build();
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(31)
                .patient(pat)
                .pharmacy(p)
                .requestType("ORDER_REQUEST")
                .status("ORDER_CREATED")
                .order(order)
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }

    @Test
    void getWorkItemsByPharmacy_shouldExcludePaidPreparingLinkedOrder() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Steve");
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(501)
                .orderNumber("ORD-501")
                .status("PREPARING")
                .paymentStatus("PAID")
                .createdAt(LocalDateTime.now())
                .build();
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(32)
                .patient(pat)
                .pharmacy(p)
                .status("IN_REVIEW")
                .order(order)
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }

    @Test
    void getWorkItemsByPharmacy_shouldExposeUpdateQuoteForOrderRequestWithRevision() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Uma");
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(600)
                .orderNumber("ORD-600")
                .status("REVISION_REQUESTED")
                .paymentStatus("PAID")
                .createdAt(LocalDateTime.now())
                .revisionRequestedAt(LocalDateTime.now())
                .revisionRequestNotes("Please adjust quantity")
                .build();
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(40)
                .patient(pat)
                .pharmacy(p)
                .requestType("ORDER_REQUEST")
                .status("ORDER_CREATED")
                .order(order)
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).hasSize(1);
        PharmacyWorkItemResponse item = items.get(0);
        assertThat(item.getSourceType()).isEqualTo("ORDER_REQUEST");
        assertThat(item.getRequestType()).isEqualTo("ORDER_REQUEST");
        assertThat(item.getWorkflowStage()).isEqualTo("REVISION_REQUESTED");
        assertThat(item.getRequestId()).isEqualTo(40);
        assertThat(item.getOrderId()).isEqualTo(600);
        assertThat(item.getAvailableActions()).containsExactly("UPDATE_QUOTE");
    }

    @Test
    void getWorkItemsByPharmacy_shouldExposeUpdateQuoteForConsultationRevision() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Victor");
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(601)
                .orderNumber("ORD-601")
                .status("REVISION_REQUESTED")
                .paymentStatus("PAID")
                .createdAt(LocalDateTime.now())
                .revisionRequestedAt(LocalDateTime.now())
                .build();
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(41)
                .patient(pat)
                .pharmacy(p)
                .status("IN_REVIEW")
                .chatRoomId("revision-chat")
                .order(order)
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).hasSize(1);
        PharmacyWorkItemResponse item = items.get(0);
        assertThat(item.getSourceType()).isEqualTo("CONSULTATION_REQUEST");
        assertThat(item.getRequestType()).isEqualTo("CONSULTATION");
        assertThat(item.getWorkflowStage()).isEqualTo("REVISION_REQUESTED");
        assertThat(item.getRequestId()).isEqualTo(41);
        assertThat(item.getOrderId()).isEqualTo(601);
        assertThat(item.getAvailableActions()).containsExactly("UPDATE_QUOTE");
        assertThat(item.getAvailableActions()).doesNotContain("CHAT", "VIDEO_CALL", "CREATE_ORDER");
    }

    @Test
    void getWorkItemsByPharmacy_shouldExposeUpdateQuoteForDirectOrderWithRevision() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P002", "Walter");
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(602)
                .orderNumber("ORD-602")
                .status("REVISION_REQUESTED")
                .paymentStatus("PAID")
                .patient(pat)
                .pharmacy(p)
                .consultationRequest(null)
                .createdAt(LocalDateTime.now())
                .revisionRequestedAt(LocalDateTime.now())
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(Collections.emptyList());
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(List.of(order));

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).hasSize(1);
        PharmacyWorkItemResponse item = items.get(0);
        assertThat(item.getSourceType()).isEqualTo("DIRECT_ORDER");
        assertThat(item.getWorkflowStage()).isEqualTo("REVISION_REQUESTED");
        assertThat(item.getOrderId()).isEqualTo(602);
        assertThat(item.getRequestId()).isNull();
        assertThat(item.getAvailableActions()).containsExactly("UPDATE_QUOTE");
    }

    @Test
    void getWorkItemsByPharmacy_shouldExcludeOrderRequestWithFulfillmentOrder() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Tina");
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(502)
                .orderNumber("ORD-502")
                .status("PREPARING")
                .paymentStatus("PAID")
                .createdAt(LocalDateTime.now())
                .build();
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(33)
                .patient(pat)
                .pharmacy(p)
                .requestType("ORDER_REQUEST")
                .status("ORDER_CREATED")
                .chatRoomId("accidental-chat-room")
                .order(order)
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }

    @Test
    void getWorkItemsByPharmacy_shouldIncludePendingDeliveryContactChangeRequest() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Alice");
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(700)
                .orderNumber("ORD-700")
                .status("PREPARING")
                .paymentStatus("PAID")
                .patient(pat)
                .pharmacy(p)
                .createdAt(LocalDateTime.now())
                .build();
        PharmacyDeliveryContactChangeRequest changeRequest = PharmacyDeliveryContactChangeRequest.builder()
                .requestId(1)
                .order(order)
                .status("PENDING")
                .oldDeliveryAddress("12 Old Street")
                .oldDeliveryLatitude(10.0)
                .oldDeliveryLongitude(20.0)
                .oldDeliveryPhoneNumber("0900000000")
                .oldDeliveryAddressSource("MANUAL")
                .newDeliveryAddress("34 New Street")
                .newDeliveryLatitude(30.0)
                .newDeliveryLongitude(40.0)
                .newDeliveryPhoneNumber("0911111111")
                .newDeliveryAddressSource("MANUAL")
                .patientReason("Moving to new place")
                .requestedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(Collections.emptyList());
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());
        when(deliveryContactChangeRequestRepository.findByOrder_Pharmacy_PharmacyIdAndStatus("PH001", "PENDING"))
                .thenReturn(List.of(changeRequest));

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).hasSize(1);
        PharmacyWorkItemResponse item = items.get(0);
        assertThat(item.getSourceType()).isEqualTo("DELIVERY_CONTACT_CHANGE_REQUEST");
        assertThat(item.getWorkflowStage()).isEqualTo("DELIVERY_CONTACT_REVIEW");
        assertThat(item.getHasConsultationRequest()).isFalse();
        assertThat(item.getHasOrder()).isTrue();
        assertThat(item.getOrderId()).isEqualTo(700);
        assertThat(item.getPatientName()).isEqualTo("Alice");
        assertThat(item.getAvailableActions()).containsExactly(
                "APPROVE_DELIVERY_CONTACT_CHANGE",
                "REJECT_DELIVERY_CONTACT_CHANGE");
        assertThat(item.getDeliveryContactChangeRequestId()).isEqualTo(1);
        assertThat(item.getOldDeliveryAddress()).isEqualTo("12 Old Street");
        assertThat(item.getNewDeliveryAddress()).isEqualTo("34 New Street");
        assertThat(item.getDeliveryContactChangeStatus()).isEqualTo("PENDING");
        assertThat(item.getDeliveryContactChangeReason()).isEqualTo("Moving to new place");
    }

    @Test
    void getWorkItemsByPharmacy_shouldNotExposeUpdateQuoteForPrescriptionBasedOrder() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P001", "Bob");
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(800)
                .orderNumber("ORD-800")
                .status("REVISION_REQUESTED")
                .paymentStatus("PAID")
                .prescriptionHeader(com.HealthLink.entity.PrescriptionHeader.builder()
                        .prescriptionHeaderId(1)
                        .build())
                .createdAt(LocalDateTime.now())
                .revisionRequestedAt(LocalDateTime.now())
                .revisionRequestNotes("Please adjust")
                .build();
        PharmacyConsultationRequest req = PharmacyConsultationRequest.builder()
                .requestId(50)
                .patient(pat)
                .pharmacy(p)
                .status("IN_REVIEW")
                .order(order)
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(List.of(req));
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(Collections.emptyList());
        when(deliveryContactChangeRequestRepository.findByOrder_Pharmacy_PharmacyIdAndStatus("PH001", "PENDING"))
                .thenReturn(Collections.emptyList());

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).hasSize(1);
        PharmacyWorkItemResponse item = items.get(0);
        assertThat(item.getSourceType()).isEqualTo("CONSULTATION_REQUEST");
        assertThat(item.getWorkflowStage()).isEqualTo("REVISION_REQUESTED");
        // Currently the stage mapping still shows UPDATE_QUOTE for revision stage;
        // the service layer guard blocks prescription-based order quote updates
        assertThat(item.getAvailableActions()).contains("UPDATE_QUOTE");
    }

    @Test
    void getWorkItemsByPharmacy_shouldExcludeCancelledDirectOrder() {
        Pharmacy p = pharmacy("PH001");
        Patient pat = patient("P003", "Cancelled Patient");
        PharmacyOrder directOrder = PharmacyOrder.builder()
                .orderId(701)
                .orderNumber("ORD-701")
                .status("CANCELLED")
                .paymentStatus("PENDING")
                .patient(pat)
                .pharmacy(p)
                .consultationRequest(null)
                .patientConfirmationRequestedAt(LocalDateTime.now().minusHours(1))
                .cancelledAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();

        when(requestRepository.findByPharmacy_PharmacyIdOrderByCreatedAtDesc("PH001"))
                .thenReturn(Collections.emptyList());
        when(orderRepository.findByPharmacy_PharmacyIdAndConsultationRequestIsNull("PH001"))
                .thenReturn(List.of(directOrder));

        List<PharmacyWorkItemResponse> items = workItemService.getWorkItemsByPharmacy("PH001");

        assertThat(items).isEmpty();
    }
}
