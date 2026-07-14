package com.HealthLink.repository.admin.commission;

import com.HealthLink.entity.CommissionTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AdminCommissionTransactionRepository extends JpaRepository<CommissionTransaction, Integer> {

    Optional<CommissionTransaction> findByTransactionNumber(String transactionNumber);

    Optional<CommissionTransaction> findBySourceTypeAndAppointmentId(String sourceType, Integer appointmentId);

    Optional<CommissionTransaction> findBySourceTypeAndPharmacyOrderId(String sourceType, Integer pharmacyOrderId);

    List<CommissionTransaction> findByRecipientTypeAndRecipientIdAndStatus(
            String recipientType, String recipientId, String status);

    Page<CommissionTransaction> findByStatus(String status, Pageable pageable);

    @Query("SELECT t FROM CommissionTransaction t WHERE "
            + "(:recipientType IS NULL OR t.recipientType = :recipientType) AND "
            + "(:recipientId IS NULL OR t.recipientId = :recipientId) AND "
            + "(:serviceType IS NULL OR t.serviceType = :serviceType) AND "
            + "(:status IS NULL OR t.status = :status) AND "
            + "(:dateFrom IS NULL OR t.createdAt >= :dateFrom) AND "
            + "(:dateTo IS NULL OR t.createdAt <= :dateTo)")
    Page<CommissionTransaction> findWithFilters(String recipientType, String recipientId,
            String serviceType, String status,
            LocalDateTime dateFrom, LocalDateTime dateTo,
            Pageable pageable);

    @Query("SELECT MAX(t.transactionNumber) FROM CommissionTransaction t WHERE t.transactionNumber LIKE :prefix%")
    String findMaxTransactionNumber(String prefix);

    @Query("""
        SELECT COALESCE(SUM(c.netAmount), 0)
        FROM CommissionTransaction c
        WHERE c.recipientType = 'DOCTOR'
          AND c.recipientId = :doctorId
          AND c.createdAt >= :from
          AND c.createdAt < :to
          AND UPPER(c.status) NOT IN ('REFUNDED', 'CANCELLED', 'CANCELED')
          AND c.appointmentId IN (
              SELECT a.appointmentId
              FROM Appointment a
              WHERE UPPER(a.status) NOT IN ('CANCELLED', 'CANCELED', 'EXPIRED', 'FAILED')
          )
        """)
    BigDecimal sumDoctorNetAmount(
            @Param("doctorId") String doctorId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );
}
