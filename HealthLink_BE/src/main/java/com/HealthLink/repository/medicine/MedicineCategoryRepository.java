package com.HealthLink.repository.medicine;

import com.HealthLink.entity.MedicineCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicineCategoryRepository extends JpaRepository<MedicineCategory, Integer> {
    List<MedicineCategory> findByActiveTrueOrderBySortOrderAscNameAsc();

    Optional<MedicineCategory> findByCategoryIdAndActiveTrue(Integer categoryId);
}
