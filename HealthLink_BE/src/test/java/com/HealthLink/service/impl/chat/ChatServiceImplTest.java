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

import java.util.ArrayList;
import java.util.List;
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
        when(pharmacyConsultationRequestRepository.findAllByChatRoomId(roomId))
            .thenReturn(List.of());
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
        when(pharmacyConsultationRequestRepository.findAllByChatRoomId(roomId))
            .thenReturn(List.of(request));
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
        when(pharmacyConsultationRequestRepository.findAllByChatRoomId(roomId))
            .thenReturn(List.of(request));
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
        when(pharmacyConsultationRequestRepository.findAllByChatRoomId(roomId))
            .thenReturn(List.of(request));

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
        when(pharmacyConsultationRequestRepository.findAllByChatRoomId(roomId))
            .thenReturn(List.of(request));

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
        when(pharmacyConsultationRequestRepository.findAllByChatRoomId(roomId))
            .thenReturn(List.of(request));

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
    void sendMessage_when14LockedAnd1EditableRequest_savesMessage() {
        String roomId = "room-multi";
        String senderId = "user-ph07";
        String receiverId = "user-pat07";

        ChatRoom chatRoom = ChatRoom.builder()
            .chatRoomId(roomId)
            .user1Id(senderId)
            .user2Id(receiverId)
            .build();

        User receiver = User.builder().id(receiverId).username("Patient").build();

        List<PharmacyConsultationRequest> lockedRequests = new ArrayList<>();
        for (int i = 0; i < 14; i++) {
            lockedRequests.add(PharmacyConsultationRequest.builder()
                .chatRoomId(roomId)
                .order(PharmacyOrder.builder().orderId(100 + i).status("PENDING").build())
                .build());
        }

        PharmacyConsultationRequest editableRequest = PharmacyConsultationRequest.builder()
            .chatRoomId(roomId)
            .status("IN_REVIEW")
            .build();

        List<PharmacyConsultationRequest> allRequests = new ArrayList<>(lockedRequests);
        allRequests.add(editableRequest);

        when(chatRoomRepository.findById(roomId))
            .thenReturn(Optional.of(chatRoom));
        when(pharmacyConsultationRequestRepository.findAllByChatRoomId(roomId))
            .thenReturn(allRequests);
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

    private String sharedRoomId = "room-shared";
    private String sharedSenderId = "user-dr-shared";
    private String sharedReceiverId = "user-pat-shared";

    private PharmacyConsultationRequest requestWithOrder(String orderStatus) {
        return PharmacyConsultationRequest.builder()
                .chatRoomId(sharedRoomId)
                .order(PharmacyOrder.builder().status(orderStatus).build())
                .build();
    }

    private PharmacyConsultationRequest consultationRequest(String status, String chatRoomId, PharmacyOrder order) {
        return PharmacyConsultationRequest.builder()
                .requestType("CONSULTATION")
                .status(status)
                .chatRoomId(chatRoomId)
                .order(order)
                .build();
    }

    private SendMessageRequest sendRequest() {
        return SendMessageRequest.builder()
                .chatRoomId(sharedRoomId)
                .receiverId(sharedReceiverId)
                .content("Hello")
                .build();
    }

    @Test
    void sendMessage_whenSharedRoomHasEditableConsultation_savesMessage() {
        ChatRoom chatRoom = ChatRoom.builder()
                .chatRoomId(sharedRoomId)
                .user1Id(sharedSenderId)
                .user2Id(sharedReceiverId)
                .build();

        PharmacyConsultationRequest completed = requestWithOrder("COMPLETED");
        PharmacyConsultationRequest active = consultationRequest("IN_REVIEW", sharedRoomId, null);
        User receiver = User.builder().id(sharedReceiverId).username("Patient").build();

        when(chatRoomRepository.findById(sharedRoomId)).thenReturn(Optional.of(chatRoom));
        when(pharmacyConsultationRequestRepository.findAllByChatRoomId(sharedRoomId))
                .thenReturn(List.of(completed, active));
        when(userRepository.findById(sharedReceiverId)).thenReturn(Optional.of(receiver));
        when(messageRepository.save(any())).thenReturn(Message.builder().build());

        service.sendMessage(sendRequest(), sharedSenderId);

        verify(messageRepository, times(1)).save(any());
        verify(messagingTemplate, times(2)).convertAndSendToUser(anyString(), anyString(), any());
    }

    @Test
    void sendMessage_whenSharedRoomHasRevisionRequest_savesMessage() {
        ChatRoom chatRoom = ChatRoom.builder()
                .chatRoomId(sharedRoomId)
                .user1Id(sharedSenderId)
                .user2Id(sharedReceiverId)
                .build();

        PharmacyConsultationRequest completed = requestWithOrder("COMPLETED");
        PharmacyConsultationRequest revision = requestWithOrder("REVISION_REQUESTED");
        User receiver = User.builder().id(sharedReceiverId).username("Patient").build();

        when(chatRoomRepository.findById(sharedRoomId)).thenReturn(Optional.of(chatRoom));
        when(pharmacyConsultationRequestRepository.findAllByChatRoomId(sharedRoomId))
                .thenReturn(List.of(completed, revision));
        when(userRepository.findById(sharedReceiverId)).thenReturn(Optional.of(receiver));
        when(messageRepository.save(any())).thenReturn(Message.builder().build());

        service.sendMessage(sendRequest(), sharedSenderId);

        verify(messageRepository, times(1)).save(any());
        verify(messagingTemplate, times(2)).convertAndSendToUser(anyString(), anyString(), any());
    }

    @Test
    void sendMessage_whenEmptySharedRoomList_savesMessage() {
        ChatRoom chatRoom = ChatRoom.builder()
                .chatRoomId(sharedRoomId)
                .user1Id(sharedSenderId)
                .user2Id(sharedReceiverId)
                .build();

        User receiver = User.builder().id(sharedReceiverId).username("Patient").build();

        when(chatRoomRepository.findById(sharedRoomId)).thenReturn(Optional.of(chatRoom));
        when(pharmacyConsultationRequestRepository.findAllByChatRoomId(sharedRoomId))
                .thenReturn(List.of());
        when(userRepository.findById(sharedReceiverId)).thenReturn(Optional.of(receiver));
        when(messageRepository.save(any())).thenReturn(Message.builder().build());

        service.sendMessage(sendRequest(), sharedSenderId);

        verify(messageRepository, times(1)).save(any());
        verify(messagingTemplate, times(2)).convertAndSendToUser(anyString(), anyString(), any());
    }

    @Test
    void sendMessage_whenAllLinkedRequestsLocked_throwsBusinessException() {
        ChatRoom chatRoom = ChatRoom.builder()
                .chatRoomId(sharedRoomId)
                .user1Id(sharedSenderId)
                .user2Id(sharedReceiverId)
                .build();

        when(chatRoomRepository.findById(sharedRoomId)).thenReturn(Optional.of(chatRoom));
        when(pharmacyConsultationRequestRepository.findAllByChatRoomId(sharedRoomId))
                .thenReturn(List.of(requestWithOrder("PENDING"), requestWithOrder("COMPLETED")));

        assertThatThrownBy(() -> service.sendMessage(sendRequest(), sharedSenderId))
                .isInstanceOf(BusinessException.class)
                .hasMessage("This pharmacy conversation is now read-only.");

        verify(messageRepository, never()).save(any());
        verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), any());
    }
}
