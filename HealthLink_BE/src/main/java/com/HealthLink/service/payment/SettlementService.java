package com.HealthLink.service.payment;

import com.HealthLink.dto.payment.SettlementRequest;
import com.HealthLink.dto.payment.SettlementResponse;

import java.util.List;

/**
 * SettlementService – service xử lý yêu cầu rút tiền chủ động từ đối tác về PayPal cá nhân.
 *
 * <p>Quy trình rút tiền:
 * <ol>
 *   <li>Kiểm tra pendingSettlement ≥ $10.00</li>
 *   <li>Xác thực paypalEmail khớp với hồ sơ đối tác</li>
 *   <li>Khởi tạo Settlement PENDING</li>
 *   <li>Gọi PayPal Payouts API để chuyển tiền</li>
 *   <li>Cập nhật trạng thái COMPLETED hoặc FAILED</li>
 * </ol>
 */
public interface SettlementService {

    /**
     * Xử lý yêu cầu rút tiền của Bác sĩ.
     *
     * @param doctorId ID của bác sĩ yêu cầu rút
     * @param request  thông tin yêu cầu rút tiền
     * @return kết quả settlement
     */
    SettlementResponse withdrawDoctorEarnings(String doctorId, SettlementRequest request);

    /**
     * Xử lý yêu cầu rút tiền của Nhà thuốc.
     *
     * @param pharmacyId ID của nhà thuốc yêu cầu rút
     * @param request    thông tin yêu cầu rút tiền
     * @return kết quả settlement
     */
    SettlementResponse withdrawPharmacyEarnings(String pharmacyId, SettlementRequest request);

    /**
     * Lấy lịch sử rút tiền của một đối tác.
     *
     * @param recipientId ID đối tác (doctorId hoặc pharmacyId)
     * @return danh sách lịch sử settlement
     */
    List<SettlementResponse> getSettlementHistory(String recipientId);
}
