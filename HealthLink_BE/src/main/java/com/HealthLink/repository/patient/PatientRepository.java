package com.HealthLink.repository.patient;

import com.HealthLink.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PatientRepository extends JpaRepository<Patient, String> {

    @Query("SELECT p FROM Patient p LEFT JOIN FETCH p.user u WHERE p.patientId IN :ids")
    List<Patient> findByIdsWithUser(@Param("ids") List<String> ids);
}
