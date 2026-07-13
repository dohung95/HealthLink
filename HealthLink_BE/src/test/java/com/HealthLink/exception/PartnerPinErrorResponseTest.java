package com.HealthLink.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class PartnerPinErrorResponseTest {

    @Test
    void otpCooldownErrorAddsCodeAndRetryAfterWithoutRemovingExistingFields() {
        PartnerPinException exception = PartnerPinException.otpCooldown(17);

        ResponseEntity<java.util.Map<String, Object>> response = new GlobalExceptionHandler().handlePartnerPin(exception);

        assertThat(response.getStatusCode().value()).isEqualTo(429);
        assertThat(response.getBody()).containsKeys("timestamp", "status", "error", "message", "code", "retryAfterSeconds");
        assertThat(response.getBody()).containsEntry("code", "PIN_OTP_COOLDOWN");
        assertThat(response.getBody()).containsEntry("retryAfterSeconds", 17);
    }
}
