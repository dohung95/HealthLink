package com.HealthLink.controller.videoCall;

import com.HealthLink.dto.videoCall.WebRTCSignal;
import com.HealthLink.entity.User;
import com.HealthLink.repository.auth.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebRTCControllerTest {
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private UserRepository userRepository;
    @InjectMocks private WebRTCController controller;

    @Test
    void relaysPharmacyCallerRoleWithoutChangingSignal() {
        WebRTCSignal signal = new WebRTCSignal();
        signal.setType("CALL_REQUEST");
        signal.setSenderId("pharmacy-user");
        signal.setSenderName("Central Pharmacy");
        signal.setSenderRole("PHARMACY");
        signal.setReceiverId("patient-user");
        when(userRepository.findById("patient-user"))
                .thenReturn(Optional.of(User.builder().id("patient-user").build()));

        controller.handleSignal(signal);

        verify(messagingTemplate).convertAndSendToUser(
                eq("patient-user"), eq("/queue/webrtc"), eq(signal));
    }
}
