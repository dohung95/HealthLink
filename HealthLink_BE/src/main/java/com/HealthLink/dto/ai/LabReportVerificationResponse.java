package com.HealthLink.dto.ai;

import java.util.List;
import java.util.UUID;

public record LabReportVerificationResponse(UUID reportId, Integer appointmentId, String status, long version,
                                            String sourceFileUrl, List<LabWarningResponse> warnings,
                                            List<LabObservationVerificationResponse> observations) { }
