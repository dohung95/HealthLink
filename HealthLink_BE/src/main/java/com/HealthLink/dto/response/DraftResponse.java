package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DraftResponse {
    private Integer draftId;
    private LocalDateTime expiresAt;
    private String message;
}
