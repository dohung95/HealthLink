package com.HealthLink.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Ném ra khi số dư của đối tác (Doctor/Pharmacy) không đủ điều kiện để thực hiện rút tiền.
 * Xảy ra trong hai trường hợp:
 * <ul>
 *   <li>pendingSettlement &lt; $10.00 (ngưỡng tối thiểu)</li>
 *   <li>Số tiền yêu cầu rút vượt quá số dư khả dụng</li>
 * </ul>
 * Tương ứng HTTP 400 Bad Request.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InsufficientBalanceException extends RuntimeException {

    /**
     * @param message Mô tả lý do số dư không đủ (kèm số liệu cụ thể)
     */
    public InsufficientBalanceException(String message) {
        super(message);
    }
}
