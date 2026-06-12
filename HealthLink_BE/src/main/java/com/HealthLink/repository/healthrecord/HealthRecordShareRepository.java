package com.HealthLink.repository.healthrecord;

import com.HealthLink.entity.HealthRecordShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;

@Repository
public interface HealthRecordShareRepository extends JpaRepository<HealthRecordShare, Integer> {

    // For doctor to view shares
    List<HealthRecordShare> findBySharedWithDoctor_DoctorIdAndRevokedFalseOrderByConsentGivenAtDesc(String doctorId);

    // For patient to view their shared records
    @Query("""
        SELECT s FROM HealthRecordShare s
        WHERE s.sharedByPatient.patientId = :patientId
          AND s.revoked = false
          AND (s.expiryDate IS NULL OR s.expiryDate > :now)
        ORDER BY s.consentGivenAt DESC
        """)
    Page<HealthRecordShare> findActiveSharesByPatientId(
            @Param("patientId") String patientId,
            @Param("now") LocalDateTime now,
            Pageable pageable
    );

    // For patient to manage specific share
    Optional<HealthRecordShare> findByShareIdAndSharedByPatient_PatientId(Integer shareId, String patientId);

    // Check duplicate active share
    Optional<HealthRecordShare> findBySharedByPatient_PatientIdAndHealthRecord_HealthRecordIdAndSharedWithDoctor_DoctorIdAndRevokedFalse(
            String patientId, Integer healthRecordId, String doctorId);
    
    // check for mobile
    @Query("""
    SELECT s FROM HealthRecordShare s
    WHERE s.sharedByPatient.patientId = :patientId
      AND s.healthRecord.healthRecordId = :healthRecordId
      AND s.sharedWithDoctor.doctorId = :doctorId
      AND s.revoked = false
      AND (s.expiryDate IS NULL OR s.expiryDate > :now)
    """)
    Optional<HealthRecordShare> findActiveShareByPatientRecordAndDoctor(
            @Param("patientId") String patientId,
            @Param("healthRecordId") Integer healthRecordId,
            @Param("doctorId") String doctorId,
            @Param("now") LocalDateTime now
    );
}
