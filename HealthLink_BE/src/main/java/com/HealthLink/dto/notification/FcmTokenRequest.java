package com.HealthLink.dto.notification;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO: FcmTokenRequest
 *
 * Tiếp nhận FCM Token từ ứng dụng di động của bệnh nhân.
 * Được dùng khi đăng ký hoặc xóa token khi đăng xuất.
 */
@Data
public class FcmTokenRequest {

    /** Chuỗi FCM token do Firebase SDK cung cấp */
    @NotBlank(message = "FCM token is required")
    private String token;

    /** Tên thiết bị (tuỳ chọn, để nhận diện thiết bị) */
    private String deviceName;

    /** Nền tảng: ANDROID | IOS */
    private String platform;
}
