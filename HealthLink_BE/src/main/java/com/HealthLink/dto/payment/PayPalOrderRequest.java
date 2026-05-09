package com.HealthLink.dto.payment;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request body gửi bởi client để tạo đơn hàng PayPal.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayPalOrderRequest {

    /**
     * Hóa đơn cần thanh toán, back-end sẽ lấy số tiền từ hóa đơn
     */
    @NotNull(message = "invoiceId bắt buộc phải có")
    private Integer invoiceId;

    /**
     * Mã tiền tệ ISO 4217 - mặc định là "USD" khi không được cung cấp.
     * Đối với các hóa đơn VND, người gọi nên gửi "USD" với số tiền đã quy đổi hoặc
     * Cấu hình mặc định ở lớp service.
     */
    private String currency = "USD";
}
