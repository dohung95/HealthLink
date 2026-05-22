package com.HealthLink.repository.healthrecord;

import com.HealthLink.entity.HealthRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

@Repository
public interface HealthRecordRepository extends JpaRepository<HealthRecord, Integer> {

    Page<HealthRecord> findByPatient_PatientIdOrderByCreatedAtDesc(
            String patientId,
            Pageable pageable
    );

    List<HealthRecord> findByPatient_PatientIdAndRecordDateBetweenOrderByCreatedAtDesc(
            String patientId,
            LocalDateTime start,
            LocalDateTime end
    );
}
