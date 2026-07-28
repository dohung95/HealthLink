package com.HealthLink.service.ai;

import java.util.UUID;

/** Payload deliberately restricted to routing identifiers and a workflow status. */
public record LabReportStatusEvent(UUID reportId, Integer appointmentId, String status) {
}
