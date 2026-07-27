package com.HealthLink.repository.ai;

import com.HealthLink.entity.ai.CdsAuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CdsAuditEventRepository extends JpaRepository<CdsAuditEvent, UUID> {
    Optional<CdsAuditEvent> findTopByRun_RunIdOrderByTimestampDescEventIdDesc(UUID runId);
    List<CdsAuditEvent> findByRun_RunIdOrderByTimestampAscEventIdAsc(UUID runId);
}
