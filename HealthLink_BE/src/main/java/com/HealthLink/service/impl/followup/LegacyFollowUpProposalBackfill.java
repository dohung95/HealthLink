package com.HealthLink.service.impl.followup;

import com.HealthLink.entity.Consultation;
import com.HealthLink.repository.consultation.ConsultationRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class LegacyFollowUpProposalBackfill {
    private final ConsultationRepository consultationRepository;
    private final FollowUpAppointmentServiceImpl followUpAppointmentService;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void materializeFutureFollowUpProposals() {
        for (Consultation candidate : consultationRepository.findFutureFollowUpsWithoutAppointment(LocalDateTime.now())) {
            Consultation consultation = consultationRepository.findByAppointmentIdForUpdate(
                    candidate.getAppointment().getAppointmentId()).orElse(null);
            if (consultation == null || consultation.getFollowUpAppointmentId() != null
                    || consultation.getFollowUpDate() == null || !consultation.getFollowUpDate().isAfter(LocalDateTime.now())) {
                continue;
            }
            try {
                followUpAppointmentService.materializeLegacyProposal(consultation);
            } catch (RuntimeException ex) {
                log.warn("Skipped legacy follow-up consultation {} because its slot is no longer available", consultation.getConsultationId());
            }
        }
    }
}
