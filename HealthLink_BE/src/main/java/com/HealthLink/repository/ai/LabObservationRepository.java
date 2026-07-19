package com.HealthLink.repository.ai;

import com.HealthLink.entity.ai.LabObservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LabObservationRepository extends JpaRepository<LabObservation, UUID> {

    List<LabObservation> findByReport_ReportIdOrderByRowOrderAsc(UUID reportId);
}
