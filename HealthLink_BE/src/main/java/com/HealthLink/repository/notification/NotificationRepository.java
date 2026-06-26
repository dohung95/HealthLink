package com.HealthLink.repository.notification;

import com.HealthLink.entity.Notification;
import com.HealthLink.entity.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository cho entity Notification.
 * Package: com.HealthLink.repository.notification
 *
 * Cung cấp các truy vấn phân trang và đếm thông báo chưa đọc
 * để phục vụ giao diện người dùng (badge counter, danh sách thông báo).
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Integer> {

    /**
     * Lấy danh sách thông báo phân trang của một người dùng,
     * sắp xếp theo thời gian tạo mới nhất (dùng cho trang thông báo / Notification Center).
     *
     * @param userId   ID của user
     * @param pageable Thông tin phân trang và sắp xếp
     * @return Trang kết quả Notification
     */
    Page<Notification> findByUser_IdOrderByCreatedAtDesc(String userId, Pageable pageable);

    /**
     * Đếm số thông báo chưa đọc của người dùng.
     * Dùng để hiển thị badge (chấm đỏ / con số) trên UI.
     *
     * @param userId ID của user
     * @return Số lượng thông báo chưa đọc
     */
    long countByUser_IdAndReadFalse(String userId);

    /**
     * Đánh dấu tất cả thông báo của user là đã đọc.
     * Dùng cho chức năng "Mark all as read".
     *
     * @param userId ID của user
     * @return Số lượng bản ghi được cập nhật
     */
    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.user.id = :userId AND n.read = false")
    int markAllAsReadByUserId(@Param("userId") String userId);

    /**
     * Xóa thông báo theo ID và kiểm tra quyền sở hữu.
     * Chỉ xóa nếu notification thuộc về user đang đăng nhập.
     *
     * @param notificationId ID của notification
     * @param userId ID của user
     * @return Số lượng bản ghi bị xóa (0 hoặc 1)
     */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.notificationId = :notificationId AND n.user.id = :userId")
    int deleteByNotificationIdAndUserId(@Param("notificationId") Integer notificationId, @Param("userId") String userId);

    @Modifying
    @Query("""
            UPDATE Notification n
               SET n.read = true
             WHERE n.user.id = :userId
               AND n.type = :type
               AND n.relatedId = :relatedId
               AND n.read = false
            """)
    int markAsReadByUserIdAndTypeAndRelatedId(
            @Param("userId") String userId,
            @Param("type") NotificationType type,
            @Param("relatedId") Integer relatedId
    );
}
