package com.HealthLink.service.impl.followup;

import com.HealthLink.entity.Consultation;
import com.HealthLink.repository.consultation.ConsultationRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class LegacyFollowUpProposalBackfill {
    private final ConsultationRepository consultationRepository;
    private final FollowUpAppointmentServiceImpl followUpAppointmentService;
    private final TransactionTemplate transactionTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void materializeFutureFollowUpProposals() {
        List<Consultation> candidates = consultationRepository.findFutureFollowUpsWithoutAppointment(LocalDateTime.now());
        for (Consultation candidate : candidates) {
            transactionTemplate.executeWithoutResult(status -> {
                try {
                    Consultation consultation = consultationRepository.findByAppointmentIdForUpdate(
                            candidate.getAppointment().getAppointmentId()).orElse(null);
                    if (consultation == null || consultation.getFollowUpAppointmentId() != null
                            || consultation.getFollowUpDate() == null || !consultation.getFollowUpDate().isAfter(LocalDateTime.now())) {
                        return;
                    }
                    followUpAppointmentService.materializeLegacyProposal(consultation);
                } catch (RuntimeException ex) {
                    log.warn("Skipped legacy follow-up consultation {} because its slot is no longer available", candidate.getConsultationId());
                    status.setRollbackOnly();
                }
            });
        }
    }
}
