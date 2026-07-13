package com.HealthLink.exception;

public class GeocodingResultNotFoundException extends RuntimeException {
    public GeocodingResultNotFoundException(String message) {
        super(message);
    }
}
