package com.HealthLink.repository;

import com.HealthLink.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository cho Patient entity.
 */
@Repository
public interface PatientRepository extends JpaRepository<Patient, String> {
}
