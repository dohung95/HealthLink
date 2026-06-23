package com.HealthLink.repository;

import com.HealthLink.entity.DoctorService;
import com.HealthLink.entity.DoctorServiceId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DoctorServiceRepository extends JpaRepository<DoctorService, DoctorServiceId> {
    List<DoctorService> findByDoctor_DoctorId(String doctorId);
}
