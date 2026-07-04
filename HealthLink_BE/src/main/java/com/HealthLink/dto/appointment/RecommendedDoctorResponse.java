package com.HealthLink.dto.appointment;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class RecommendedDoctorResponse {
    private String doctorId;
    private String doctorName;
    private String specialty;
    private String avatarUrl;
    private BigDecimal consultationFee;
    private BigDecimal manualSelectionFee;
    private String selectionMode;
    private String reason;
}