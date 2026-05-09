package com.HealthLink.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Ném ra khi người dùng không được phép thực hiện hành động
 * (đã xác thực nhưng không có quyền).
 * Tương ứng HTTP 403 Forbidden.
 */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class ForbiddenException extends RuntimeException {

    /** @param message Mô tả lý do bị từ chối quyền truy cập */
    public ForbiddenException(String message) {
        super(message);
    }
}
