package com.HealthLink.repository.admin;

import com.HealthLink.entity.Doctor;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public interface AdminDoctorRepository extends JpaRepository<Doctor, String>, JpaSpecificationExecutor<Doctor> {

    @EntityGraph(attributePaths = "appointments")
    @Override
    List<Doctor> findAll(Specification<Doctor> spec);
}
