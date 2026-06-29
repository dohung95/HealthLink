package com.HealthLink.repository.appointment;

import com.HealthLink.entity.HomeVisitService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HomeVisitServiceRepository extends JpaRepository<HomeVisitService, Integer> {
    List<HomeVisitService> findByActiveTrueOrderByServiceNameAsc();
}