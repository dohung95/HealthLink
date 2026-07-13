package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.entity.PharmacyOrder;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

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
}
