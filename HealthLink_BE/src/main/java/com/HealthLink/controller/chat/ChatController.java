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
            @Valid @RequestBody CreateRoomRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        // user1Id luôn lấy từ JWT (tránh FE gửi email thay vì UUID)
        request.setUser1Id(resolveUserId(userDetails));
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

    /**
     * POST /api/chat/rooms/{chatRoomId}/block
     * Bật/Tắt chặn phòng chat.
     */
    @PostMapping("/rooms/{chatRoomId}/block")
    public ResponseEntity<Void> toggleBlock(
            @PathVariable String chatRoomId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = resolveUserId(userDetails);
        chatService.toggleBlock(chatRoomId, userId);
        return ResponseEntity.ok().build();
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
     * Lấy lịch sử tin nhắn trong phòng với phân trang.
     */
    @GetMapping("/rooms/{chatRoomId}/messages")
    public ResponseEntity<List<MessageDTO>> getMessages(
            @PathVariable String chatRoomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(chatService.getMessages(chatRoomId, page, size));
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

    /**
     * POST /api/chat/upload
     * Upload ảnh, video, hoặc file đính kèm trong chat.
     * Lưu vào: uploads/chat/{type}/{chatRoomId}/
     */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadMedia(
            @RequestParam("chatRoomId") String chatRoomId,
            @RequestParam("type") String type, // "image", "video", "file"
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }
        try {
            // Xác định thư mục lưu trữ
            String uploadDir = "uploads/chat/" + type + "/" + chatRoomId + "/";
            java.nio.file.Path uploadPath = java.nio.file.Paths.get(uploadDir);
            if (!java.nio.file.Files.exists(uploadPath)) {
                java.nio.file.Files.createDirectories(uploadPath);
            }

            // Tạo tên file an toàn: thêm timestamp và loại bỏ ký tự không an toàn
            String original = file.getOriginalFilename();
            if (original == null || original.isBlank()) {
                original = "file";
            }
            String originalFileName = org.springframework.util.StringUtils.cleanPath(original);
            // Loại bỏ ký tự không phải ASCII (ký tự tiếng Việt, etc.) để URL luôn hợp lệ
            String safeFileName = originalFileName
                .replaceAll("[^a-zA-Z0-9._-]", "_")  // chỉ giữ lại ký tự an toàn
                .replaceAll("_+", "_");                // gộp nhiều _ thành 1
            String fileName = System.currentTimeMillis() + "_" + safeFileName;
            
            java.nio.file.Path filePath = uploadPath.resolve(fileName);
            java.nio.file.Files.copy(file.getInputStream(), filePath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            // Trả về đường dẫn công khai (vd: /uploads/chat/video/123/160..._vid.mp4)
            // Cần đầy đủ đường dẫn tới server hoặc frontend sẽ xử lý thêm domain
            String fileUrl = "/uploads/chat/" + type + "/" + chatRoomId + "/" + fileName;
            
            return ResponseEntity.ok(Map.of("url", fileUrl));
            
        } catch (java.io.IOException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Could not store file"));
        }
    }
}
