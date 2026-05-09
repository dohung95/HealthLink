package com.HealthLink.dto.payment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request body gửi bởi client sau khi người dùng đã phê duyệt thanh toán trên PayPal.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayPalCaptureRequest {

    /**
     * PayPal order-ID được trả về từ bước create-order.
     */
    @NotBlank(message = "orderId không được để trống")
    private String orderId;

    /**
     * Hóa đơn liên kết với thanh toán này – dùng để cập nhật cơ sở dữ liệu.
     */
    @NotNull(message = "invoiceId bắt buộc phải có")
    private Integer invoiceId;

    /**
     * Hằng số phương thức thanh toán (EWallet hoặc Card).
     * Mặc định là EWallet (tài khoản PayPal) nếu không được cung cấp.
     */
    private String paymentMethod = "EWallet";
}
