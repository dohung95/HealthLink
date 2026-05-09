package com.HealthLink.repository.prescription;

import com.HealthLink.entity.PrescriptionHeader;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrescriptionHeaderRepository extends JpaRepository<PrescriptionHeader, Integer> {

    List<PrescriptionHeader> findByPatient_PatientId(String patientId);

    List<PrescriptionHeader> findByDoctor_DoctorId(String doctorId);

    List<PrescriptionHeader> findByAppointment_AppointmentId(Integer appointmentId);
}
