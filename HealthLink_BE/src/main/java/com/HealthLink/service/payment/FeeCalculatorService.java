package com.HealthLink.service.payment;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.PharmacyOrder;

import java.math.BigDecimal;

/**
 * FeeCalculatorService – service tính toán phí chiết khấu dựa trên cấu hình từ CommissionConfigs.
 *
 * <p>Hai nhóm đối tác:
 * <ul>
 *   <li>Doctor (Tư vấn): Online 15%, Offline 10% trên consultationFee</li>
 *   <li>Pharmacy (Nhà thuốc): 10% trên medicineAmount, không tính deliveryFee</li>
 * </ul>
 *
 * <p>Công thức: PlatformFee = Fee × Rate; PartnerEarning = Fee − PlatformFee
 */
public interface FeeCalculatorService {

    /**
     * Tính phí chiết khấu cho lịch hẹn bác sĩ.
     * Xác định loại tư vấn (Online/Offline) để áp dụng tỷ lệ đúng.
     *
     * @param appointment lịch hẹn đã hoàn tất cần tính phí
     * @return kết quả tính toán bao gồm commissionRate, platformFee, doctorEarning
     */
    FeeResult calculateConsultationFee(Appointment appointment);

    /**
     * Tính phí chiết khấu cho đơn thuốc nhà thuốc.
     * Chỉ tính trên medicineAmount, KHÔNG tính trên deliveryFee.
     *
     * @param pharmacyOrder đơn thuốc cần tính phí
     * @return kết quả tính toán bao gồm commissionRate, platformFee, pharmacyEarning
     */
    FeeResult calculatePharmacyOrderFee(PharmacyOrder pharmacyOrder);

    /**
     * DTO nội bộ chứa kết quả tính phí chiết khấu.
     */
    record FeeResult(
            BigDecimal commissionRate,
            BigDecimal platformFee,
            BigDecimal partnerEarning,
            String serviceType
    ) {}
}
