package com.HealthLink.repository.payment;

import com.HealthLink.entity.Settlement;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho bảng Settlements.
 * Cung cấp các truy vấn để tra cứu lịch sử rút tiền của đối tác.
 */
@Repository
public interface PaymentSettlementRepository extends JpaRepository<Settlement, Integer> {

    /**
     * Tìm settlement theo số mã duy nhất (STL-YYYYMM-XXXXX).
     */
    Optional<Settlement> findBySettlementNumber(String settlementNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Settlement s where s.settlementId = :settlementId")
    Optional<Settlement> findByIdForUpdate(@Param("settlementId") Integer settlementId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Settlement s where s.recipientType = :recipientType "
            + "and s.recipientId = :recipientId and s.clientRequestId = :clientRequestId")
    Optional<Settlement> findByRecipientTypeAndRecipientIdAndClientRequestIdForUpdate(
            @Param("recipientType") String recipientType,
            @Param("recipientId") String recipientId,
            @Param("clientRequestId") String clientRequestId);

    /**
     * Lấy lịch sử tất cả settlement của một đối tác, sắp xếp mới nhất lên đầu.
     */
    List<Settlement> findByRecipientIdOrderByCreatedAtDesc(String recipientId);

    /**
     * Lấy settlement đang trong trạng thái xử lý (PROCESSING) của một đối tác.
     */
    List<Settlement> findByRecipientIdAndStatus(String recipientId, String status);
}
