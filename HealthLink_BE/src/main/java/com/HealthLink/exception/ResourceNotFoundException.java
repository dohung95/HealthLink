package com.HealthLink.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Ném ra khi không tìm thấy tài nguyên được yêu cầu trong hệ thống.
 * Tương ứng HTTP 404 Not Found.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)

public class ResourceNotFoundException extends RuntimeException {

    /**
     * @param message Mô tả tài nguyên không tồn tại
     */
    public ResourceNotFoundException(String message) {
        super(message);
    }

    /**
     * @param resourceName Tên tài nguyên (ví dụ: "ChatRoom", "Appointment")
     * @param fieldName    Tên trường tìm kiếm (ví dụ: "id")
     * @param fieldValue   Giá trị tìm kiếm
     */
    public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
        super(String.format("%s not found with %s: '%s'", resourceName, fieldName, fieldValue));
    }
}
