package com.HealthLink.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Cấu hình WebSocket + STOMP cho hệ thống thông báo realtime.
 *
 * Luồng hoạt động:
 *  - Client kết nối vào endpoint /ws (SockJS fallback)
 *  - Subscribe vào /user/queue/notifications để nhận thông báo cá nhân
 *  - Subscribe vào /topic/... để nhận thông báo broadcast (nếu cần)
 *  - Server dùng SimpMessagingTemplate để push thông báo cho từng user
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Cấu hình message broker:
     * - /topic: broadcast (một-nhiều)
     * - /queue: point-to-point (một user cụ thể)
     * - /app: prefix để gửi message từ client đến @MessageMapping
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Bật simple in-memory broker cho /topic và /queue
        registry.enableSimpleBroker("/topic", "/queue");
        // Prefix cho @MessageMapping trên controller
        registry.setApplicationDestinationPrefixes("/app");
        // Prefix để gửi đến một user cụ thể (/user/{userId}/queue/...)
        registry.setUserDestinationPrefix("/user");
    }

    /**
     * Đăng ký WebSocket endpoint.
     * /ws: endpoint chính để client kết nối (SockJS cho fallback HTTP)
     * Cho phép mọi nguồn gốc (CORS) - cần restrict lại trong production
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")   // TODO: giới hạn domain trong production
                .withSockJS();                    // SockJS fallback cho browser không hỗ trợ WS thuần
    }
}
