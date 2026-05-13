package com.HealthLink.dto.notification;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;

/**
 * DTO: PushRequest
 *
 * Đại diện cho nội dung một tin nhắn Push Notification sẽ gửi đến thiết bị di động
 * thông qua Firebase Cloud Messaging (FCM).
 */
@Data
@Builder
public class PushRequest {

    /** FCM token của thiết bị nhận */
    @NotBlank(message = "FCM token is required")
    private String token;

    /** Tiêu đề thông báo hiển thị trên thiết bị */
    @NotBlank(message = "Title is required")
    private String title;

    /** Nội dung thông báo hiển thị trên thiết bị */
    @NotBlank(message = "Body is required")
    private String body;

    /** Dữ liệu mở rộng (deep link, loại thông báo, v.v.) — tuỳ chọn */
    private String data;

    /** URL hình ảnh đính kèm — tuỳ chọn */
    private String imageUrl;
}
