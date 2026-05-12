package com.HealthLink.repository.healthrecord;

import com.HealthLink.entity.HealthRecordShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HealthRecordShareRepository extends JpaRepository<HealthRecordShare, Integer> {
    
    // For doctor to view shares
    List<HealthRecordShare> findBySharedWithDoctor_DoctorIdAndRevokedFalseOrderByConsentGivenAtDesc(String doctorId);
    
    // For patient to view their shared records
    List<HealthRecordShare> findBySharedByPatient_PatientIdOrderByConsentGivenAtDesc(String patientId);
    
    // For patient to manage specific share
    Optional<HealthRecordShare> findByShareIdAndSharedByPatient_PatientId(Integer shareId, String patientId);
    
    // Check duplicate active share
    Optional<HealthRecordShare> findBySharedByPatient_PatientIdAndHealthRecord_HealthRecordIdAndSharedWithDoctor_DoctorIdAndRevokedFalse(
            String patientId, Integer healthRecordId, String doctorId);
}
