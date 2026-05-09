package com.HealthLink.repository.appointment;

import com.HealthLink.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Integer> {

    /**
     * Get all appointments of a patient, sorted by the latest first.
     */
    List<Appointment> findByPatient_PatientIdOrderByAppointmentTimeDesc(String patientId);

    // Checks for doctor schedule conflicts within a time range.
    boolean existsByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
            String doctorId,
            String status,
            LocalDateTime start,
            LocalDateTime end
    );

    // Kiểm tra conflict tại slot mới, bỏ qua chính appointment đang reschedule
    boolean existsByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetweenAndAppointmentIdNot(
            String doctorId,
            String status,
            LocalDateTime start,
            LocalDateTime end,
            Integer excludeAppointmentId
    );

    List<Appointment> findByPatient_PatientId(String patientId);

    List<Appointment> findByDoctor_DoctorId(String doctorId);
}
