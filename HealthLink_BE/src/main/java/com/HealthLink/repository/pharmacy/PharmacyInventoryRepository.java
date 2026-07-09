package com.HealthLink.repository.pharmacy;

import com.HealthLink.entity.PharmacyInventory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Sort;

@Repository
public interface PharmacyInventoryRepository extends JpaRepository<PharmacyInventory, Integer> {

    List<PharmacyInventory> findByPharmacy_PharmacyId(String pharmacyId);

    Optional<PharmacyInventory> findByPharmacy_PharmacyIdAndMedicine_MedicineId(String pharmacyId, Integer medicineId);

    List<PharmacyInventory> findByPharmacy_PharmacyIdAndMedicine_MedicineIdIn(
            String pharmacyId,
            Collection<Integer> medicineIds
    );

    Page<PharmacyInventory> findByPharmacy_PharmacyId(String pharmacyId, Pageable pageable);

    @Query("""
            SELECT i FROM PharmacyInventory i
            WHERE i.pharmacy.pharmacyId = :pharmacyId
              AND (:query IS NULL
                   OR LOWER(i.medicine.name) LIKE LOWER(CONCAT('%', :query, '%'))
                   OR LOWER(i.medicine.genericName) LIKE LOWER(CONCAT('%', :query, '%')))
              AND (:dosageForm IS NULL OR LOWER(i.medicine.dosageForm) = LOWER(:dosageForm))
              AND (:active IS NULL OR i.active = :active)
              AND (:lowStock = false OR (i.quantity - i.reservedQuantity) < COALESCE(i.minStockLevel, :defaultThreshold))
              AND (:expiringSoon = false OR (i.active = true AND i.expiryDate IS NOT NULL AND i.expiryDate BETWEEN :today AND :expiryLimit))
              AND (:availableOnly = false OR (i.active = true AND (i.quantity - i.reservedQuantity) > 0))
            """)
    Page<PharmacyInventory> findInventoryByFilters(
            @Param("pharmacyId") String pharmacyId,
            @Param("query") String query,
            @Param("dosageForm") String dosageForm,
            @Param("active") Boolean active,
            @Param("lowStock") boolean lowStock,
            @Param("expiringSoon") boolean expiringSoon,
            @Param("availableOnly") boolean availableOnly,
            @Param("today") LocalDate today,
            @Param("expiryLimit") LocalDate expiryLimit,
            @Param("defaultThreshold") int defaultThreshold,
            Pageable pageable);

    @Query("""
            SELECT i FROM PharmacyInventory i
            WHERE i.pharmacy.pharmacyId = :pharmacyId
              AND i.medicine.categoryNode.categoryId IN :categoryIds
              AND (:query IS NULL
                   OR LOWER(i.medicine.name) LIKE LOWER(CONCAT('%', :query, '%'))
                   OR LOWER(i.medicine.genericName) LIKE LOWER(CONCAT('%', :query, '%')))
              AND (:dosageForm IS NULL OR LOWER(i.medicine.dosageForm) = LOWER(:dosageForm))
              AND (:active IS NULL OR i.active = :active)
              AND (:lowStock = false OR (i.quantity - i.reservedQuantity) < COALESCE(i.minStockLevel, :defaultThreshold))
              AND (:expiringSoon = false OR (i.active = true AND i.expiryDate IS NOT NULL AND i.expiryDate BETWEEN :today AND :expiryLimit))
              AND (:availableOnly = false OR (i.active = true AND (i.quantity - i.reservedQuantity) > 0))
            """)
    Page<PharmacyInventory> findInventoryByFiltersAndCategoryIds(
            @Param("pharmacyId") String pharmacyId,
            @Param("query") String query,
            @Param("dosageForm") String dosageForm,
            @Param("active") Boolean active,
            @Param("lowStock") boolean lowStock,
            @Param("expiringSoon") boolean expiringSoon,
            @Param("availableOnly") boolean availableOnly,
            @Param("categoryIds") Collection<Integer> categoryIds,
            @Param("today") LocalDate today,
            @Param("expiryLimit") LocalDate expiryLimit,
            @Param("defaultThreshold") int defaultThreshold,
            Pageable pageable);

    @Query("SELECT i FROM PharmacyInventory i WHERE i.pharmacy.pharmacyId = :pharmacyId " +
           "AND i.active = true AND (i.quantity - i.reservedQuantity) < COALESCE(i.minStockLevel, :defaultThreshold) " +
           "AND (i.expiryDate IS NULL OR i.expiryDate > CURRENT_DATE)")
    List<PharmacyInventory> findActiveLowStock(@Param("pharmacyId") String pharmacyId,
                                                @Param("defaultThreshold") int defaultThreshold);

    long countByPharmacy_PharmacyId(String pharmacyId);
}
