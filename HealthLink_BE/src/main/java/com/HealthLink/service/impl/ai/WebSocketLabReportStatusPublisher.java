package com.HealthLink.service.impl.ai;

import com.HealthLink.service.ai.LabReportStatusEvent;
import com.HealthLink.service.ai.LabReportStatusPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketLabReportStatusPublisher implements LabReportStatusPublisher {
    private static final String DESTINATION = "/queue/ai-cds";
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void publish(String doctorId, LabReportStatusEvent event) {
        try {
            messagingTemplate.convertAndSendToUser(doctorId, DESTINATION, event);
        } catch (RuntimeException exception) {
            // Realtime delivery is advisory: it must never roll back a completed private upload.
            log.warn("AI CDS status delivery failed for reportId={}", event.reportId());
        }
    }
}
