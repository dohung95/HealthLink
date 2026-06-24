package com.HealthLink.service.consultation;

import com.HealthLink.dto.response.ConfirmResponse;
import com.HealthLink.dto.response.ProposalResponse;

public interface ConsultationProposalService {
    ProposalResponse propose(Integer consultationId);
    ConfirmResponse confirm(Integer consultationId);
    void reject(Integer consultationId);
}
