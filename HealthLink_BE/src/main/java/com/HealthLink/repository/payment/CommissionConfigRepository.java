package com.HealthLink.repository.payment;

import com.HealthLink.entity.CommissionConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository cho bảng CommissionConfigs.
 * Cung cấp các truy vấn để lấy cấu hình chiết khấu theo loại dịch vụ.
 */
@Repository
public interface CommissionConfigRepository extends JpaRepository<CommissionConfig, Integer> {

    /**
     * Lấy cấu hình chiết khấu đang hoạt động theo loại dịch vụ.
     * Ví dụ: CONSULTATION_ONLINE, CONSULTATION_OFFLINE, PHARMACY_ORDER
     */
    Optional<CommissionConfig> findByServiceTypeAndActiveTrue(String serviceType);
}
