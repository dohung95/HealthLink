package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SessionStatusResponse {
    private Integer scheduleId;
    private boolean available;
    private String message;
}
