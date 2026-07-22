package com.HealthLink.repository.ai;

import com.HealthLink.entity.ai.EncounterClinicalContext;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface EncounterClinicalContextRepository extends JpaRepository<EncounterClinicalContext, Integer> {
    Optional<EncounterClinicalContext> findByAppointment_AppointmentId(Integer appointmentId);
}
