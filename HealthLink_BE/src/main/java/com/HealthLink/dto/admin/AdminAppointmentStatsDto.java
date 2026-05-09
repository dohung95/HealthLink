package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAppointmentStatsDto {
    private long todayAppointments;
    private long pendingApproval;
    private long completed;
    private long cancelled;
}
