package com.HealthLink.repository.ai;

import com.HealthLink.entity.ai.LabReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LabReportRepository extends JpaRepository<LabReport, UUID> {

    List<LabReport> findByAppointment_AppointmentIdOrderByUploadedAtDesc(Integer appointmentId);

    @Lock(LockModeType.OPTIMISTIC_FORCE_INCREMENT)
    @Query("select report from LabReport report where report.reportId = :reportId")
    java.util.Optional<LabReport> findByIdForVerificationMutation(@Param("reportId") UUID reportId);
}
