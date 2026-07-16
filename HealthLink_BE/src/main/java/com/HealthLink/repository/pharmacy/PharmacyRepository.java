package com.HealthLink.repository.pharmacy;

import com.HealthLink.entity.Pharmacy;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PharmacyRepository extends JpaRepository<Pharmacy, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Pharmacy p where p.pharmacyId = :id")
    Optional<Pharmacy> findByIdForWalletUpdate(@Param("id") String id);

    // Tìm nhà thuốc đang hoạt động và đã xác minh
    List<Pharmacy> findByActiveTrueAndVerifiedTrue();

    // Tìm nhà thuốc đang hoạt động, đã xác minh và đang online
    List<Pharmacy> findByActiveTrueAndVerifiedTrueAndIsOnlineTrue();

    // Tìm nhà thuốc đang hoạt động, đã xác minh, đang online và có giao hàng
    List<Pharmacy> findByActiveTrueAndVerifiedTrueAndIsOnlineTrueAndDeliveryAvailableTrue();

    // Tìm nhà thuốc đang hoạt động và đã xác minh và có giao hàng
    List<Pharmacy> findByActiveTrueAndVerifiedTrueAndDeliveryAvailableTrue();

    // Tìm nhà thuốc theo tên (case-insensitive search)
    Page<Pharmacy> findByNameContainingIgnoreCase(String name, Pageable pageable);

    boolean existsByPaypalEmailIgnoreCase(String paypalEmail);
}
