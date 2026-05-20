package com.HealthLink.repository.payment;

import com.HealthLink.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho entity Payment.
 * Package: com.HealthLink.repository.payment
 */
@Repository
public interface PaymentRepository extends JpaRepository<Payment, Integer> {

    /**
     * Tìm bản ghi thanh toán theo transaction ID bên ngoài do PayPal trả về.
     * Dùng cho đối soát / kiểm tra trùng.
     */
    Optional<Payment> findByTransactionId(String transactionId);

    /**
     * Tất cả bản ghi thanh toán của một hóa đơn.
     */
    List<Payment> findByInvoice_InvoiceId(Integer invoiceId);

    List<Payment> findByPharmacyOrder_OrderId(Integer orderId);

    /**
     * Tất cả bản ghi thanh toán thuộc về một bệnh nhân (qua invoice → appointment → patient).
     * Hữu ích cho endpoint lịch sử thanh toán của bệnh nhân.
     */
    List<Payment> findByInvoice_Patient_PatientId(String patientId);
}
