package com.HealthLink.repository.medicine;

import com.HealthLink.entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Integer> {

    List<Medicine> findByNameContainingIgnoreCase(String name);

    List<Medicine> findByActiveTrue();

    List<Medicine> findByActiveTrueOrderByMedicineIdAsc();

    List<Medicine> findByNameContainingIgnoreCaseAndActiveTrue(String name);

    @Query("""
            SELECT m FROM Medicine m
            WHERE m.active = true
              AND (:keyword IS NULL OR :keyword = ''
                OR LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(m.genericName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(m.brandName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(m.category) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(m.dosageForm) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(m.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:category IS NULL OR :category = '' OR LOWER(m.category) = LOWER(:category))
              AND (:dosageForm IS NULL OR :dosageForm = '' OR LOWER(m.dosageForm) = LOWER(:dosageForm))
            ORDER BY m.name ASC
            """)
    List<Medicine> searchCatalog(
            @Param("keyword") String keyword,
            @Param("category") String category,
            @Param("dosageForm") String dosageForm
    );
}
