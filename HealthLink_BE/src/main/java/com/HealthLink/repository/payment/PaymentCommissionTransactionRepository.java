package com.HealthLink.repository.payment;

import com.HealthLink.entity.CommissionTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository cho bảng CommissionTransactions.
 * Cung cấp các truy vấn để truy xuất lịch sử giao dịch và báo cáo doanh thu.
 */
@Repository
public interface PaymentCommissionTransactionRepository extends JpaRepository<CommissionTransaction, Integer> {

    /**
     * Lấy danh sách giao dịch của một đối tác (Doctor/Pharmacy) theo recipientId.
     */
    List<CommissionTransaction> findByRecipientIdOrderByCreatedAtDesc(String recipientId);

    /**
     * Lấy danh sách giao dịch PENDING (chưa được quyết toán) của một đối tác.
     */
    List<CommissionTransaction> findByRecipientIdAndStatus(String recipientId, String status);

    /**
     * Tính tổng PlatformFee (commissionAmount) theo khoảng thời gian – phục vụ báo cáo Admin.
     * Chỉ tính các giao dịch có trạng thái SETTLED hoặc PENDING (đã hoàn tất thanh toán).
     */
    @Query("SELECT COALESCE(SUM(t.commissionAmount), 0) " +
           "FROM CommissionTransaction t " +
           "WHERE t.createdAt BETWEEN :from AND :to " +
           "AND t.status <> 'REFUNDED'")
    BigDecimal sumPlatformFeeByDateRange(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /**
     * Lấy danh sách giao dịch trong khoảng thời gian – phục vụ báo cáo chi tiết.
     */
    @Query("SELECT t FROM CommissionTransaction t " +
           "WHERE t.createdAt BETWEEN :from AND :to " +
           "ORDER BY t.createdAt DESC")
    List<CommissionTransaction> findByDateRange(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /**
     * Kiểm tra xem đã có giao dịch commission cho một appointment chưa.
     */
    boolean existsByAppointmentIdAndRecipientType(Integer appointmentId, String recipientType);

    /**
     * Kiểm tra xem đã có giao dịch commission cho một pharmacy order chưa.
     */
    boolean existsByPharmacyOrderIdAndRecipientType(Integer pharmacyOrderId, String recipientType);

    /**
     * Lấy danh sách giao dịch commission theo appointmentId.
     * Dùng để truy vết khi xử lý hoàn tiền (Refund).
     */
    List<CommissionTransaction> findByAppointmentId(Integer appointmentId);

    /**
     * Lấy danh sách giao dịch commission theo pharmacyOrderId.
     * Dùng để truy vết khi xử lý hoàn tiền đơn thuốc (Refund).
     */
    List<CommissionTransaction> findByPharmacyOrderId(Integer pharmacyOrderId);
}
