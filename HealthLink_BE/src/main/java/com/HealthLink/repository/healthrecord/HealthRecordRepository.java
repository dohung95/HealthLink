package com.HealthLink.repository.healthrecord;

import com.HealthLink.entity.HealthRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("""
    SELECT r
    FROM HealthRecord r
    WHERE r.patient.patientId = :patientId
      AND (:fromDate IS NULL OR r.recordDate >= :fromDate)
      AND (:toDate IS NULL OR r.recordDate <= :toDate)
    """)
    Page<HealthRecord> findMyRecordsByDateRange(
            @Param("patientId") String patientId,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            Pageable pageable
    );
}
