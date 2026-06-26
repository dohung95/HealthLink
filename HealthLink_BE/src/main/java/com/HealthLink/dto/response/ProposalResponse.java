package com.HealthLink.dto.response;

import com.HealthLink.entity.enums.HomeVisitProposalStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProposalResponse {
    private String doctorId;
    private Integer consultationId;
    private Integer appointmentId;
    private HomeVisitProposalStatus status;
    private String message;
}
