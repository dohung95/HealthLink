package com.HealthLink.repository.appointment;

import com.HealthLink.entity.HomeVisitDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HomeVisitDetailsRepository extends JpaRepository<HomeVisitDetails, Integer> {

    Optional<HomeVisitDetails> findByAppointment_AppointmentId(Integer appointmentId);
}