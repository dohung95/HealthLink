package com.HealthLink.exception;

public class GeocodingProviderUnavailableException extends RuntimeException {
    public GeocodingProviderUnavailableException(String message) {
        super(message);
    }
}
