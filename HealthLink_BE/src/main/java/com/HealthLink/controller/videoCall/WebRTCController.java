package com.HealthLink.controller.videoCall;

import com.HealthLink.dto.videoCall.WebRTCSignal;
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
        String receiverId = signal.getReceiverId();
        if (receiverId != null) {
            if (receiverId.endsWith("-PAT")) receiverId = receiverId.substring(0, receiverId.length() - 4);
            else if (receiverId.endsWith("-DOC")) receiverId = receiverId.substring(0, receiverId.length() - 4);
            else if (receiverId.endsWith("-PHA")) receiverId = receiverId.substring(0, receiverId.length() - 4);
        }
        
        // Tìm user nhận trong database bằng UUID (vì frontend truyền UUID trong receiverId)
        Optional<User> receiverOpt = userRepository.findById(receiverId);
        
        if (receiverOpt.isPresent()) {
            User receiver = receiverOpt.get();
            // Gửi tin nhắn đến Email của người nhận (vì Spring Security dùng Email làm username)
            // Gửi tin nhắn đến ID của người nhận (vì WebSocketConfig dùng userId làm Principal name)
            messagingTemplate.convertAndSendToUser(
                    // receiver.getEmail(),
                    receiver.getId(),
                    "/queue/webrtc",
                    signal
            );
            // System.out.println("Relayed WebRTC Signal (" + signal.getType() + ") to " + receiver.getEmail());
            System.out.println("Relayed WebRTC Signal (" + signal.getType() + ") to " + receiver.getId());
        } else {
            System.err.println("Could not find receiver with ID: " + signal.getReceiverId());
        }
    }
}
