package com.HealthLink.service.impl.chat;

import com.HealthLink.dto.chat.ChatRoomDTO;
import com.HealthLink.dto.chat.CreateRoomRequest;
import com.HealthLink.dto.chat.MessageDTO;
import com.HealthLink.dto.chat.SendMessageRequest;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.ChatRoom;
import com.HealthLink.entity.Message;
import com.HealthLink.entity.User;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.chat.ChatRoomRepository;
import com.HealthLink.repository.chat.MessageRepository;
import com.HealthLink.service.chat.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Collections;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatRoomRepository    chatRoomRepository;
    private final MessageRepository     messageRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository        userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // -------------------------------------------------------------------------
    // Tạo hoặc lấy phòng chat
    // -------------------------------------------------------------------------
    @Override
    @Transactional
    public ChatRoomDTO getOrCreateRoom(CreateRoomRequest request) {
        // Kiểm tra phòng đã tồn tại chưa
        return chatRoomRepository
                .findByUsers(request.getUser1Id(), request.getUser2Id())
                .map(this::toRoomDTO)
                .orElseGet(() -> {
                    // Lấy thông tin 2 user để lưu tên hiển thị và avatar
                    User user1 = userRepository.findById(request.getUser1Id())
                            .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getUser1Id()));
                    User user2 = userRepository.findById(request.getUser2Id())
                            .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getUser2Id()));

                    String[] u1Info = extractUserInfo(user1);
                    String[] u2Info = extractUserInfo(user2);

                    // Tạo phòng mới
                    ChatRoom.ChatRoomBuilder builder = ChatRoom.builder()
                            .chatRoomId(UUID.randomUUID().toString())
                            .user1Id(request.getUser1Id())
                            .user1DisplayName(u1Info[0])
                            .user1PhotoURL(u1Info[1])
                            .user2Id(request.getUser2Id())
                            .user2DisplayName(u2Info[0])
                            .user2PhotoURL(u2Info[1]);

                    // Gắn appointment nếu có
                    if (request.getAppointmentId() != null) {
                        Appointment appointment = appointmentRepository
                                .findById(request.getAppointmentId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                        "Appointment", "id", request.getAppointmentId()));
                        builder.appointment(appointment);
                    }

                    ChatRoom saved = chatRoomRepository.save(builder.build());
                    ChatRoomDTO dto = toRoomDTO(saved);
                    
                    // Báo qua WebSocket để người nhận biết có phòng mới (dù chưa có tin nhắn)
                    MessageDTO roomCreatedMsg = MessageDTO.builder()
                            .messageId("ROOM_CREATED")
                            .chatRoomId(saved.getChatRoomId())
                            .build();

                    messagingTemplate.convertAndSendToUser(
                            // user1.getEmail(),
                            user1.getId(),
                            "/queue/chat",
                            roomCreatedMsg
                    );
                    messagingTemplate.convertAndSendToUser(
                            // user2.getEmail(),
                            user2.getId(),
                            "/queue/chat",
                            roomCreatedMsg
                    );

                    return dto;
                });
    }

    // -------------------------------------------------------------------------
    // Danh sách phòng chat của người dùng
    // -------------------------------------------------------------------------
    @Override
    @Transactional(readOnly = true)
    public List<ChatRoomDTO> getRoomsByUser(String userId) {
        return chatRoomRepository.findAllByUserId(userId)
                .stream()
                .map(room -> {
                    ChatRoomDTO dto = toRoomDTO(room);
                    dto.setUnreadCount(messageRepository.countUnread(room.getChatRoomId(), userId));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Lấy phòng chat theo ID
    // -------------------------------------------------------------------------
    @Override
    @Transactional(readOnly = true)
    public ChatRoomDTO getRoomById(String chatRoomId) {
        ChatRoom room = chatRoomRepository.findById(chatRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("ChatRoom", "id", chatRoomId));
        return toRoomDTO(room);
    }

    // -------------------------------------------------------------------------
    // Gửi tin nhắn
    // -------------------------------------------------------------------------
    @Override
    @Transactional
    public MessageDTO sendMessage(SendMessageRequest request, String senderId) {
        // Tìm phòng chat
        ChatRoom room = chatRoomRepository.findById(request.getChatRoomId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "ChatRoom", "id", request.getChatRoomId()));

        // Kiểm tra xem phòng có bị chặn không
        if (room.getBlockedBy() != null) {
            throw new IllegalStateException("You cannot send messages because this conversation is blocked.");
        }

        // Tạo entity User tạm cho sender (chỉ cần ID để JPA set foreign key)
        User sender = User.builder().id(senderId).build();

        // Lấy receiver thật từ DB để lấy email (vì WebSocket đăng ký session theo email)
        User receiver = userRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getReceiverId()));

        Message message = Message.builder()
                .chatRoom(room)
                .sender(sender)
                .receiver(receiver)
                .content(request.getContent())
                .imageUrl(request.getImageUrl())
                .videoUrl(request.getVideoUrl())
                .fileUrl(request.getFileUrl())
                .read(false)
                .timestamp(LocalDateTime.now())
                .build();

        Message saved = messageRepository.save(message);

        // Cập nhật lastMessage / lastMessageAt trên phòng chat
        String preview;
        if (request.getContent() != null && !request.getContent().isBlank()) {
            preview = request.getContent().length() > 100
                    ? request.getContent().substring(0, 100) + "…"
                    : request.getContent();
        } else if (request.getVideoUrl() != null && !request.getVideoUrl().isBlank()) {
            preview = "[Video]";
        } else if (request.getFileUrl() != null && !request.getFileUrl().isBlank()) {
            preview = "[File]";
        } else {
            preview = "[Image]";
        }
        
        room.setLastMessage(preview);
        room.setLastMessageAt(saved.getTimestamp());
        chatRoomRepository.save(room);

        MessageDTO dto = toMessageDTO(saved);

        // Đẩy tin nhắn realtime đến người nhận qua WebSocket
        // Spring STOMP đang nhận diện user bằng UUID thay vì email
        messagingTemplate.convertAndSendToUser(
                // receiver.getEmail(),
                receiver.getId(),
                "/queue/chat",
                dto
        );

        // Đẩy tin nhắn realtime đến CHÍNH người gửi (để đồng bộ các thiết bị/tab khác của người gửi)
        messagingTemplate.convertAndSendToUser(
                sender.getId(),
                "/queue/chat",
                dto
        );

        return dto;
    }

    // -------------------------------------------------------------------------
    // Lịch sử tin nhắn
    // -------------------------------------------------------------------------
    @Override
    @Transactional(readOnly = true)
    public List<MessageDTO> getMessages(String chatRoomId, int page, int size) {
        // Đảm bảo phòng tồn tại
        if (!chatRoomRepository.existsById(chatRoomId)) {
            throw new ResourceNotFoundException("ChatRoom", "id", chatRoomId);
        }
        Pageable pageable = PageRequest.of(page, size);
        List<Message> messages = messageRepository
                .findByChatRoom_ChatRoomIdOrderByTimestampDesc(chatRoomId, pageable);
        
        // Đảo ngược danh sách để trả về thứ tự thời gian tăng dần cho client hiển thị
        Collections.reverse(messages);

        return messages.stream()
                .map(this::toMessageDTO)
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Đánh dấu đã đọc
    // -------------------------------------------------------------------------
    @Override
    @Transactional
    public int markMessagesAsRead(String chatRoomId, String userId) {
        return messageRepository.markAllAsRead(chatRoomId, userId);
    }

    // -------------------------------------------------------------------------
    // Bật/Tắt chặn (Block/Unblock)
    // -------------------------------------------------------------------------
    @Override
    @Transactional
    public void toggleBlock(String chatRoomId, String userId) {
        ChatRoom room = chatRoomRepository.findById(chatRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("ChatRoom", "id", chatRoomId));

        if (room.getBlockedBy() == null) {
            // Chưa ai chặn -> Mình chặn
            room.setBlockedBy(userId);
        } else if (room.getBlockedBy().equals(userId)) {
            // Mình đã chặn -> Bỏ chặn
            room.setBlockedBy(null);
        } else {
            // Người kia đã chặn -> Báo lỗi
            throw new IllegalStateException("Cannot unblock a conversation that was blocked by another user.");
        }
        chatRoomRepository.save(room);

        // Báo cho cả 2 bên cập nhật trạng thái phòng bằng một tin nhắn hệ thống ngầm
        String partnerId = room.getUser1Id().equals(userId) ? room.getUser2Id() : room.getUser1Id();
        MessageDTO systemMsg = MessageDTO.builder()
                .messageId("sys_" + java.util.UUID.randomUUID().toString())
                .chatRoomId(chatRoomId)
                .content("[SYSTEM_BLOCK_UPDATE]")
                .senderId("SYSTEM")
                .receiverId(partnerId)
                .timestamp(java.time.LocalDateTime.now())
                .build();
        messagingTemplate.convertAndSendToUser(partnerId, "/queue/chat", systemMsg);
        messagingTemplate.convertAndSendToUser(userId, "/queue/chat", systemMsg);
    }

    // =========================================================================
    // Mapper helpers
    // =========================================================================

    private ChatRoomDTO toRoomDTO(ChatRoom room) {
        // Lấy ảnh + tên cached trong bảng ChatRooms
        String user1Name  = room.getUser1DisplayName();
        String user1Photo = room.getUser1PhotoURL();
        String user2Name  = room.getUser2DisplayName();
        String user2Photo = room.getUser2PhotoURL();
        String user1Specialty = null;
        String user2Specialty = null;

        // Luôn luôn lấy thông tin live (tên, avatar) từ bảng User/Profile
        // để tránh trường hợp user thay đổi avatar nhưng chat room vẫn giữ avatar cũ.
        try {
            java.util.Optional<com.HealthLink.entity.User> u1 =
                    userRepository.findById(room.getUser1Id());
            if (u1.isPresent()) {
                String[] info = extractUserInfo(u1.get());
                user1Name = info[0];
                user1Photo = info[1];
                user1Specialty = info[2];
            }
        } catch (Exception ignored) {}

        try {
            java.util.Optional<com.HealthLink.entity.User> u2 =
                    userRepository.findById(room.getUser2Id());
            if (u2.isPresent()) {
                String[] info = extractUserInfo(u2.get());
                user2Name = info[0];
                user2Photo = info[1];
                user2Specialty = info[2];
            }
        } catch (Exception ignored) {}

        return ChatRoomDTO.builder()
                .chatRoomId(room.getChatRoomId())
                .user1Id(room.getUser1Id())
                .user1DisplayName(user1Name)
                .user1PhotoURL(user1Photo)
                .user1Specialty(user1Specialty)
                .user2Id(room.getUser2Id())
                .user2DisplayName(user2Name)
                .user2PhotoURL(user2Photo)
                .user2Specialty(user2Specialty)
                .lastMessage(room.getLastMessage())
                .lastMessageAt(room.getLastMessageAt())
                .blockedBy(room.getBlockedBy())
                .appointmentId(room.getAppointment() != null
                        ? room.getAppointment().getAppointmentId() : null)
                .build();
    }

    private MessageDTO toMessageDTO(Message msg) {
        String senderDisplayName = null;
        String senderPhotoURL    = null;
        // Lấy displayName và photo từ ChatRoom để tránh N+1 query vào User
        if (msg.getChatRoom() != null) {
            ChatRoom room = msg.getChatRoom();
            String senderId = msg.getSender() != null ? msg.getSender().getId() : null;
            if (senderId != null && senderId.equals(room.getUser1Id())) {
                senderDisplayName = room.getUser1DisplayName();
                senderPhotoURL    = room.getUser1PhotoURL();
            } else {
                senderDisplayName = room.getUser2DisplayName();
                senderPhotoURL    = room.getUser2PhotoURL();
            }
        }

        return MessageDTO.builder()
                .messageId(msg.getMessageId() != null ? msg.getMessageId().toString() : null)
                .chatRoomId(msg.getChatRoom() != null ? msg.getChatRoom().getChatRoomId() : null)
                .senderId(msg.getSender()   != null ? msg.getSender().getId()   : null)
                .senderDisplayName(senderDisplayName)
                .senderPhotoURL(senderPhotoURL)
                .receiverId(msg.getReceiver() != null ? msg.getReceiver().getId() : null)
                .content(msg.getContent())
                .imageUrl(msg.getImageUrl())
                .videoUrl(msg.getVideoUrl())
                .fileUrl(msg.getFileUrl())
                .read(msg.isRead())
                .timestamp(msg.getTimestamp())
                .build();
    }

    // Lấy thông tin chi tiết (tên thật, avatar) từ bảng Profile thông qua Repositories
    private String[] extractUserInfo(User user) {
        String displayName = user.getUsername(); // default fallback
        String avatarUrl = null;
        String specialty = null;

        if (user.getPatient() != null) {
            displayName = user.getPatient().getFullName();
            avatarUrl = user.getPatient().getAvatarUrl();
            specialty = "Patient";
        } else if (user.getDoctor() != null) {
            displayName = user.getDoctor().getFullName();
            avatarUrl = user.getDoctor().getAvatarUrl();
            specialty = user.getDoctor().getSpecialty();
        } else if (user.getPharmacy() != null) {
            displayName = user.getPharmacy().getName();
            avatarUrl = user.getPharmacy().getAvatarUrl();
            specialty = "Pharmacy";
        }

        return new String[]{displayName, avatarUrl, specialty};
    }
}
