package com.HealthLink.repository.ai;

import com.HealthLink.entity.ai.LabReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LabReportRepository extends JpaRepository<LabReport, UUID> {

    List<LabReport> findByAppointment_AppointmentIdOrderByUploadedAtDesc(Integer appointmentId);
}
