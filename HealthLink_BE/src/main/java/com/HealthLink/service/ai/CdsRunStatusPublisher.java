package com.HealthLink.service.ai;

public interface CdsRunStatusPublisher {
    void publish(String doctorUserId, CdsRunStatusEvent event);
}
