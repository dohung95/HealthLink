package com.HealthLink.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class CdsDecisionConflictException extends RuntimeException {
    public CdsDecisionConflictException(String message) {
        super(message);
    }
}
