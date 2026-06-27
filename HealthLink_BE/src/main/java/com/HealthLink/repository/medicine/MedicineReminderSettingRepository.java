package com.HealthLink.repository.medicine;

import com.HealthLink.entity.MedicineReminderSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicineReminderSettingRepository extends JpaRepository<MedicineReminderSetting, Integer> {

    Optional<MedicineReminderSetting> findByPatient_PatientId(String patientId);

    @Query("""
            SELECT s
            FROM MedicineReminderSetting s
            JOIN FETCH s.patient p
            LEFT JOIN FETCH p.user
            WHERE s.enabled = true
            """)
    List<MedicineReminderSetting> findEnabledSettingsWithPatientAndUser();
}
