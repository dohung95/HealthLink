package com.HealthLink.repository.commission;

import com.HealthLink.entity.CommissionConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CommissionConfigRepository extends JpaRepository<CommissionConfig, Integer> {

    Optional<CommissionConfig> findByServiceType(String serviceType);

    List<CommissionConfig> findByActiveTrue();

    @Query("SELECT c FROM CommissionConfig c WHERE c.serviceType = :serviceType " +
           "AND c.active = true " +
           "AND (c.effectiveFrom IS NULL OR c.effectiveFrom <= :now) " +
           "AND (c.effectiveTo IS NULL OR c.effectiveTo >= :now)")
    Optional<CommissionConfig> findActiveConfigByServiceType(String serviceType, LocalDateTime now);

    List<CommissionConfig> findAllByOrderByServiceTypeAsc();
}
