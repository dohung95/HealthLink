package com.HealthLink.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;

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

    @Test
    void requiredPinHasStableCode() {
        var response = new GlobalExceptionHandler().handlePartnerPin(PartnerPinException.required());
        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody()).containsEntry("code", "PIN_REQUIRED");
    }

    @Test
    void invalidPinIncludesStableCodeAndAttemptsRemaining() {
        var response = new GlobalExceptionHandler().handlePartnerPin(PartnerPinException.invalid(2));
        assertThat(response.getStatusCode().value()).isEqualTo(422);
        assertThat(response.getBody()).containsEntry("code", "PIN_INVALID");
        assertThat(response.getBody()).containsEntry("attemptsRemaining", 2);
    }

    @Test
    void lockedPinIncludesStableCodeAndLockedUntil() {
        LocalDateTime lockedUntil = LocalDateTime.of(2026, 7, 13, 12, 30);
        var response = new GlobalExceptionHandler().handlePartnerPin(PartnerPinException.locked(lockedUntil));
        assertThat(response.getStatusCode().value()).isEqualTo(423);
        assertThat(response.getBody()).containsEntry("code", "PIN_LOCKED");
        assertThat(response.getBody()).containsEntry("lockedUntil", lockedUntil);
    }
}
