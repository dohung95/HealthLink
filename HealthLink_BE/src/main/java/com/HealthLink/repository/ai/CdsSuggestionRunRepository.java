package com.HealthLink.repository.ai;

import com.HealthLink.entity.ai.CdsSuggestionRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface CdsSuggestionRunRepository extends JpaRepository<CdsSuggestionRun, UUID> {
    List<CdsSuggestionRun> findBySnapshot_Appointment_AppointmentIdOrderByCreatedAtDesc(Integer appointmentId);
    List<CdsSuggestionRun> findBySnapshot_Appointment_AppointmentIdAndStatusIn(
            Integer appointmentId, List<String> statuses);
}
