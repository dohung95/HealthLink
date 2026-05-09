package com.HealthLink.repository.doctor;

import com.HealthLink.entity.Specialty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpecialtyRepository extends JpaRepository<Specialty, Integer> {

    List<Specialty> findByActiveTrue();

    // Get all specialties where active is true OR null (for data that hasn't been set)
    @Query("SELECT s FROM Specialty s WHERE s.active = true OR s.active IS NULL ORDER BY COALESCE(s.displayOrder, 999), s.name")
    List<Specialty> findAllAvailable();

    // Get all specialties ordered by displayOrder and name (ignore active status)
    @Query("SELECT s FROM Specialty s ORDER BY COALESCE(s.displayOrder, 999), s.name")
    List<Specialty> findAllOrdered();
}
