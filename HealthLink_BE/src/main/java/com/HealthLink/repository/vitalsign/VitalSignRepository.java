package com.HealthLink.repository.vitalsign;

import com.HealthLink.entity.VitalSign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VitalSignRepository extends JpaRepository<VitalSign, Integer> {
    List<VitalSign> findByAppointment_AppointmentIdOrderByMeasuredAtDesc(Integer appointmentId);

    Optional<VitalSign> findTopByAppointment_AppointmentIdOrderByMeasuredAtDesc(Integer appointmentId);

    List<VitalSign> findByPatient_PatientIdOrderByMeasuredAtDesc(String patientId);
}