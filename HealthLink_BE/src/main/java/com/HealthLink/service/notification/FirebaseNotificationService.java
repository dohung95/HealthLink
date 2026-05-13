package com.HealthLink.service.notification;

import com.HealthLink.dto.notification.PushRequest;
import com.HealthLink.repository.notification.DeviceTokenRepository;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service: FirebaseNotificationService
 *
 * Gửi Push Notification đến thiết bị di động của Bệnh nhân thông qua Firebase Cloud Messaging (FCM).
 * Tất cả các thao tác gửi được thực hiện bất đồng bộ (@Async) để không block luồng chính.
 *
 * Các lỗi FCM phổ biến được xử lý:
 *  - UNREGISTERED: token không còn hợp lệ → tự động deactivate
 *  - INVALID_ARGUMENT: token sai định dạng → bỏ qua
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FirebaseNotificationService {

    private final DeviceTokenRepository deviceTokenRepository;

    /**
     * Gửi Push Notification đến tất cả thiết bị đang active của một user.
     *
     * @param userId  ID của bệnh nhân
     * @param title   Tiêu đề thông báo
     * @param body    Nội dung thông báo
     */
    @Async
    public void sendToUser(String userId, String title, String body) {
        // Lấy danh sách token còn active của user
        List<String> tokens = deviceTokenRepository.findByUser_IdAndActiveTrue(userId)
                .stream()
                .map(dt -> dt.getToken())
                .toList();

        if (tokens.isEmpty()) {
            log.debug("No active FCM tokens for userId={}", userId);
            return;
        }

        log.info("Sending FCM push to userId={}, devices={}", userId, tokens.size());

        // Gửi đến từng token
        for (String token : tokens) {
            PushRequest request = PushRequest.builder()
                    .token(token)
                    .title(title)
                    .body(body)
                    .build();
            sendSinglePush(request);
        }
    }

    /**
     * Gửi Push Notification đến một token cụ thể (thường dùng để test hoặc gửi trực tiếp).
     *
     * @param request Thông tin push gồm token, title, body
     */
    @Async
    public void sendSinglePush(PushRequest request) {
        try {
            // Xây dựng FCM message
            Message fcmMessage = Message.builder()
                    .setToken(request.getToken())
                    .setNotification(
                            Notification.builder()
                                    .setTitle(request.getTitle())
                                    .setBody(request.getBody())
                                    .setImage(request.getImageUrl())
                                    .build()
                    )
                    .build();

            // Gửi qua FCM SDK
            String messageId = FirebaseMessaging.getInstance().send(fcmMessage);
            log.info("FCM push sent successfully. MessageId={}, token={}", messageId,
                    maskToken(request.getToken()));

        } catch (FirebaseMessagingException ex) {
            handleFcmError(ex, request.getToken());
        } catch (Exception ex) {
            log.error("Unexpected error sending FCM push to token={}: {}",
                    maskToken(request.getToken()), ex.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Xử lý lỗi FCM: deactivate token không hợp lệ
    // -------------------------------------------------------------------------
    private void handleFcmError(FirebaseMessagingException ex, String token) {
        String errorCode = ex.getMessagingErrorCode() != null
                ? ex.getMessagingErrorCode().name()
                : "UNKNOWN";

        log.warn("FCM error [{}] for token={}: {}", errorCode, maskToken(token), ex.getMessage());

        // Deactivate token khi FCM báo không còn đăng ký
        if ("UNREGISTERED".equals(errorCode) || "INVALID_ARGUMENT".equals(errorCode)) {
            log.info("Deactivating invalid FCM token: {}", maskToken(token));
            deviceTokenRepository.deactivateByToken(token);
        }
    }

    // Che giấu token để bảo mật trong log (chỉ hiện 8 ký tự đầu)
    private String maskToken(String token) {
        if (token == null || token.length() <= 8) return "***";
        return token.substring(0, 8) + "...";
    }
}
