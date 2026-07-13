package com.HealthLink.repository.pharmacy;

import com.HealthLink.entity.PharmacyDeliveryContactChangeRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PharmacyDeliveryContactChangeRequestRepository
        extends JpaRepository<PharmacyDeliveryContactChangeRequest, Integer> {

    Optional<PharmacyDeliveryContactChangeRequest> findFirstByOrder_OrderIdAndStatusOrderByRequestedAtDesc(
            Integer orderId, String status);

    List<PharmacyDeliveryContactChangeRequest> findByOrder_Pharmacy_PharmacyIdAndStatus(
            String pharmacyId, String status);

    boolean existsByOrder_OrderIdAndStatus(Integer orderId, String status);
}
