package com.HealthLink.repository.admin;

import com.HealthLink.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AdminPatientRepository extends JpaRepository<Patient, String>, JpaSpecificationExecutor<Patient> {
}
