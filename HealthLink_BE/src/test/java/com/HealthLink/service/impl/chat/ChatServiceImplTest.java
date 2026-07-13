package com.HealthLink.service.impl.chat;

import com.HealthLink.dto.chat.SendMessageRequest;
import com.HealthLink.entity.*;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.chat.ChatRoomRepository;
import com.HealthLink.repository.chat.MessageRepository;
import com.HealthLink.repository.pharmacy.PharmacyConsultationRequestRepository;
import com.HealthLink.service.chat.PresenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceImplTest {

    @Mock private ChatRoomRepository chatRoomRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private AppointmentRepository appointmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private PresenceService presenceService;
    @Mock private PharmacyConsultationRequestRepository pharmacyConsultationRequestRepository;

    private ChatServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ChatServiceImpl(
            chatRoomRepository,
            messageRepository,
            appointmentRepository,
            userRepository,
            messagingTemplate,
            presenceService,
            pharmacyConsultationRequestRepository
        );
    }

    @Test
    void sendMessage_whenPharmacyRequestHasOrder_throwsBusinessException() {
        // Arrange
        String roomId = "room-1";
        String senderId = "user-ph01";
        String receiverId = "user-pat01";

        ChatRoom chatRoom = ChatRoom.builder()
            .chatRoomId(roomId)
            .user1Id(senderId)
            .user2Id(receiverId)
            .build();

        PharmacyConsultationRequest request = PharmacyConsultationRequest.builder()
            .chatRoomId(roomId)
            .order(PharmacyOrder.builder().orderId(42).build())
            .build();

        when(chatRoomRepository.findById(roomId))
            .thenReturn(Optional.of(chatRoom));
        when(pharmacyConsultationRequestRepository.findByChatRoomId(roomId))
            .thenReturn(Optional.of(request));

        SendMessageRequest msgRequest = SendMessageRequest.builder()
            .chatRoomId(roomId)
            .receiverId(receiverId)
            .content("Hello")
            .build();

        // Act & Assert
        assertThatThrownBy(() -> service.sendMessage(msgRequest, senderId))
            .isInstanceOf(BusinessException.class)
            .hasMessage("This pharmacy request has ended. Chat is read-only.");

        verify(messageRepository, never()).save(any());
    }

    @Test
    void sendMessage_whenPharmacyRequestHasNoOrder_savesMessage() {
        // Arrange
        String roomId = "room-2";
        String senderId = "user-ph02";
        String receiverId = "user-pat02";

        ChatRoom chatRoom = ChatRoom.builder()
            .chatRoomId(roomId)
            .user1Id(senderId)
            .user2Id(receiverId)
            .build();

        PharmacyConsultationRequest request = PharmacyConsultationRequest.builder()
            .chatRoomId(roomId)
            .order(null)
            .build();

        User sender = User.builder().id(senderId).build();
        User receiver = User.builder().id(receiverId).username("Patient").build();

        when(chatRoomRepository.findById(roomId))
            .thenReturn(Optional.of(chatRoom));
        when(pharmacyConsultationRequestRepository.findByChatRoomId(roomId))
            .thenReturn(Optional.of(request));
        when(userRepository.findById(receiverId))
            .thenReturn(Optional.of(receiver));
        when(messageRepository.save(any()))
            .thenReturn(Message.builder().build());

        SendMessageRequest msgRequest = SendMessageRequest.builder()
            .chatRoomId(roomId)
            .receiverId(receiverId)
            .content("Hello")
            .build();

        // Act
        service.sendMessage(msgRequest, senderId);

        // Assert
        verify(messageRepository, times(1)).save(any());
    }

    @Test
    void sendMessage_whenNoPharmacyRequest_savesMessage() {
        // Arrange
        String roomId = "room-3";
        String senderId = "user-dr01";
        String receiverId = "user-pat03";

        ChatRoom chatRoom = ChatRoom.builder()
            .chatRoomId(roomId)
            .user1Id(senderId)
            .user2Id(receiverId)
            .build();

        User receiver = User.builder().id(receiverId).username("Patient").build();

        when(chatRoomRepository.findById(roomId))
            .thenReturn(Optional.of(chatRoom));
        when(pharmacyConsultationRequestRepository.findByChatRoomId(roomId))
            .thenReturn(Optional.empty()); // Not a pharmacy request room
        when(userRepository.findById(receiverId))
            .thenReturn(Optional.of(receiver));
        when(messageRepository.save(any()))
            .thenReturn(Message.builder().build());

        SendMessageRequest msgRequest = SendMessageRequest.builder()
            .chatRoomId(roomId)
            .receiverId(receiverId)
            .content("Hello")
            .build();

        // Act
        service.sendMessage(msgRequest, senderId);

        // Assert
        verify(messageRepository, times(1)).save(any());
    }
}
