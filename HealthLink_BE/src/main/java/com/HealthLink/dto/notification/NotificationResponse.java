package com.HealthLink.dto.notification;

import com.HealthLink.entity.enums.NotificationChannel;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO: NotificationResponse
 *
 * Trả về thông tin thông báo cho client (danh sách / chi tiết).
 * Không expose userId trực tiếp — đã được đảm bảo bởi service layer.
 */
@Data
@Builder
public class NotificationResponse {

    private Integer notificationId;

    /** Tiêu đề ngắn gọn của thông báo */
    private String title;

    /** Nội dung chi tiết của thông báo */
    private String message;

    /** Loại thông báo (APPOINTMENT_REMINDER, NEW_PRESCRIPTION, v.v.) */
    private NotificationType type;

    /** Kênh gửi (WEB_SOCKET, MOBILE_PUSH, EMAIL) */
    private NotificationChannel sentVia;

    /** Mức ưu tiên (HIGH, NORMAL, LOW) */
    private NotificationPriority priority;

    /** Trạng thái đã đọc hay chưa */
    private Boolean read;

    /** URL để điều hướng khi nhấn vào thông báo */
    private String actionUrl;

    /** URL hình ảnh đính kèm (nếu có) */
    private String imageUrl;

    /** Thời gian tạo thông báo */
    private LocalDateTime createdAt;

    /** Thời gian hết hạn của thông báo (nếu có) */
    private LocalDateTime expiresAt;

    /** ID liên quan (AppointmentID, OrderID, v.v.) */
    private Integer relatedId;
}
