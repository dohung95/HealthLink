package com.HealthLink.dto.consultation;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FollowUpRequest {

    @NotNull(message = "Follow-up date is required")
    private LocalDateTime followUpDate;

    private String followUpNotes;
}
