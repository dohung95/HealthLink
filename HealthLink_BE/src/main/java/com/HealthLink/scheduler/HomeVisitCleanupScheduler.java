package com.HealthLink.scheduler;

import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.appointment.HomeVisitDraftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class HomeVisitCleanupScheduler {

    private final HomeVisitDraftRepository homeVisitDraftRepository;
    private final AppointmentRepository appointmentRepository;

    private static final String STATUS_PENDING_PAYMENT = "PENDINGPAYMENT";

    @Scheduled(fixedDelay = 300000)
    @Transactional
    public void cleanup() {
        cleanupExpiredDrafts();
        cleanupExpiredProposals();
    }

    private void cleanupExpiredDrafts() {
        LocalDateTime now = LocalDateTime.now();
        int deleted = homeVisitDraftRepository.deleteByExpiresAtBefore(now);
        if (deleted > 0) {
            log.info("Deleted {} expired home visit drafts", deleted);
        }
    }

    private void cleanupExpiredProposals() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(15);
        int deleted = appointmentRepository.deleteByStatusAndAppointmentTimeBefore(STATUS_PENDING_PAYMENT, threshold);
        if (deleted > 0) {
            log.info("Deleted {} expired PENDINGPAYMENT proposals", deleted);
        }
    }
}
