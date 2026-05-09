package com.HealthLink.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Ném ra khi dữ liệu đầu vào không hợp lệ hoặc yêu cầu vi phạm quy tắc nghiệp vụ.
 * Tương ứng HTTP 400 Bad Request.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class BadRequestException extends RuntimeException {

    /** @param message Mô tả lý do yêu cầu không hợp lệ */
    public BadRequestException(String message) {
        super(message);
    }
}
