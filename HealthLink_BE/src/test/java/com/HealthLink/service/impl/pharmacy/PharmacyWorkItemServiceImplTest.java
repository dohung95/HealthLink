package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyWorkItemResponse;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.PharmacyConsultationRequest;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.entity.PharmacyOrderItem;
import com.HealthLink.repository.pharmacy.PharmacyConsultationRequestRepository;
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
        assertThat(item.getAvailableActions()).containsExactly("ACCEPT_REQUEST", "REQUEST_MORE_INFO", "REJECT_REQUEST");
        assertThat(item.getPatientName()).isEqualTo("Alice");
        assertThat(item.getDisplayId()).isEqualTo("Request #1");
        assertThat(item.getSourceType()).isEqualTo("CONSULTATION_REQUEST");
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
        assertThat(items.get(0).getWorkflowStage()).isEqualTo("NEEDS_INFO");
        assertThat(items.get(0).getAvailableActions()).containsExactly("VIEW_ONLY");
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
    void getWorkItemsByPharmacy_shouldMapRequestWithLinkedPendingOrder() {
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

        assertThat(items).hasSize(1);
        PharmacyWorkItemResponse item = items.get(0);
        assertThat(item.getCaseId()).isEqualTo("REQ-4");
        assertThat(item.getWorkflowStage()).isEqualTo("QUOTE_SENT");
        assertThat(item.getHasOrder()).isTrue();
        assertThat(item.getHasConsultationRequest()).isTrue();
        assertThat(item.getOrderId()).isEqualTo(100);
        assertThat(item.getTotalAmount()).isEqualByComparingTo(new BigDecimal("150.00"));
        assertThat(item.getAvailableActions()).contains("VIEW_ONLY");
    }

    @Test
    void getWorkItemsByPharmacy_shouldMapLinkedOrderAwaitingPayment() {
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

        assertThat(items).hasSize(1);
        assertThat(items.get(0).getWorkflowStage()).isEqualTo("AWAITING_PAYMENT");
    }

    @Test
    void getWorkItemsByPharmacy_shouldMapPreparingOrder() {
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

        assertThat(items).hasSize(1);
        assertThat(items.get(0).getWorkflowStage()).isEqualTo("PREPARING");
        assertThat(items.get(0).getAvailableActions()).contains("UPDATE_ORDER_STATUS", "CANCEL_ORDER");
    }

    @Test
    void getWorkItemsByPharmacy_shouldMapCompletedOrder() {
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

        assertThat(items).hasSize(1);
        assertThat(items.get(0).getWorkflowStage()).isEqualTo("COMPLETED");
        assertThat(items.get(0).getAvailableActions()).containsExactly("VIEW_ONLY");
    }

    @Test
    void getWorkItemsByPharmacy_shouldMapCancelledOrder() {
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

        assertThat(items).hasSize(1);
        assertThat(items.get(0).getWorkflowStage()).isEqualTo("CANCELLED");
        assertThat(items.get(0).getCancelReason()).isEqualTo("Out of stock");
    }

    @Test
    void getWorkItemsByPharmacy_shouldMapCancelledRequest() {
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

        assertThat(items).hasSize(1);
        assertThat(items.get(0).getWorkflowStage()).isEqualTo("CANCELLED");
    }

    @Test
    void getWorkItemsByPharmacy_shouldIncludeDirectOrders() {
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

        assertThat(items).hasSize(1);
        PharmacyWorkItemResponse item = items.get(0);
        assertThat(item.getCaseId()).isEqualTo("ORD-200");
        assertThat(item.getSourceType()).isEqualTo("DIRECT_ORDER");
        assertThat(item.getHasConsultationRequest()).isFalse();
        assertThat(item.getHasOrder()).isTrue();
        assertThat(item.getWorkflowStage()).isEqualTo("PREPARING");
        assertThat(item.getOrderId()).isEqualTo(200);
        assertThat(item.getPatientName()).isEqualTo("Jack");
    }

    @Test
    void getWorkItemsByPharmacy_shouldNotDuplicateLinkedConsultationOrder() {
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

        assertThat(items).hasSize(2);
        assertThat(items).extracting(PharmacyWorkItemResponse::getCaseId)
                .containsExactlyInAnyOrder("REQ-10", "ORD-301");
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

        assertThat(items).hasSize(2);
        assertThat(items.get(0).getCaseId()).isEqualTo("REQ-12");
        assertThat(items.get(1).getCaseId()).isEqualTo("REQ-11");
    }
}
