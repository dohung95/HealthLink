/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.HealthLink.scheduler;

import com.HealthLink.repository.appointment.AppointmentSlotHoldRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class AppointmentSlotHoldCleanupScheduler {
    private final AppointmentSlotHoldRepository appointmentSlotHoldRepository;

    @Scheduled(fixedDelayString = "${booking.slot-hold-cleanup-ms:60000}")
    @Transactional
    public void cleanupExpiredHolds() {
        LocalDateTime now = LocalDateTime.now();

        long deletedCount = appointmentSlotHoldRepository.deleteByExpiresAtBefore(now);

        if (deletedCount > 0) {
            log.info("Deleted {} expired appointment slot holds", deletedCount);
        }
    }
}
