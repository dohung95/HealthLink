package com.HealthLink.scheduler;

import com.HealthLink.entity.Appointment;
import com.HealthLink.repository.appointment.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class PendingPaymentAppointmentCleanupScheduler {

    private final AppointmentRepository appointmentRepository;

    @Value("${booking.payment-timeout-minutes:15}")
    private long paymentTimeoutMinutes;

    @Scheduled(fixedDelayString = "${booking.payment-cleanup-ms:60000}")
    @Transactional
    public void cleanupExpiredPendingPaymentAppointments() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(paymentTimeoutMinutes);
        List<Appointment> expiredAppointments =
                appointmentRepository.findExpiredPendingPaymentAppointments(cutoff);

        if (expiredAppointments.isEmpty()) {
            return;
        }

        LocalDateTime cancelledAt = LocalDateTime.now();
        for (Appointment appointment : expiredAppointments) {
            appointment.setStatus("CANCELLED");
            appointment.setCancelledBy("System");
            appointment.setCancelledAt(cancelledAt);
            appointment.setCancelReason("Payment timeout");
        }

        appointmentRepository.saveAll(expiredAppointments);
        log.info("Cancelled {} expired pending-payment appointments", expiredAppointments.size());
    }
}
