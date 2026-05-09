package com.HealthLink.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Ném ra khi dữ liệu đã tồn tại trong hệ thống (ví dụ: email hoặc username trùng lặp).
 * Tương ứng HTTP 409 Conflict.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicateResourceException extends RuntimeException {

    /**
     * @param resourceName Tên tài nguyên bị trùng (ví dụ: "User")
     * @param fieldName    Tên trường bị trùng (ví dụ: "email")
     * @param fieldValue   Giá trị bị trùng
     */
    public DuplicateResourceException(String resourceName, String fieldName, Object fieldValue) {
        super(String.format("%s already exists with %s: '%s'", resourceName, fieldName, fieldValue));
    }
}
