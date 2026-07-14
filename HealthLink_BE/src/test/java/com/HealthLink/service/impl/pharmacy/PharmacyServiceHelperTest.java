package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.entity.PharmacyConsultationRequest;
import com.HealthLink.entity.PharmacyOrder;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.time.LocalDateTime;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class PharmacyServiceHelperTest {

    @Test
    void requiresPatientConfirmation_shouldReturnTrueForUnpaidOpenConfirmation() {
        PharmacyOrder order = PharmacyOrder.builder()
                .status("PENDING")
                .paymentStatus("PENDING")
                .patientConfirmationRequestedAt(LocalDateTime.now().minusMinutes(10))
                .patientConfirmedAt(null)
                .build();

        assertThat(PharmacyServiceHelper.requiresPatientConfirmation(order)).isTrue();
    }

    @Test
    void requiresPatientConfirmation_shouldAllowPreparingDeliveryContactFeeConfirmation() {
        PharmacyOrder order = PharmacyOrder.builder()
                .status("PREPARING")
                .paymentStatus("PENDING")
                .patientConfirmationRequestedAt(LocalDateTime.now().minusMinutes(10))
                .patientConfirmedAt(null)
                .build();

        assertThat(PharmacyServiceHelper.requiresPatientConfirmation(order)).isTrue();
    }

    @Test
    void requiresPatientConfirmation_shouldReturnFalseForPaidOrders() {
        PharmacyOrder order = PharmacyOrder.builder()
                .status("CONFIRMED")
                .paymentStatus("PAID")
                .patientConfirmationRequestedAt(LocalDateTime.now().minusMinutes(10))
                .patientConfirmedAt(null)
                .build();

        assertThat(PharmacyServiceHelper.requiresPatientConfirmation(order)).isFalse();
    }

    @Test
    void requiresPatientConfirmation_shouldReturnFalseForTerminalStatuses() {
        for (String status : java.util.List.of("CANCELLED", "REFUNDED", "SHIPPING", "DELIVERED", "COMPLETED")) {
            PharmacyOrder order = PharmacyOrder.builder()
                    .status(status)
                    .paymentStatus("PENDING")
                    .patientConfirmationRequestedAt(LocalDateTime.now().minusMinutes(10))
                    .patientConfirmedAt(null)
                    .build();

            assertThat(PharmacyServiceHelper.requiresPatientConfirmation(order))
                    .as(status)
                    .isFalse();
        }
    }

    @Test
    void requiresPatientConfirmation_shouldReturnFalseWhenNoActiveRequest() {
        PharmacyOrder noRequest = PharmacyOrder.builder()
                .status("PENDING")
                .paymentStatus("PENDING")
                .patientConfirmationRequestedAt(null)
                .patientConfirmedAt(null)
                .build();
        PharmacyOrder alreadyConfirmed = PharmacyOrder.builder()
                .status("PENDING")
                .paymentStatus("PENDING")
                .patientConfirmationRequestedAt(LocalDateTime.now().minusMinutes(10))
                .patientConfirmedAt(LocalDateTime.now())
                .build();

        assertThat(PharmacyServiceHelper.requiresPatientConfirmation(null)).isFalse();
        assertThat(PharmacyServiceHelper.requiresPatientConfirmation(noRequest)).isFalse();
        assertThat(PharmacyServiceHelper.requiresPatientConfirmation(alreadyConfirmed)).isFalse();
    }

    static Stream<Arguments> pharmacyChatCases() {
        return Stream.of(
                Arguments.of("PENDING request, no chatRoomId, no order",
                        null, "PENDING", null, null, false, false),
                Arguments.of("IN_REVIEW, has chatRoomId, no order",
                        null, "IN_REVIEW", "room1", null, true, true),
                Arguments.of("IN_REVIEW, has chatRoomId, PENDING order",
                        null, "IN_REVIEW", "room1", "PENDING", true, false),
                Arguments.of("PENDING, has chatRoomId, REVISION_REQUESTED order",
                        null, "PENDING", "room1", "REVISION_REQUESTED", true, true),
                Arguments.of("PENDING, has chatRoomId, PENDING order",
                        null, "PENDING", "room1", "PENDING", true, false),
                Arguments.of("COMPLETED, has chatRoomId, COMPLETED order",
                        null, "COMPLETED", "room1", "COMPLETED", true, false),
                Arguments.of("missing chatRoomId",
                        null, "PENDING", null, "PENDING", false, false),
                Arguments.of("ORDER_REQUEST type",
                        "ORDER_REQUEST", "PENDING", "room1", null, false, false)
        );
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("pharmacyChatCases")
    void canSendPharmacyChat_matchesLifecycle(
            String displayName,
            String requestType,
            String requestStatus,
            String chatRoomId,
            String orderStatus,
            boolean expectedHistory,
            boolean expectedEditable) {
        PharmacyOrder order = orderStatus == null
                ? null
                : PharmacyOrder.builder().status(orderStatus).build();
        PharmacyConsultationRequest request = PharmacyConsultationRequest.builder()
                .requestType(requestType)
                .status(requestStatus)
                .chatRoomId(chatRoomId)
                .order(order)
                .build();

        assertThat(PharmacyServiceHelper.hasPharmacyChatHistory(request))
                .isEqualTo(expectedHistory);
        assertThat(PharmacyServiceHelper.canSendPharmacyChat(request))
                .isEqualTo(expectedEditable);
    }
}
