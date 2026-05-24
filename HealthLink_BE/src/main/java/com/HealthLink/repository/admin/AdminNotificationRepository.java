package com.HealthLink.repository.admin;

import com.HealthLink.entity.Notification;
import com.HealthLink.entity.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository cho Admin Notification.
 * Package: com.HealthLink.repository.admin
 *
 * Cung cấp các truy vấn đặc biệt cho Admin:
 *  - Lấy notifications của tất cả admin users
 *  - Lọc theo type, thời gian
 *  - Thống kê notifications
 */
@Repository
public interface AdminNotificationRepository extends JpaRepository<Notification, Integer> {

    /**
     * Lấy danh sách notifications của một admin user, sắp xếp mới nhất lên đầu.
     *
     * @param userId   ID của admin user
     * @param pageable Thông tin phân trang
     * @return Trang kết quả Notification
     */
    Page<Notification> findByUser_IdOrderByCreatedAtDesc(String userId, Pageable pageable);

    /**
     * Lấy notifications của admin user theo loại cụ thể.
     *
     * @param userId ID của admin user
     * @param type   Loại notification
     * @param pageable Thông tin phân trang
     * @return Trang kết quả Notification
     */
    Page<Notification> findByUser_IdAndTypeOrderByCreatedAtDesc(
            String userId, NotificationType type, Pageable pageable);

    /**
     * Đếm số notifications chưa đọc của admin user.
     *
     * @param userId ID của admin user
     * @return Số lượng chưa đọc
     */
    long countByUser_IdAndReadFalse(String userId);

    /**
     * Đếm số notifications chưa đọc theo loại.
     *
     * @param userId ID của admin user
     * @param type   Loại notification
     * @return Số lượng chưa đọc
     */
    long countByUser_IdAndTypeAndReadFalse(String userId, NotificationType type);

    /**
     * Đánh dấu tất cả notifications của admin là đã đọc.
     *
     * @param userId ID của admin user
     * @return Số lượng bản ghi được cập nhật
     */
    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.user.id = :userId AND n.read = false")
    int markAllAsReadByUserId(@Param("userId") String userId);

    /**
     * Đánh dấu tất cả notifications theo loại là đã đọc.
     *
     * @param userId ID của admin user
     * @param type   Loại notification
     * @return Số lượng bản ghi được cập nhật
     */
    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.user.id = :userId AND n.type = :type AND n.read = false")
    int markAllAsReadByUserIdAndType(@Param("userId") String userId, @Param("type") NotificationType type);

    /**
     * Xóa notification theo ID và kiểm tra quyền sở hữu.
     *
     * @param notificationId ID của notification
     * @param userId         ID của admin user
     * @return Số lượng bản ghi bị xóa (0 hoặc 1)
     */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.notificationId = :notificationId AND n.user.id = :userId")
    int deleteByNotificationIdAndUserId(
            @Param("notificationId") Integer notificationId,
            @Param("userId") String userId);

    /**
     * Xóa các notifications cũ hơn một thời điểm nhất định.
     * Dùng cho chức năng cleanup / archiving.
     *
     * @param userId    ID của admin user
     * @param threshold Thời điểm ngưỡng
     * @return Số lượng bản ghi bị xóa
     */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.user.id = :userId AND n.createdAt < :threshold")
    int deleteOldNotifications(@Param("userId") String userId, @Param("threshold") LocalDateTime threshold);

    /**
     * Lấy notifications trong khoảng thời gian.
     *
     * @param userId ID của admin user
     * @param from   Thời điểm bắt đầu
     * @param to     Thời điểm kết thúc
     * @return Danh sách notifications
     */
    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId AND n.createdAt BETWEEN :from AND :to ORDER BY n.createdAt DESC")
    List<Notification> findByUserIdAndCreatedAtBetween(
            @Param("userId") String userId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /**
     * Đếm notifications theo loại trong khoảng thời gian (cho thống kê).
     *
     * @param userId ID của admin user
     * @param type   Loại notification
     * @param from   Thời điểm bắt đầu
     * @param to     Thời điểm kết thúc
     * @return Số lượng
     */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user.id = :userId AND n.type = :type AND n.createdAt BETWEEN :from AND :to")
    long countByUserIdAndTypeAndCreatedAtBetween(
            @Param("userId") String userId,
            @Param("type") NotificationType type,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
