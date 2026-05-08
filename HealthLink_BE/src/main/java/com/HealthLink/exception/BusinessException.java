package com.HealthLink.exception;

/**
 * Exception ném ra khi vi phạm business rule.
 * Ví dụ: đặt lịch trùng giờ, hủy lịch đã hoàn thành...
 * Được map thành HTTP 400 bởi GlobalExceptionHandler.
 */
public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }
}
