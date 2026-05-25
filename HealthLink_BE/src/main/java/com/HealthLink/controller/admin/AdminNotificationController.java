package com.HealthLink.controller.admin;

import com.HealthLink.dto.notification.NotificationResponse;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.admin.AdminNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Controller: AdminNotificationController
 * Base URL: /api/admin/notifications
 *
 * Cung cấp các REST endpoint cho Admin quản lý notifications:
 *  - Lấy danh sách notifications (phân trang, lọc theo type)
 *  - Đếm số chưa đọc (badge counter)
 *  - Đánh dấu đã đọc (một / tất cả / theo type)
 *  - Xóa notification
 *  - Thống kê notifications
 *
 * Bảo mật: Tất cả endpoint yêu cầu role ADMIN.
 */
@RestController
@RequestMapping("/api/admin/notifications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class AdminNotificationController {

    private final AdminNotificationService adminNotificationService;
    private final UserRepository userRepository;

    // =========================================================================
    // GET /api/admin/notifications
    // Lấy danh sách notifications phân trang
    // =========================================================================

    /**
     * Lấy danh sách notifications của admin đang đăng nhập.
     *
     * @param userDetails Spring Security principal
     * @param page        Trang hiện tại (mặc định: 0)
     * @param size        Số item mỗi trang (mặc định: 20)
     * @param type        Lọc theo loại (optional)
     * @return Page<NotificationResponse>
     */
    @GetMapping
    public ResponseEntity<Page<NotificationResponse>> getNotifications(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) NotificationType type) {

        String adminId = resolveUserId(userDetails);
        Pageable pageable = PageRequest.of(page, size);

        Page<NotificationResponse> result;
        if (type != null) {
            result = adminNotificationService.getNotificationsByType(adminId, type, pageable);
        } else {
            result = adminNotificationService.getNotifications(adminId, pageable);
        }

        return ResponseEntity.ok(result);
    }

    // =========================================================================
    // GET /api/admin/notifications/unread-count
    // Đếm số notifications chưa đọc
    // =========================================================================

    /**
     * Trả về số lượng notifications chưa đọc (badge counter).
     *
     * @param userDetails Spring Security principal
     * @return {"unreadCount": N}
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @AuthenticationPrincipal UserDetails userDetails) {

        String adminId = resolveUserId(userDetails);
        long count = adminNotificationService.countUnread(adminId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    // =========================================================================
    // GET /api/admin/notifications/unread-count-by-type
    // Đếm số chưa đọc theo từng loại
    // =========================================================================

    /**
     * Trả về số lượng notifications chưa đọc theo từng loại.
     * Dùng cho UI hiển thị badge riêng cho mỗi category.
     *
     * @param userDetails Spring Security principal
     * @return {"NEW_REGISTRATION": 3, "NEW_APPOINTMENT": 5, ...}
     */
    @GetMapping("/unread-count-by-type")
    public ResponseEntity<Map<NotificationType, Long>> getUnreadCountByType(
            @AuthenticationPrincipal UserDetails userDetails) {

        String adminId = resolveUserId(userDetails);
        Map<NotificationType, Long> counts = adminNotificationService.countUnreadByType(adminId);
        return ResponseEntity.ok(counts);
    }

    // =========================================================================
    // PATCH /api/admin/notifications/{id}/read
    // Đánh dấu một notification là đã đọc
    // =========================================================================

    /**
     * Đánh dấu notification có ID cho trước là đã đọc.
     *
     * @param id          ID của notification
     * @param userDetails Spring Security principal
     * @return {"message": "Notification marked as read"}
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<Map<String, String>> markAsRead(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserDetails userDetails) {

        String adminId = resolveUserId(userDetails);
        adminNotificationService.markAsRead(id, adminId);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    // =========================================================================
    // PATCH /api/admin/notifications/mark-all-read
    // Đánh dấu tất cả notifications là đã đọc
    // =========================================================================

    /**
     * Đánh dấu tất cả notifications là đã đọc.
     *
     * @param userDetails Spring Security principal
     * @param type        Lọc theo loại (optional) - nếu có chỉ đánh dấu loại đó
     * @return {"message": "...", "count": N}
     */
    @PatchMapping("/mark-all-read")
    public ResponseEntity<Map<String, Object>> markAllAsRead(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) NotificationType type) {

        String adminId = resolveUserId(userDetails);
        int count;

        if (type != null) {
            count = adminNotificationService.markAllAsReadByType(adminId, type);
            return ResponseEntity.ok(Map.of(
                    "message", "All " + type + " notifications marked as read",
                    "count", count
            ));
        } else {
            count = adminNotificationService.markAllAsRead(adminId);
            return ResponseEntity.ok(Map.of(
                    "message", "All notifications marked as read",
                    "count", count
            ));
        }
    }

    // =========================================================================
    // DELETE /api/admin/notifications/{id}
    // Xóa một notification
    // =========================================================================

    /**
     * Xóa notification có ID cho trước.
     *
     * @param id          ID của notification
     * @param userDetails Spring Security principal
     * @return {"message": "Notification deleted"}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteNotification(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserDetails userDetails) {

        String adminId = resolveUserId(userDetails);
        boolean deleted = adminNotificationService.deleteNotification(id, adminId);

        if (!deleted) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "Notification not found or access denied"));
        }

        return ResponseEntity.ok(Map.of("message", "Notification deleted"));
    }

    // =========================================================================
    // DELETE /api/admin/notifications/cleanup
    // Xóa các notifications cũ
    // =========================================================================

    /**
     * Xóa các notifications cũ hơn số ngày chỉ định.
     * Dùng cho chức năng cleanup / maintenance.
     *
     * @param userDetails Spring Security principal
     * @param daysOld     Số ngày tuổi tối thiểu (mặc định: 30)
     * @return {"message": "...", "deletedCount": N}
     */
    @DeleteMapping("/cleanup")
    public ResponseEntity<Map<String, Object>> cleanupOldNotifications(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "30") int daysOld) {

        String adminId = resolveUserId(userDetails);
        int deleted = adminNotificationService.deleteOldNotifications(adminId, daysOld);

        return ResponseEntity.ok(Map.of(
                "message", "Deleted notifications older than " + daysOld + " days",
                "deletedCount", deleted
        ));
    }

    // =========================================================================
    // GET /api/admin/notifications/statistics
    // Thống kê notifications
    // =========================================================================

    /**
     * Lấy thống kê notifications trong khoảng thời gian.
     *
     * @param userDetails Spring Security principal
     * @param days        Số ngày gần đây (mặc định: 7)
     * @return {"NEW_REGISTRATION": 10, "NEW_APPOINTMENT": 25, ...}
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<NotificationType, Long>> getStatistics(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "7") int days) {

        String adminId = resolveUserId(userDetails);
        LocalDateTime from = LocalDateTime.now().minusDays(days);
        LocalDateTime to = LocalDateTime.now();

        Map<NotificationType, Long> stats = adminNotificationService.getStatistics(adminId, from, to);
        return ResponseEntity.ok(stats);
    }

    // =========================================================================
    // Helper: lấy userId từ SecurityContext
    // =========================================================================

    private String resolveUserId(UserDetails userDetails) {
        String email = userDetails.getUsername();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException(
                        "Authenticated user not found in DB: " + email));
        return user.getId();
    }
}
