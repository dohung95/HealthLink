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
    void sendMessage_whenNoPharmacyRequest_savesMessage() {
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
            .thenReturn(Optional.empty());
        when(userRepository.findById(receiverId))
            .thenReturn(Optional.of(receiver));
        when(messageRepository.save(any()))
            .thenReturn(Message.builder().build());

        SendMessageRequest msgRequest = SendMessageRequest.builder()
            .chatRoomId(roomId)
            .receiverId(receiverId)
            .content("Hello")
            .build();

        service.sendMessage(msgRequest, senderId);

        verify(messageRepository, times(1)).save(any());
        verify(messagingTemplate, times(2)).convertAndSendToUser(anyString(), anyString(), any());
    }

    @Test
    void sendMessage_whenInReviewNoOrder_savesMessage() {
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
            .status("IN_REVIEW")
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

        service.sendMessage(msgRequest, senderId);

        verify(messageRepository, times(1)).save(any());
        verify(messagingTemplate, times(2)).convertAndSendToUser(anyString(), anyString(), any());
    }

    @Test
    void sendMessage_whenRevisionRequestedOrder_savesMessage() {
        String roomId = "room-revision";
        String senderId = "user-ph03";
        String receiverId = "user-pat03";

        ChatRoom chatRoom = ChatRoom.builder()
            .chatRoomId(roomId)
            .user1Id(senderId)
            .user2Id(receiverId)
            .build();

        PharmacyConsultationRequest request = PharmacyConsultationRequest.builder()
            .chatRoomId(roomId)
            .order(PharmacyOrder.builder().orderId(42).status("REVISION_REQUESTED").build())
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

        service.sendMessage(msgRequest, senderId);

        verify(messageRepository, times(1)).save(any());
        verify(messagingTemplate, times(2)).convertAndSendToUser(anyString(), anyString(), any());
    }

    @Test
    void sendMessage_whenPendingOrder_throwsBusinessException() {
        String roomId = "room-pending";
        String senderId = "user-ph04";
        String receiverId = "user-pat04";

        ChatRoom chatRoom = ChatRoom.builder()
            .chatRoomId(roomId)
            .user1Id(senderId)
            .user2Id(receiverId)
            .build();

        PharmacyConsultationRequest request = PharmacyConsultationRequest.builder()
            .chatRoomId(roomId)
            .order(PharmacyOrder.builder().orderId(43).status("PENDING").build())
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

        assertThatThrownBy(() -> service.sendMessage(msgRequest, senderId))
            .isInstanceOf(BusinessException.class)
            .hasMessage("This pharmacy conversation is now read-only.");

        verify(messageRepository, never()).save(any());
        verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), any());
    }

    @Test
    void sendMessage_whenCompletedOrder_throwsBusinessException() {
        String roomId = "room-completed";
        String senderId = "user-ph05";
        String receiverId = "user-pat05";

        ChatRoom chatRoom = ChatRoom.builder()
            .chatRoomId(roomId)
            .user1Id(senderId)
            .user2Id(receiverId)
            .build();

        PharmacyConsultationRequest request = PharmacyConsultationRequest.builder()
            .chatRoomId(roomId)
            .order(PharmacyOrder.builder().orderId(44).status("COMPLETED").build())
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

        assertThatThrownBy(() -> service.sendMessage(msgRequest, senderId))
            .isInstanceOf(BusinessException.class)
            .hasMessage("This pharmacy conversation is now read-only.");

        verify(messageRepository, never()).save(any());
        verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), any());
    }

    @Test
    void sendMessage_whenOrderRequestRoom_throwsBusinessException() {
        String roomId = "room-order-req";
        String senderId = "user-ph06";
        String receiverId = "user-pat06";

        ChatRoom chatRoom = ChatRoom.builder()
            .chatRoomId(roomId)
            .user1Id(senderId)
            .user2Id(receiverId)
            .build();

        PharmacyConsultationRequest request = PharmacyConsultationRequest.builder()
            .chatRoomId(roomId)
            .requestType("ORDER")
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

        assertThatThrownBy(() -> service.sendMessage(msgRequest, senderId))
            .isInstanceOf(BusinessException.class)
            .hasMessage("This pharmacy conversation is now read-only.");

        verify(messageRepository, never()).save(any());
        verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), any());
    }
}
