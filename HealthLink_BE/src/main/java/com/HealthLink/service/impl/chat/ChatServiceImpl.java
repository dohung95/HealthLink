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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final MessageRepository messageRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;

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
                    return toRoomDTO(saved);
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

        // Tạo entity User tạm (chỉ cần ID để JPA set foreign key)
        User sender   = User.builder().id(senderId).build();
        User receiver = User.builder().id(request.getReceiverId()).build();

        Message message = Message.builder()
                .chatRoom(room)
                .sender(sender)
                .receiver(receiver)
                .content(request.getContent())
                .imageUrl(request.getImageUrl())
                .read(false)
                .timestamp(LocalDateTime.now())
                .build();

        Message saved = messageRepository.save(message);

        // Cập nhật lastMessage / lastMessageAt trên phòng chat
        String preview = request.getContent() != null
                ? (request.getContent().length() > 100
                        ? request.getContent().substring(0, 100) + "…"
                        : request.getContent())
                : "[Ảnh]";
        room.setLastMessage(preview);
        room.setLastMessageAt(saved.getTimestamp());
        chatRoomRepository.save(room);

        return toMessageDTO(saved);
    }

    // -------------------------------------------------------------------------
    // Lịch sử tin nhắn
    // -------------------------------------------------------------------------
    @Override
    @Transactional(readOnly = true)
    public List<MessageDTO> getMessages(String chatRoomId) {
        // Đảm bảo phòng tồn tại
        if (!chatRoomRepository.existsById(chatRoomId)) {
            throw new ResourceNotFoundException("ChatRoom", "id", chatRoomId);
        }
        return messageRepository
                .findByChatRoom_ChatRoomIdOrderByTimestampAsc(chatRoomId)
                .stream()
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

    // =========================================================================
    // Mapper helpers
    // =========================================================================

    private ChatRoomDTO toRoomDTO(ChatRoom room) {
        return ChatRoomDTO.builder()
                .chatRoomId(room.getChatRoomId())
                .user1Id(room.getUser1Id())
                .user1DisplayName(room.getUser1DisplayName())
                .user1PhotoURL(room.getUser1PhotoURL())
                .user2Id(room.getUser2Id())
                .user2DisplayName(room.getUser2DisplayName())
                .user2PhotoURL(room.getUser2PhotoURL())
                .lastMessage(room.getLastMessage())
                .lastMessageAt(room.getLastMessageAt())
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
                .read(msg.isRead())
                .timestamp(msg.getTimestamp())
                .build();
    }

    // Lấy thông tin chi tiết (tên thật, avatar) từ bảng Profile thông qua Repositories
    private String[] extractUserInfo(User user) {
        String displayName = user.getUsername(); // default fallback
        String avatarUrl = null;

        if (user.getPatient() != null) {
            displayName = user.getPatient().getFullName();
            avatarUrl = user.getPatient().getAvatarUrl();
        } else if (user.getDoctor() != null) {
            displayName = user.getDoctor().getFullName();
            avatarUrl = user.getDoctor().getAvatarUrl();
        } else if (user.getPharmacy() != null) {
            displayName = user.getPharmacy().getName();
            avatarUrl = user.getPharmacy().getAvatarUrl();
        }

        return new String[]{displayName, avatarUrl};
    }
}
