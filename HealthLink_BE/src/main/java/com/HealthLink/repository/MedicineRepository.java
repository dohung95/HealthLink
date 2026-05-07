package com.HealthLink.repository;

import com.HealthLink.entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Integer> {

    List<Medicine> findByNameContainingIgnoreCase(String name);

    List<Medicine> findByActiveTrue();

    List<Medicine> findByNameContainingIgnoreCaseAndActiveTrue(String name);
}
