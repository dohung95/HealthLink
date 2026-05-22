package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FollowUpCalendarResponse {
    private String doctorId;
    private String month;
    private List<FollowUpCalendarDayResponse> days;
}
