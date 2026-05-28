package com.HealthLink.config;

import com.HealthLink.entity.User;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
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
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@RequiredArgsConstructor // Tự động tạo Constructor để Inject các biến final bên dưới
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    // Khai báo các Bean cần thiết (Sẽ được @RequiredArgsConstructor tự động Inject)
    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;

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

    /**
     * Cấu hình Interceptor để bắt token từ STOMP CONNECT frame.
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = 
                    MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                // Khi client gửi frame CONNECT
                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        String token = authHeader.substring(7);

                        if (jwtTokenProvider.validateToken(token)) {
                            String email = jwtTokenProvider.getEmailFromToken(token);
                            UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                            // Look up User entity and use its internal id as the Principal name
                            // so that convertAndSendToUser(userId, ...) resolves correctly.
                            User user = userRepository.findByEmail(email).orElse(null);
                            String principalName = user != null ? user.getId() : userDetails.getUsername();

                            UsernamePasswordAuthenticationToken auth =
                                    new UsernamePasswordAuthenticationToken(
                                            principalName, null, userDetails.getAuthorities());

                            // QUAN TRỌNG: Gán user vào accessor để Spring nhận diện được session này của ai
                            accessor.setUser(auth);
                        }
                    }
                }
                return message;
            }
        });
    }
}
