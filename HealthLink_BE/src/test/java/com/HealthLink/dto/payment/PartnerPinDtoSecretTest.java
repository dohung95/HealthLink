package com.HealthLink.dto.payment;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PartnerPinDtoSecretTest {

    @Test
    void pinDtosDoNotExposeSecretsThroughToString() {
        PartnerPinOtpVerificationRequest verificationRequest = new PartnerPinOtpVerificationRequest("otp-908172");
        PartnerPinUpdateRequest updateRequest = new PartnerPinUpdateRequest(
                "otp-123456", "pin-654321", "confirm-654321");

        assertThat(verificationRequest.toString()).doesNotContain("otp-908172");
        assertThat(updateRequest.toString()).doesNotContain("otp-123456", "pin-654321", "confirm-654321");
    }
}
