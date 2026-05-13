package com.HealthLink.repository.notification;

import com.HealthLink.entity.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho entity DeviceToken.
 * Package: com.HealthLink.repository.notification
 *
 * Quản lý FCM Token của bệnh nhân để hỗ trợ Mobile Push Notification.
 * Token được đăng ký khi bệnh nhân đăng nhập từ thiết bị di động,
 * và cần được vô hiệu hóa khi FCM báo lỗi UNREGISTERED.
 */
@Repository
public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Integer> {

    /**
     * Lấy tất cả token còn hoạt động của một người dùng.
     * Dùng khi gửi Push Notification đến tất cả thiết bị của user.
     *
     * @param userId ID của user
     * @return Danh sách DeviceToken đang active
     */
    List<DeviceToken> findByUser_IdAndActiveTrue(String userId);

    /**
     * Tìm token cụ thể theo chuỗi FCM token.
     * Dùng để kiểm tra trùng lặp trước khi lưu mới.
     *
     * @param token Chuỗi FCM token từ Firebase SDK
     * @return Optional DeviceToken nếu tìm thấy
     */
    Optional<DeviceToken> findByToken(String token);

    /**
     * Kiểm tra token đã tồn tại cho user này chưa.
     * Ngăn lưu trùng cùng một token cho cùng một user.
     *
     * @param userId ID của user
     * @param token  Chuỗi FCM token
     * @return true nếu đã tồn tại
     */
    boolean existsByUser_IdAndToken(String userId, String token);

    /**
     * Vô hiệu hóa tất cả token của một user (ví dụ: khi user đăng xuất khỏi tất cả thiết bị).
     *
     * @param userId ID của user
     */
    @Modifying
    @Transactional
    @Query("UPDATE DeviceToken dt SET dt.active = false WHERE dt.user.id = :userId")
    void deactivateAllByUserId(@Param("userId") String userId);

    /**
     * Vô hiệu hóa một token cụ thể (khi FCM trả về lỗi UNREGISTERED).
     *
     * @param token Chuỗi FCM token cần vô hiệu hóa
     */
    @Modifying
    @Transactional
    @Query("UPDATE DeviceToken dt SET dt.active = false WHERE dt.token = :token")
    void deactivateByToken(@Param("token") String token);
}
