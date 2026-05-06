package com.HealthLink.repository;

import com.HealthLink.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Integer> {

    List<Appointment> findByPatient_PatientId(String patientId);

    List<Appointment> findByDoctor_DoctorId(String doctorId);
}
