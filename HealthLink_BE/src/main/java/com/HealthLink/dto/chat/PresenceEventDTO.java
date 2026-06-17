package com.HealthLink.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PresenceEventDTO {
    private String userId;
    
    @JsonProperty("isOnline")
    private boolean isOnline;
}
