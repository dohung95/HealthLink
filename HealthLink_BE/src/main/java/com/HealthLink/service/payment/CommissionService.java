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

    /**
     * Vest commission cho bác sĩ khi appointment chuyển sang COMPLETED.
     * Chuyển PENDING → VESTED, cộng vào pendingSettlement.
     */
    void vestConsultationCommission(Integer appointmentId);

    /**
     * Vest commission cho nhà thuốc khi order chuyển sang DELIVERED.
     */
    void vestPharmacyCommission(Integer orderId);

    /**
     * Xử lý hoàn tiền (Refund) cho hóa đơn.
     * Khi một Payment được chuyển sang REFUNDED:
     * <ul>
     *   <li>Truy vết CommissionTransaction liên quan đến Invoice (theo appointmentId)</li>
     *   <li>Cập nhật CommissionTransaction.status → REFUNDED</li>
     *   <li>Trừ lại netAmount khỏi pendingSettlement của đối tác</li>
     * </ul>
     *
     * @param invoiceId ID hóa đơn cần hoàn tiền
     */
    void processRefund(Integer invoiceId);
}
