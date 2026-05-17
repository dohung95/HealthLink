package com.HealthLink.dto.prescription;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PrescriptionOpenedResponse {
    private String message;
    private Integer prescriptionHeaderId;
    private LocalDateTime openedAt;
}
