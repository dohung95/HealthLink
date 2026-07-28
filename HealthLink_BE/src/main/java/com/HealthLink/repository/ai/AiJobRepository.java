package com.HealthLink.repository.ai;

import com.HealthLink.entity.ai.AiJob;
import com.HealthLink.entity.ai.AiJobStatus;
import com.HealthLink.entity.ai.AiJobType;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
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

    @Query("select job from AiJob job where job.jobType = :jobType " +
            "and (job.status = :pendingStatus or " +
            "(job.status = :retryableStatus and job.nextAttemptAt <= :now)) " +
            "order by job.createdAt asc")
    List<AiJob> findDueOcrJobs(@Param("jobType") AiJobType jobType,
                               @Param("pendingStatus") AiJobStatus pendingStatus,
                               @Param("retryableStatus") AiJobStatus retryableStatus,
                               @Param("now") LocalDateTime now,
                               Pageable pageable);
}
