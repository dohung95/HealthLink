package com.HealthLink.repository.medicine;

import com.HealthLink.entity.MedicineReminderDispatchLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface MedicineReminderDispatchLogRepository extends JpaRepository<MedicineReminderDispatchLog, Integer> {

    boolean existsByPatient_PatientIdAndReminderDateAndTiming(
            String patientId,
            LocalDate reminderDate,
            String timing
    );
}
