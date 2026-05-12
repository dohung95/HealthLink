package com.HealthLink.service.payment;

import com.HealthLink.dto.payment.CommissionTransactionResponse;
import com.HealthLink.entity.Invoice;
import com.HealthLink.entity.PharmacyOrder;

import java.util.List;

/**
 * CommissionService – service ghi nhận giao dịch commission và tích lũy thu nhập đối tác.
 *
 * <p>Được gọi sau khi thanh toán thành công (khi Payment chuyển sang trạng thái SUCCESS):
 * <ol>
 *   <li>Tạo bản ghi CommissionTransaction</li>
 *   <li>Cập nhật totalEarnings và pendingSettlement của Doctor/Pharmacy</li>
 *   <li>Ghi snapshot platformFee, commissionRate vào Invoice hoặc PharmacyOrder</li>
 * </ol>
 */
public interface CommissionService {

    /**
     * Xử lý commission sau khi thanh toán hóa đơn tư vấn bác sĩ thành công.
     * Tạo CommissionTransaction và cập nhật số dư Doctor.
     *
     * @param invoice hóa đơn đã chuyển sang trạng thái PAID
     */
    void processConsultationCommission(Invoice invoice);

    /**
     * Xử lý commission sau khi thanh toán đơn thuốc thành công.
     * Tạo CommissionTransaction và cập nhật số dư Pharmacy.
     *
     * @param pharmacyOrder đơn thuốc đã được thanh toán
     */
    void processPharmacyOrderCommission(PharmacyOrder pharmacyOrder);

    /**
     * Lấy danh sách giao dịch commission của một đối tác (Doctor/Pharmacy).
     *
     * @param recipientId ID của đối tác (doctorId hoặc pharmacyId)
     * @return danh sách CommissionTransactionResponse
     */
    List<CommissionTransactionResponse> getTransactionsByRecipient(String recipientId);
}
