package com.HealthLink.repository.medicine;

import com.HealthLink.entity.MedicineIntakeCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MedicineIntakeCheckRepository extends JpaRepository<MedicineIntakeCheck, Integer> {

    List<MedicineIntakeCheck> findByPatient_PatientIdAndIntakeDateAndTiming(
            String patientId,
            LocalDate intakeDate,
            String timing
    );

    Optional<MedicineIntakeCheck> findByPatient_PatientIdAndPrescriptionItem_PrescriptionItemIdAndIntakeDateAndTiming(
            String patientId,
            Integer prescriptionItemId,
            LocalDate intakeDate,
            String timing
    );
}
