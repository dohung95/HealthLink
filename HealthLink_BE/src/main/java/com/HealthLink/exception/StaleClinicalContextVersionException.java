package com.HealthLink.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class StaleClinicalContextVersionException extends RuntimeException {
    public StaleClinicalContextVersionException() {
        super("Clinical context has changed; reload before saving");
    }
}
