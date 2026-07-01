package com.HealthLink.service.chat;

import com.HealthLink.dto.chat.ChatRoomDTO;
import com.HealthLink.dto.chat.CreateRoomRequest;
import com.HealthLink.dto.chat.MessageDTO;
import com.HealthLink.dto.chat.SendMessageRequest;

import java.util.List;

public interface ChatService {

    /**
     * Tạo mới hoặc lấy phòng chat hiện có giữa 2 người dùng.
     */
    ChatRoomDTO getOrCreateRoom(CreateRoomRequest request);

    /**
     * Lấy danh sách tất cả phòng chat của một người dùng,
     * sắp xếp theo tin nhắn mới nhất.
     */
    List<ChatRoomDTO> getRoomsByUser(String userId);

    /**
     * Lấy thông tin một phòng chat theo ID.
     */
    ChatRoomDTO getRoomById(String chatRoomId, String userId);

    /**
     * Gửi tin nhắn vào một phòng chat.
     *
     * @param request  nội dung tin nhắn (không có senderId)
     * @param senderId ID của người gửi — lấy từ JWT token ở tầng Controller
     */
    MessageDTO sendMessage(SendMessageRequest request, String senderId);

    /**
     * Lấy lịch sử tin nhắn phân trang trong một phòng chat.
     */
    List<MessageDTO> getMessages(String chatRoomId, int page, int size);

    /**
     * Đánh dấu tất cả tin nhắn chưa đọc trong phòng là đã đọc.
     *
     * @param userId ID của người nhận — lấy từ JWT token ở tầng Controller
     */
    int markMessagesAsRead(String chatRoomId, String userId);

    /**
     * Bật/Tắt chặn cuộc trò chuyện.
     */
    void toggleBlock(String chatRoomId, String userId);

    /**
     * Tìm kiếm tin nhắn.
     */
    List<MessageDTO> searchMessages(String chatRoomId, String query);

    /**
     * Lấy tất cả tin nhắn có chứa media (ảnh, video, audio, file).
     */
    List<MessageDTO> getMediaMessages(String chatRoomId);
}

