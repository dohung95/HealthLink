package com.HealthLink.repository.ai;

import com.HealthLink.entity.ai.LabReportUploadIdempotency;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface LabReportUploadIdempotencyRepository extends JpaRepository<LabReportUploadIdempotency, UUID> {
    Optional<LabReportUploadIdempotency> findByAppointmentIdAndDoctorIdAndIdempotencyKey(
            Integer appointmentId, String doctorId, String idempotencyKey);
}
