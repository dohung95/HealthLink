package com.HealthLink.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Ném ra khi refresh token không hợp lệ, đã bị thu hồi, hoặc đã hết hạn.
 * Tương ứng HTTP 401 Unauthorized.
 */
@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class InvalidTokenException extends RuntimeException {

    /** @param message Mô tả lý do token không hợp lệ */
    public InvalidTokenException(String message) {
        super(message);
    }
}
