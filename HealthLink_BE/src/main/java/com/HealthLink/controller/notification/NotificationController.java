package com.HealthLink.controller.notification;

import com.HealthLink.dto.notification.FcmTokenRequest;
import com.HealthLink.dto.notification.NotificationResponse;
import com.HealthLink.entity.User;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.notification.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller: NotificationController
 * Base URL: /api/notifications
 *
 * Cung cấp các REST endpoint để:
 *  - Lấy danh sách thông báo cá nhân (phân trang)
 *  - Đánh dấu một thông báo đã đọc
 *  - Đếm số thông báo chưa đọc (badge counter)
 *  - Đăng ký / xóa FCM token của thiết bị di động
 *
 * Bảo mật: tất cả endpoint yêu cầu xác thực JWT.
 * Người dùng chỉ có thể truy cập thông báo của chính họ (được kiểm tra tại service layer).
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository      userRepository;

    // =========================================================================
    // GET /api/notifications
    // Lấy danh sách thông báo phân trang của user đang đăng nhập
    // =========================================================================

    /**
     * Lấy danh sách thông báo cá nhân, sắp xếp mới nhất lên đầu.
     *
     * @param userDetails Spring Security principal
     * @param page        Trang hiện tại (mặc định: 0)
     * @param size        Số item mỗi trang (mặc định: 20)
     * @return Page<NotificationResponse>
     */
    @GetMapping
    public ResponseEntity<Page<NotificationResponse>> getNotifications(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        String userId = resolveUserId(userDetails);
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(notificationService.getNotifications(userId, pageable));
    }

    // =========================================================================
    // GET /api/notifications/unread-count
    // Đếm số thông báo chưa đọc (dùng cho badge trên UI)
    // =========================================================================

    /**
     * Trả về số lượng thông báo chưa đọc của user (badge counter).
     *
     * @param userDetails Spring Security principal
     * @return {"unreadCount": N}
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @AuthenticationPrincipal UserDetails userDetails) {

        String userId = resolveUserId(userDetails);
        long count = notificationService.countUnread(userId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    // =========================================================================
    // PATCH /api/notifications/{id}/read
    // Đánh dấu một thông báo là đã đọc
    // =========================================================================

    /**
     * Đánh dấu thông báo có ID cho trước là đã đọc.
     * Trả về 403 nếu user cố tình đọc thông báo của người khác.
     *
     * @param id          ID của thông báo
     * @param userDetails Spring Security principal
     * @return {"message": "Notification marked as read"}
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<Map<String, String>> markAsRead(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserDetails userDetails) {

        String userId = resolveUserId(userDetails);
        notificationService.markAsRead(id, userId);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    // =========================================================================
    // PATCH /api/notifications/mark-all-read
    // Đánh dấu tất cả thông báo của user là đã đọc
    // =========================================================================

    /**
     * Đánh dấu tất cả thông báo của user hiện tại là đã đọc.
     *
     * @param userDetails Spring Security principal
     * @return {"message": "All notifications marked as read", "count": N}
     */
    @PatchMapping("/mark-all-read")
    public ResponseEntity<Map<String, Object>> markAllAsRead(
            @AuthenticationPrincipal UserDetails userDetails) {

        String userId = resolveUserId(userDetails);
        int count = notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of(
                "message", "All notifications marked as read",
                "count", count
        ));
    }

    // =========================================================================
    // DELETE /api/notifications/{id}
    // Xóa một thông báo
    // =========================================================================

    /**
     * Xóa thông báo có ID cho trước.
     * Chỉ owner của thông báo mới được xóa.
     *
     * @param id          ID của thông báo
     * @param userDetails Spring Security principal
     * @return {"message": "Notification deleted"}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteNotification(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserDetails userDetails) {

        String userId = resolveUserId(userDetails);
        boolean deleted = notificationService.deleteNotification(id, userId);

        if (!deleted) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "Notification not found or access denied"));
        }

        return ResponseEntity.ok(Map.of("message", "Notification deleted"));
    }

    // =========================================================================
    // POST /api/notifications/fcm-token
    // Đăng ký FCM token từ thiết bị di động của bệnh nhân
    // =========================================================================

    /**
     * Tiếp nhận và lưu FCM token từ ứng dụng di động khi bệnh nhân đăng nhập.
     * Idempotent: nếu token đã tồn tại thì không lưu thêm.
     *
     * @param request     Thông tin FCM token (token, deviceName, platform)
     * @param userDetails Spring Security principal
     * @return {"message": "FCM token registered"}
     */
    @PostMapping("/fcm-token")
    public ResponseEntity<Map<String, String>> registerFcmToken(
            @Valid @RequestBody FcmTokenRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = resolveUser(userDetails);
        notificationService.registerFcmToken(user, request);
        return ResponseEntity.ok(Map.of("message", "FCM token registered"));
    }

    // =========================================================================
    // DELETE /api/notifications/fcm-token
    // Xóa FCM token khi bệnh nhân đăng xuất
    // =========================================================================

    /**
     * Deactivate FCM token khi bệnh nhân đăng xuất khỏi thiết bị di động.
     * Ngăn việc gửi thông báo đến phiên đăng nhập cũ.
     *
     * @param request     Thông tin token cần xóa
     * @param userDetails Spring Security principal
     * @return {"message": "FCM token removed"}
     */
    @DeleteMapping("/fcm-token")
    public ResponseEntity<Map<String, String>> removeFcmToken(
            @Valid @RequestBody FcmTokenRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = resolveUser(userDetails);
        notificationService.removeFcmToken(user, request.getToken());
        return ResponseEntity.ok(Map.of("message", "FCM token removed"));
    }

    // =========================================================================
    // Helper: lấy userId / User từ SecurityContext
    // =========================================================================

    /**
     * Lấy userId (email dùng làm principal) và map sang User.id từ DB.
     * Dùng email để tìm User vì Spring Security lưu email làm username.
     */
    private String resolveUserId(UserDetails userDetails) {
        return resolveUser(userDetails).getId();
    }

    private User resolveUser(UserDetails userDetails) {
        String email = userDetails.getUsername();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException(
                        "Authenticated user not found in DB: " + email));
    }
}
