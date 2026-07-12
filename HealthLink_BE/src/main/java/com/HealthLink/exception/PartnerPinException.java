package com.HealthLink.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;

@Getter
public class PartnerPinException extends RuntimeException {
    private final HttpStatus status;
    private final Integer attemptsRemaining;
    private final LocalDateTime lockedUntil;

    public PartnerPinException(String message, HttpStatus status, Integer attemptsRemaining, LocalDateTime lockedUntil) {
        super(message);
        this.status = status;
        this.attemptsRemaining = attemptsRemaining;
        this.lockedUntil = lockedUntil;
    }

    public static PartnerPinException required() {
        return new PartnerPinException("A withdrawal PIN is required", HttpStatus.CONFLICT, null, null);
    }

    public static PartnerPinException invalid(int attemptsRemaining) {
        return new PartnerPinException("Invalid withdrawal PIN", HttpStatus.UNPROCESSABLE_ENTITY, attemptsRemaining, null);
    }

    public static PartnerPinException locked(LocalDateTime lockedUntil) {
        return new PartnerPinException("Withdrawal PIN is temporarily locked", HttpStatus.LOCKED, 0, lockedUntil);
    }

    public static PartnerPinException badRequest(String message) {
        return new PartnerPinException(message, HttpStatus.UNPROCESSABLE_ENTITY, null, null);
    }
}
