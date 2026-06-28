package com.HealthLink.repository.appointment;

import com.HealthLink.entity.AppointmentHomeVisitService;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentHomeVisitServiceRepository
        extends JpaRepository<AppointmentHomeVisitService, Integer> {
}