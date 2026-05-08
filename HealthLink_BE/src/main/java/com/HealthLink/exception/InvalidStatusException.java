package com.HealthLink.exception;

public class InvalidStatusException extends RuntimeException {

    public InvalidStatusException(String message) {
        super(message);
    }

    public InvalidStatusException(String currentStatus, String targetStatus) {
        super(String.format("Cannot transition order status from '%s' to '%s'", currentStatus, targetStatus));
    }
}