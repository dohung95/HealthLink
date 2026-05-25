package com.HealthLink.repository.prescription;

import com.HealthLink.entity.PrescriptionReminderLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface PrescriptionReminderLogRepository extends JpaRepository<PrescriptionReminderLog, Integer> {

    boolean existsByPrescriptionHeader_PrescriptionHeaderIdAndTimingAndReminderDate(
            Integer prescriptionHeaderId,
            String timing,
            LocalDate reminderDate
    );
}
