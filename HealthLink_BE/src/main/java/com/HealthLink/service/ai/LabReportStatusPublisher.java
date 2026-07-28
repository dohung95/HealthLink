package com.HealthLink.service.ai;

public interface LabReportStatusPublisher {
    void publish(String doctorId, LabReportStatusEvent event);
}
