package com.HealthLink.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;

@Getter
public class PartnerPinException extends RuntimeException {
    private final HttpStatus status;
    private final Integer attemptsRemaining;
    private final LocalDateTime lockedUntil;
    private final String code;
    private final Integer retryAfterSeconds;

    public PartnerPinException(String message, HttpStatus status, Integer attemptsRemaining, LocalDateTime lockedUntil) {
        this(message, status, attemptsRemaining, lockedUntil, null, null);
    }

    private PartnerPinException(String message, HttpStatus status, Integer attemptsRemaining, LocalDateTime lockedUntil,
                                String code, Integer retryAfterSeconds) {
        super(message);
        this.status = status;
        this.attemptsRemaining = attemptsRemaining;
        this.lockedUntil = lockedUntil;
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public static PartnerPinException required() {
        return new PartnerPinException("A withdrawal PIN is required", HttpStatus.CONFLICT,
                null, null, "PIN_REQUIRED", null);
    }

    public static PartnerPinException invalid(int attemptsRemaining) {
        return new PartnerPinException("Invalid withdrawal PIN", HttpStatus.UNPROCESSABLE_ENTITY,
                attemptsRemaining, null, "PIN_INVALID", null);
    }

    public static PartnerPinException locked(LocalDateTime lockedUntil) {
        return new PartnerPinException("Withdrawal PIN is temporarily locked", HttpStatus.LOCKED,
                0, lockedUntil, "PIN_LOCKED", null);
    }

    public static PartnerPinException badRequest(String message) {
        return new PartnerPinException(message, HttpStatus.UNPROCESSABLE_ENTITY, null, null);
    }

    public static PartnerPinException otpInvalid() {
        return new PartnerPinException("Invalid withdrawal PIN OTP", HttpStatus.UNPROCESSABLE_ENTITY, null, null,
                "PIN_OTP_INVALID", null);
    }

    public static PartnerPinException otpExpired() {
        return new PartnerPinException("Withdrawal PIN OTP has expired", HttpStatus.UNPROCESSABLE_ENTITY, null, null,
                "PIN_OTP_EXPIRED", null);
    }

    public static PartnerPinException otpAttemptsExceeded() {
        return new PartnerPinException("Too many invalid withdrawal PIN OTP attempts", HttpStatus.UNPROCESSABLE_ENTITY,
                null, null, "PIN_OTP_ATTEMPTS_EXCEEDED", null);
    }

    public static PartnerPinException otpCooldown(int retryAfterSeconds) {
        return new PartnerPinException("Please wait before requesting another withdrawal PIN OTP",
                HttpStatus.TOO_MANY_REQUESTS, null, null, "PIN_OTP_COOLDOWN", retryAfterSeconds);
    }
}
