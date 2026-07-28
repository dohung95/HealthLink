package com.HealthLink.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class StaleCdsDecisionVersionException extends RuntimeException {
    public StaleCdsDecisionVersionException() {
        super("CDS decision has changed; reload before saving");
    }
}
