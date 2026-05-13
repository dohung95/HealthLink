package com.HealthLink.repository.notification;

import com.HealthLink.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
