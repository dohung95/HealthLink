package com.HealthLink.controller.chat;

import com.HealthLink.dto.chat.ChatRoomDTO;
import com.HealthLink.dto.chat.CreateRoomRequest;
import com.HealthLink.dto.chat.MessageDTO;
import com.HealthLink.dto.chat.SendMessageRequest;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.chat.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller cho chức năng chat (ChatRoom + ChatMessage).
 * Tất cả endpoint yêu cầu JWT token hợp lệ.
 *
 * Base URL: /api/chat
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService    chatService;
    private final UserRepository userRepository;

    // =========================================================================
    // Helper: lấy userId (UUID) từ email trong JWT
    // =========================================================================
    private String resolveUserId(UserDetails userDetails) {
        /* userDetails.getUsername() trả về email (subject của JWT) */
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException(
                        /* Không tìm thấy user tương ứng với email trong token */
                        "User", "email", userDetails.getUsername()))
                .getId();
    }

    // -------------------------------------------------------------------------
    // Phòng chat (ChatRoom)
    // -------------------------------------------------------------------------

    /**
     * POST /api/chat/rooms
     * Tạo mới hoặc lấy phòng chat giữa 2 người dùng.
     */
    @PostMapping("/rooms")
    public ResponseEntity<ChatRoomDTO> getOrCreateRoom(
            @Valid @RequestBody CreateRoomRequest request) {
        return ResponseEntity.ok(chatService.getOrCreateRoom(request));
    }

    /**
     * GET /api/chat/rooms/me
     * Lấy danh sách phòng chat của người dùng hiện tại (từ JWT).
     */
    @GetMapping("/rooms/me")
    public ResponseEntity<List<ChatRoomDTO>> getMyRooms(
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = resolveUserId(userDetails);
        return ResponseEntity.ok(chatService.getRoomsByUser(userId));
    }

    /**
     * GET /api/chat/rooms/{chatRoomId}
     * Lấy thông tin một phòng chat.
     */
    @GetMapping("/rooms/{chatRoomId}")
    public ResponseEntity<ChatRoomDTO> getRoomById(
            @PathVariable String chatRoomId) {
        return ResponseEntity.ok(chatService.getRoomById(chatRoomId));
    }

    // -------------------------------------------------------------------------
    // Tin nhắn (Message)
    // -------------------------------------------------------------------------

    /**
     * POST /api/chat/messages
     * Gửi tin nhắn mới. senderId lấy tự động từ JWT token.
     */
    @PostMapping("/messages")
    public ResponseEntity<MessageDTO> sendMessage(
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String senderId = resolveUserId(userDetails);
        return ResponseEntity.ok(chatService.sendMessage(request, senderId));
    }

    /**
     * GET /api/chat/rooms/{chatRoomId}/messages
     * Lấy toàn bộ lịch sử tin nhắn trong phòng.
     */
    @GetMapping("/rooms/{chatRoomId}/messages")
    public ResponseEntity<List<MessageDTO>> getMessages(
            @PathVariable String chatRoomId) {
        return ResponseEntity.ok(chatService.getMessages(chatRoomId));
    }

    /**
     * PATCH /api/chat/rooms/{chatRoomId}/read
     * Đánh dấu tất cả tin nhắn chưa đọc là đã đọc.
     * userId lấy tự động từ JWT token.
     */
    @PatchMapping("/rooms/{chatRoomId}/read")
    public ResponseEntity<Map<String, Integer>> markAsRead(
            @PathVariable String chatRoomId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = resolveUserId(userDetails);
        int updated = chatService.markMessagesAsRead(chatRoomId, userId);
        return ResponseEntity.ok(Map.of("updated", updated));
    }
}
