package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.entity.Patient;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ForbiddenException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PharmacyOrderQuoteServiceImplTest {

    @Mock
    private PharmacyOrderRepository orderRepository;

    @InjectMocks
    private PharmacyOrderQuoteServiceImpl quoteService;

    @Test
    void confirmQuote_successPickup() {
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(1)
                .patient(Patient.builder().patientId("patient-1").build())
                .deliveryType("Pickup")
                .paymentStatus("PENDING")
                .status("CONFIRMED")
                .build();

        when(orderRepository.findById(1)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(PharmacyOrder.class))).thenAnswer(a -> a.getArgument(0));

        var response = quoteService.confirmQuote(1, "patient-1");

        assertThat(response.getPatientConfirmedAt()).isNotNull();
        verify(orderRepository).save(order);
    }

    @Test
    void confirmQuote_successDelivery() {
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(1)
                .patient(Patient.builder().patientId("patient-1").build())
                .deliveryType("Delivery")
                .deliveryFee(new BigDecimal("5.00"))
                .estimatedDeliveryTime(LocalDateTime.now().plusDays(1))
                .paymentStatus("PENDING")
                .status("CONFIRMED")
                .build();

        when(orderRepository.findById(1)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(PharmacyOrder.class))).thenAnswer(a -> a.getArgument(0));

        var response = quoteService.confirmQuote(1, "patient-1");

        assertThat(response.getPatientConfirmedAt()).isNotNull();
        verify(orderRepository).save(order);
    }

    @Test
    void confirmQuote_deliveryMissingFee() {
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(1)
                .patient(Patient.builder().patientId("patient-1").build())
                .deliveryType("Delivery")
                .deliveryFee(null)
                .estimatedDeliveryTime(LocalDateTime.now().plusDays(1))
                .paymentStatus("PENDING")
                .status("CONFIRMED")
                .build();

        when(orderRepository.findById(1)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> quoteService.confirmQuote(1, "patient-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Delivery fee is required");
    }

    @Test
    void confirmQuote_deliveryNegativeFee() {
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(1)
                .patient(Patient.builder().patientId("patient-1").build())
                .deliveryType("Delivery")
                .deliveryFee(new BigDecimal("-1.00"))
                .estimatedDeliveryTime(LocalDateTime.now().plusDays(1))
                .paymentStatus("PENDING")
                .status("CONFIRMED")
                .build();

        when(orderRepository.findById(1)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> quoteService.confirmQuote(1, "patient-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Delivery fee is required");
    }

    @Test
    void confirmQuote_deliveryMissingEstimatedTime() {
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(1)
                .patient(Patient.builder().patientId("patient-1").build())
                .deliveryType("Delivery")
                .deliveryFee(new BigDecimal("5.00"))
                .estimatedDeliveryTime(null)
                .paymentStatus("PENDING")
                .status("CONFIRMED")
                .build();

        when(orderRepository.findById(1)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> quoteService.confirmQuote(1, "patient-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Estimated delivery time is required");
    }

    @Test
    void confirmQuote_notOwnedByPatient() {
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(1)
                .patient(Patient.builder().patientId("patient-2").build())
                .build();

        when(orderRepository.findById(1)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> quoteService.confirmQuote(1, "patient-1"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("You are not the owner of this order");
    }

    @Test
    void confirmQuote_orderNotFound() {
        when(orderRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> quoteService.confirmQuote(999, "patient-1"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void confirmQuote_paymentStatusNotPending() {
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(1)
                .patient(Patient.builder().patientId("patient-1").build())
                .paymentStatus("PAID")
                .build();

        when(orderRepository.findById(1)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> quoteService.confirmQuote(1, "patient-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Order is not in PENDING payment status");
    }

    @Test
    void confirmQuote_orderCancelled() {
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(1)
                .patient(Patient.builder().patientId("patient-1").build())
                .status("CANCELLED")
                .paymentStatus("PENDING")
                .build();

        when(orderRepository.findById(1)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> quoteService.confirmQuote(1, "patient-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cannot confirm quote");
    }

    @Test
    void confirmQuote_orderRefunded() {
        PharmacyOrder order = PharmacyOrder.builder()
                .orderId(1)
                .patient(Patient.builder().patientId("patient-1").build())
                .status("REFUNDED")
                .paymentStatus("PENDING")
                .build();

        when(orderRepository.findById(1)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> quoteService.confirmQuote(1, "patient-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cannot confirm quote");
    }
}
