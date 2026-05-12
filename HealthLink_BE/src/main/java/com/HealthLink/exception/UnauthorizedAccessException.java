package com.HealthLink.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Ném ra khi đối tác (Doctor/Pharmacy) cố truy cập tài nguyên hoặc thực hiện thao tác
 * không thuộc quyền của họ.
 * Tương ứng HTTP 403 Forbidden.
 */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class UnauthorizedAccessException extends RuntimeException {

    /**
     * @param message Mô tả hành động bị từ chối
     */
    public UnauthorizedAccessException(String message) {
        super(message);
    }
}
