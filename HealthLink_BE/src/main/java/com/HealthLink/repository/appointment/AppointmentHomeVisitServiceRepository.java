package com.HealthLink.repository.appointment;

import com.HealthLink.entity.AppointmentHomeVisitService;
import java.math.BigDecimal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppointmentHomeVisitServiceRepository
        extends JpaRepository<AppointmentHomeVisitService, Integer> {

    @Query("SELECT COALESCE(SUM(s.price), 0) FROM AppointmentHomeVisitService s " +
           "WHERE s.appointment.appointmentId = :appointmentId")
    BigDecimal sumPriceByAppointmentId(@Param("appointmentId") Integer appointmentId);
}