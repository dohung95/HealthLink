package com.HealthLink.repository.pharmacy;

import com.HealthLink.entity.PharmacyInventory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PharmacyInventoryRepository extends JpaRepository<PharmacyInventory, Integer> {

    List<PharmacyInventory> findByPharmacy_PharmacyId(String pharmacyId);

    Optional<PharmacyInventory> findByPharmacy_PharmacyIdAndMedicine_MedicineId(String pharmacyId, Integer medicineId);

    Page<PharmacyInventory> findByPharmacy_PharmacyId(String pharmacyId, Pageable pageable);

    @Query("SELECT i FROM PharmacyInventory i WHERE i.pharmacy.pharmacyId = :pharmacyId " +
           "AND (LOWER(i.medicine.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(i.medicine.genericName) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<PharmacyInventory> searchByPharmacyId(@Param("pharmacyId") String pharmacyId,
                                                @Param("query") String query,
                                                Pageable pageable);

    @Query("SELECT i FROM PharmacyInventory i WHERE i.pharmacy.pharmacyId = :pharmacyId " +
           "AND i.active = :active")
    Page<PharmacyInventory> findByPharmacyIdAndActive(@Param("pharmacyId") String pharmacyId,
                                                       @Param("active") boolean active,
                                                       Pageable pageable);

    @Query("SELECT i FROM PharmacyInventory i WHERE i.pharmacy.pharmacyId = :pharmacyId " +
           "AND (i.quantity - i.reservedQuantity) < :threshold")
    Page<PharmacyInventory> findLowStockByPharmacyId(@Param("pharmacyId") String pharmacyId,
                                                       @Param("threshold") int threshold,
                                                       Pageable pageable);

    long countByPharmacy_PharmacyId(String pharmacyId);
}
