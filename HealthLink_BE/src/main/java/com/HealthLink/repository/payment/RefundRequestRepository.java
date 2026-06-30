package com.HealthLink.repository.payment;

import com.HealthLink.entity.RefundRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RefundRequestRepository extends JpaRepository<RefundRequest, Integer> {
    List<RefundRequest> findByPatientIdOrderByCreatedAtDesc(String patientId);
    List<RefundRequest> findByStatusOrderByCreatedAtAsc(String status);
}
