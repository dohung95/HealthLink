package com.HealthLink.service.impl.ai;

import com.HealthLink.service.ai.CdsRunStatusEvent;
import com.HealthLink.service.ai.CdsRunStatusPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketCdsRunStatusPublisher implements CdsRunStatusPublisher {
    private static final String DESTINATION = "/queue/ai-cds";
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void publish(String doctorUserId, CdsRunStatusEvent event) {
        try {
            messagingTemplate.convertAndSendToUser(doctorUserId, DESTINATION, event);
        } catch (RuntimeException exception) {
            log.warn("CDS status delivery failed for runId={}", event.runId());
        }
    }
}
