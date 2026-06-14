package com.HealthLink.dto.pharmacy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyOrderResponse {

    private Integer orderId;
    private Integer invoiceId;

    /** Mã đơn hàng, format: ORD-YYYYMMDD-XXXX */
    private String orderNumber;

    // --- Prescription info ---
    private Integer prescriptionHeaderId;
    private Integer pharmacyRequestId;
    private Integer appointmentId;
    private String diagnosis;
    private String doctorId;
    private String doctorName;

    // --- Pharmacy info ---
    private String pharmacyId;
    private String pharmacyName;
    private String pharmacyPhone;

    // --- Patient info ---
    private String patientId;
    private String patientName;

    // --- Order details ---
    private String status;
    private String deliveryType;
    private String deliveryAddress;
    private Double deliveryLatitude;
    private Double deliveryLongitude;
    private String deliveryPhoneNumber;
    private String deliveryAddressSource;

    // --- Amounts (BigDecimal for precision) ---
    private BigDecimal medicineAmount;
    private BigDecimal deliveryFee;
    private BigDecimal totalAmount;

    // --- Payment ---
    private String paymentStatus;
    private String paymentMethod;

    // --- Notes ---
    private String notes;
    private String pharmacistNotes;

    // --- Medication items ---
    private List<PharmacyOrderItemResponse> items;

    // --- Timestamps ---
    private LocalDateTime estimatedDeliveryTime;
    private LocalDateTime actualDeliveryTime;
    private LocalDateTime confirmedAt;
    private LocalDateTime patientConfirmedAt;
    private LocalDateTime preparingAt;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime cancelledAt;
    private String cancelReason;
    private String cancelledBy;
    private LocalDateTime revisionRequestedAt;
    private String revisionRequestNotes;
    private LocalDateTime revisionResolvedAt;
    private LocalDateTime createdAt;

    // --- Thông tin chiết khấu (CHỈ hiển thị cho Pharmacy/Admin, KHÔNG trả về cho Patient) ---
    /** Phí nền tảng đã khấu trừ (USD) */
    private BigDecimal platformFee;

    /** Số tiền Nhà thuốc thực nhận sau chiết khấu (USD) */
    private BigDecimal pharmacyEarning;

    /** Snapshot tỷ lệ chiết khấu đã áp dụng (ví dụ: 0.1000 = 10%) */
    private BigDecimal commissionRate;
}
