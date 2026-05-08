package com.HealthLink.exception;

/**
 * Exception ném ra khi không tìm thấy resource (Patient, Doctor, Appointment...).
 * Được map thành HTTP 404 bởi GlobalExceptionHandler.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
