package com.HealthLink.service.notification;

import com.HealthLink.dto.notification.PushRequest;
import com.HealthLink.entity.enums.NotificationType;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class FirebaseNotificationService {

    private final DeviceTokenRepository deviceTokenRepository;

    @Async
    public void sendToUser(String userId, String title, String body) {
        sendToUser(userId, title, body, null, null, null, null);
    }

    @Async
    public void sendToUser(String userId, String title, String body,
                           NotificationType type, Integer relatedId,
                           String actionUrl, String metadata) {
        List<String> tokens = deviceTokenRepository.findByUser_IdAndActiveTrue(userId)
                .stream()
                .map(dt -> dt.getToken())
                .toList();

        if (tokens.isEmpty()) {
            log.debug("No active FCM tokens for userId={}", userId);
            return;
        }

        log.info("Sending FCM push to userId={}, devices={}", userId, tokens.size());

        for (String token : tokens) {
            PushRequest request = PushRequest.builder()
                    .token(token)
                    .title(title)
                    .body(body)
                    .type(type != null ? type.name() : null)
                    .relatedId(relatedId != null ? relatedId.toString() : null)
                    .actionUrl(actionUrl)
                    .data(metadata)
                    .build();
            sendSinglePush(request);
        }
    }

    @Async
    public void sendSinglePush(PushRequest request) {
        try {
            Message fcmMessage = Message.builder()
                    .setToken(request.getToken())
                    .setNotification(
                            Notification.builder()
                                    .setTitle(request.getTitle())
                                    .setBody(request.getBody())
                                    .setImage(request.getImageUrl())
                                    .build()
                    )
                    .putData("type", safeData(request.getType()))
                    .putData("relatedId", safeData(request.getRelatedId()))
                    .putData("actionUrl", safeData(request.getActionUrl()))
                    .putData("metadata", safeData(request.getData()))
                    .build();

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

    private void handleFcmError(FirebaseMessagingException ex, String token) {
        String errorCode = ex.getMessagingErrorCode() != null
                ? ex.getMessagingErrorCode().name()
                : "UNKNOWN";

        log.warn("FCM error [{}] for token={}: {}", errorCode, maskToken(token), ex.getMessage());

        if ("UNREGISTERED".equals(errorCode) || "INVALID_ARGUMENT".equals(errorCode)) {
            log.info("Deactivating invalid FCM token: {}", maskToken(token));
            deviceTokenRepository.deactivateByToken(token);
        }
    }

    private String maskToken(String token) {
        if (token == null || token.length() <= 8) return "***";
        return token.substring(0, 8) + "...";
    }

    private String safeData(String value) {
        return value != null ? value : "";
    }
}
