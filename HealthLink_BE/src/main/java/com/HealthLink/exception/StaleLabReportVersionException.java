package com.HealthLink.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class StaleLabReportVersionException extends RuntimeException {
    public StaleLabReportVersionException() {
        super("Lab report has changed; reload verification data before saving");
    }
}
