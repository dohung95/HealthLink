package com.HealthLink.controller.chat;

import com.HealthLink.dto.chat.WebRTCSignal;
import com.HealthLink.entity.User;
import com.HealthLink.repository.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import java.util.Optional;

@Controller
@RequiredArgsConstructor
public class WebRTCController {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    // Client gửi đến /app/webrtc.signal
    @MessageMapping("/webrtc.signal")
    public void handleSignal(@Payload WebRTCSignal signal) {
        // Tìm user nhận trong database bằng UUID (vì frontend truyền UUID trong receiverId)
        Optional<User> receiverOpt = userRepository.findById(signal.getReceiverId());
        
        if (receiverOpt.isPresent()) {
            User receiver = receiverOpt.get();
            // Gửi tin nhắn đến Email của người nhận (vì Spring Security dùng Email làm username)
            messagingTemplate.convertAndSendToUser(
                    receiver.getEmail(),
                    "/queue/webrtc",
                    signal
            );
            System.out.println("Relayed WebRTC Signal (" + signal.getType() + ") to " + receiver.getEmail());
        } else {
            System.err.println("Could not find receiver with ID: " + signal.getReceiverId());
        }
    }
}
