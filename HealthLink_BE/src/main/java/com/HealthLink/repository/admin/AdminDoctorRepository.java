package com.HealthLink.repository.admin;

import com.HealthLink.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AdminDoctorRepository extends JpaRepository<Doctor, String>, JpaSpecificationExecutor<Doctor> {
}
