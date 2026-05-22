package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class FollowUpSlotsResponse {
    private String doctorId;
    private LocalDate date;
    private List<FollowUpSlotResponse> slots;
}
