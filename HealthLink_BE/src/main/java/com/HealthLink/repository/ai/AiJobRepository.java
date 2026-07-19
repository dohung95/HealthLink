package com.HealthLink.repository.ai;

import com.HealthLink.entity.ai.AiJob;
import com.HealthLink.entity.ai.AiJobType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiJobRepository extends JpaRepository<AiJob, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from AiJob job where job.jobId = :jobId")
    Optional<AiJob> findByJobIdForUpdate(@Param("jobId") UUID jobId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AiJob> findByJobTypeAndResourceTypeAndResourceIdAndCorrelationId(
            AiJobType jobType, String resourceType, String resourceId, UUID correlationId);
}
