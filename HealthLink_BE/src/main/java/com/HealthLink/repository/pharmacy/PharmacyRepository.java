package com.HealthLink.repository.pharmacy;

import com.HealthLink.entity.Pharmacy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PharmacyRepository extends JpaRepository<Pharmacy, String> {

    // Tìm nhà thuốc đang hoạt động và đã xác minh
    List<Pharmacy> findByActiveTrueAndVerifiedTrue();

    // Tìm nhà thuốc đang hoạt động và đã xác minh và có giao hàng
    List<Pharmacy> findByActiveTrueAndVerifiedTrueAndDeliveryAvailableTrue();

    // Tìm nhà thuốc theo tên (case-insensitive search)
    Page<Pharmacy> findByNameContainingIgnoreCase(String name, Pageable pageable);
}
