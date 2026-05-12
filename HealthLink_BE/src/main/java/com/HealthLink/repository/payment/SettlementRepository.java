package com.HealthLink.repository.payment;

import com.HealthLink.entity.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho bảng Settlements.
 * Cung cấp các truy vấn để tra cứu lịch sử rút tiền của đối tác.
 */
@Repository
public interface SettlementRepository extends JpaRepository<Settlement, Integer> {

    /**
     * Tìm settlement theo số mã duy nhất (STL-YYYYMM-XXXXX).
     */
    Optional<Settlement> findBySettlementNumber(String settlementNumber);

    /**
     * Lấy lịch sử tất cả settlement của một đối tác, sắp xếp mới nhất lên đầu.
     */
    List<Settlement> findByRecipientIdOrderByCreatedAtDesc(String recipientId);

    /**
     * Lấy settlement đang trong trạng thái xử lý (PROCESSING) của một đối tác.
     */
    List<Settlement> findByRecipientIdAndStatus(String recipientId, String status);
}
