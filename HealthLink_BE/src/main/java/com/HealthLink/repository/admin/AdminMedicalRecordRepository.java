package com.HealthLink.repository.admin;

import com.HealthLink.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AdminMedicalRecordRepository extends JpaRepository<Patient, String> {

    @Query("SELECT p FROM Patient p JOIN p.user u WHERE " +
           "LOWER(p.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(p.patientId) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    Page<Patient> findBySearchTerm(@Param("searchTerm") String searchTerm, Pageable pageable);

    @Query("SELECT COUNT(hr) FROM HealthRecord hr WHERE hr.patient.patientId = :patientId")
    int countHealthRecordsByPatientId(@Param("patientId") String patientId);

    @Query("SELECT COUNT(md) FROM MedicalDocument md JOIN md.healthRecord hr WHERE hr.patient.patientId = :patientId")
    int countDocumentsByPatientId(@Param("patientId") String patientId);

    @Query("SELECT MAX(hr.lastUpdated) FROM HealthRecord hr WHERE hr.patient.patientId = :patientId")
    LocalDateTime findLastUpdatedByPatientId(@Param("patientId") String patientId);

    @Query("SELECT COUNT(hr) FROM HealthRecord hr")
    long countAllHealthRecords();

    @Query("SELECT COUNT(md) FROM MedicalDocument md")
    long countAllDocuments();
}
