package com.HealthLink.repository.admin.commission;

import com.HealthLink.entity.Settlement;
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
public interface AdminSettlementRepository extends JpaRepository<Settlement, Integer> {

    Optional<Settlement> findBySettlementNumber(String settlementNumber);

    List<Settlement> findByRecipientTypeAndRecipientId(String recipientType, String recipientId);

    Page<Settlement> findByStatus(String status, Pageable pageable);

    Page<Settlement> findByRecipientType(String recipientType, Pageable pageable);

    @Query("SELECT s FROM Settlement s WHERE " +
           "(:recipientType IS NULL OR s.recipientType = :recipientType) AND " +
           "(:status IS NULL OR s.status = :status) AND " +
           "(:dateFrom IS NULL OR s.createdAt >= :dateFrom) AND " +
           "(:dateTo IS NULL OR s.createdAt <= :dateTo)")
    Page<Settlement> findWithFilters(String recipientType, String status,
                                     LocalDateTime dateFrom, LocalDateTime dateTo,
                                     Pageable pageable);

    @Query("SELECT COALESCE(SUM(s.netAmount), 0) FROM Settlement s WHERE s.status = 'COMPLETED'")
    BigDecimal getTotalPaidOut();

    @Query("SELECT COUNT(s) FROM Settlement s WHERE s.status = 'PENDING'")
    Integer countPendingSettlements();

    @Query("SELECT COALESCE(SUM(s.netAmount), 0) FROM Settlement s WHERE s.status = 'COMPLETED' " +
           "AND s.recipientType = :recipientType AND s.recipientId = :recipientId")
    BigDecimal getTotalCompletedNetAmountByRecipient(
        @Param("recipientType") String recipientType,
        @Param("recipientId") String recipientId);

    @Query("SELECT MAX(s.settlementNumber) FROM Settlement s WHERE s.settlementNumber LIKE :prefix%")
    String findMaxSettlementNumber(String prefix);
}
