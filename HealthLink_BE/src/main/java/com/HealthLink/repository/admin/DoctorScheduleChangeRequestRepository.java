package com.HealthLink.repository.admin;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.DoctorScheduleChangeRequest;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.enums.ChangeRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DoctorScheduleChangeRequestRepository extends JpaRepository<DoctorScheduleChangeRequest, Integer> {

    List<DoctorScheduleChangeRequest> findByDoctorDoctorIdOrderByCreatedAtDesc(String doctorId);

    List<DoctorScheduleChangeRequest> findAllByOrderByCreatedAtDesc();

    boolean existsByAppointmentAndStatus(Appointment appointment, ChangeRequestStatus status);
}
