package com.HealthLink.repository.admin.commission;

import com.HealthLink.entity.CommissionTransaction;
import com.HealthLink.dto.commission.admin.AdminMonthlyCommissionDto;
import com.HealthLink.dto.commission.admin.AdminRecipientSummaryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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

    @Query("SELECT t FROM CommissionTransaction t WHERE " +
           "(:recipientType IS NULL OR t.recipientType = :recipientType) AND " +
           "(:recipientId IS NULL OR t.recipientId = :recipientId) AND " +
           "(:serviceType IS NULL OR t.serviceType = :serviceType) AND " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:dateFrom IS NULL OR t.createdAt >= :dateFrom) AND " +
           "(:dateTo IS NULL OR t.createdAt <= :dateTo)")
    Page<CommissionTransaction> findWithFilters(String recipientType, String recipientId,
                                                String serviceType, String status,
                                                LocalDateTime dateFrom, LocalDateTime dateTo,
                                                Pageable pageable);

    @Query("SELECT COALESCE(SUM(t.grossAmount), 0) FROM CommissionTransaction t")
    BigDecimal getTotalGrossRevenue();

    @Query("SELECT COALESCE(SUM(t.commissionAmount), 0) FROM CommissionTransaction t")
    BigDecimal getTotalCommission();

    @Query("SELECT COALESCE(SUM(t.netAmount), 0) FROM CommissionTransaction t WHERE t.status = 'PENDING'")
    BigDecimal getTotalPendingAmount();

    @Query("SELECT COUNT(t) FROM CommissionTransaction t WHERE t.status = 'PENDING'")
    Integer countPendingTransactions();

    @Query("SELECT COALESCE(SUM(t.grossAmount), 0) FROM CommissionTransaction t WHERE t.recipientType = :type")
    BigDecimal getGrossByRecipientType(String type);

    @Query("SELECT COALESCE(SUM(t.commissionAmount), 0) FROM CommissionTransaction t WHERE t.recipientType = :type")
    BigDecimal getCommissionByRecipientType(String type);

    @Query("SELECT new com.HealthLink.dto.commission.admin.AdminRecipientSummaryDto(" +
           "t.recipientId, t.recipientName, t.recipientType, " +
           "SUM(t.grossAmount), SUM(t.commissionAmount), SUM(t.netAmount), " +
           "SUM(CASE WHEN t.status = 'PENDING' THEN t.netAmount ELSE 0 END), COUNT(t)) " +
           "FROM CommissionTransaction t " +
           "WHERE t.recipientType = :type " +
           "GROUP BY t.recipientId, t.recipientName, t.recipientType " +
           "ORDER BY SUM(CASE WHEN t.status = 'PENDING' THEN t.netAmount ELSE 0 END) DESC")
    List<AdminRecipientSummaryDto> getTopPendingByType(String type, Pageable pageable);

    @Query("SELECT new com.HealthLink.dto.commission.admin.AdminMonthlyCommissionDto(" +
           "YEAR(t.createdAt), MONTH(t.createdAt), '', " +
           "SUM(t.grossAmount), SUM(t.commissionAmount), COUNT(t)) " +
           "FROM CommissionTransaction t " +
           "WHERE t.createdAt >= :fromDate " +
           "GROUP BY YEAR(t.createdAt), MONTH(t.createdAt) " +
           "ORDER BY YEAR(t.createdAt), MONTH(t.createdAt)")
    List<AdminMonthlyCommissionDto> getMonthlyCommission(LocalDateTime fromDate);

    @Query("SELECT MAX(t.transactionNumber) FROM CommissionTransaction t WHERE t.transactionNumber LIKE :prefix%")
    String findMaxTransactionNumber(String prefix);
}
