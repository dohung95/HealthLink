package com.HealthLink.service.impl.chat;

import com.HealthLink.dto.chat.PresenceEventDTO;
import com.HealthLink.service.chat.PresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Component
@RequiredArgsConstructor
@Slf4j
public class PresenceWebSocketListener {

    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = headerAccessor.getUser();
        
        if (user != null && user.getName() != null) {
            String userId = user.getName();
            log.info("User connected to WebSocket: {}", userId);
            
            // Ghi file log debug
            try {
                java.nio.file.Files.write(
                    java.nio.file.Paths.get("presence_debug.log"), 
                    ("CONNECTED: " + userId + "\n").getBytes(), 
                    java.nio.file.StandardOpenOption.CREATE, 
                    java.nio.file.StandardOpenOption.APPEND
                );
            } catch (Exception e) {}

            // Đánh dấu online trong bộ nhớ
            presenceService.userConnected(userId);
            
            // Broadcast trạng thái online cho mọi người đang subscribe /topic/presence
            PresenceEventDTO presenceEvent = new PresenceEventDTO(userId, true);
            messagingTemplate.convertAndSend("/topic/presence", presenceEvent);
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = headerAccessor.getUser();
        
        if (user != null && user.getName() != null) {
            String userId = user.getName();
            log.info("User disconnected from WebSocket: {}", userId);
            
            // Ghi file log debug
            try {
                java.nio.file.Files.write(
                    java.nio.file.Paths.get("presence_debug.log"), 
                    ("DISCONNECTED: " + userId + "\n").getBytes(), 
                    java.nio.file.StandardOpenOption.CREATE, 
                    java.nio.file.StandardOpenOption.APPEND
                );
            } catch (Exception e) {}

            // Đánh dấu offline trong bộ nhớ
            presenceService.userDisconnected(userId);
            
            // Broadcast trạng thái offline cho mọi người đang subscribe /topic/presence
            PresenceEventDTO presenceEvent = new PresenceEventDTO(userId, false);
            messagingTemplate.convertAndSend("/topic/presence", presenceEvent);
        }
    }
}
