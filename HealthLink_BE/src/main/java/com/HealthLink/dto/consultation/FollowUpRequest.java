package com.HealthLink.dto.consultation;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FollowUpRequest {

    private LocalDateTime followUpDate;

    private String followUpNotes;
}
