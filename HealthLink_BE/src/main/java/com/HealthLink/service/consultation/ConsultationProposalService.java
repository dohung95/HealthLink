package com.HealthLink.service.consultation;

import com.HealthLink.dto.response.ConfirmResponse;
import com.HealthLink.dto.response.ProposalResponse;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Optional;

public interface ConsultationProposalService {
    ProposalResponse propose(Integer consultationId, UserDetails userDetails);
    ConfirmResponse confirm(Integer consultationId, UserDetails userDetails);
    void reject(Integer consultationId, UserDetails userDetails);
    Optional<ProposalResponse> getPendingProposal(UserDetails userDetails);
}
