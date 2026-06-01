package com.HealthLink.service.impl.payment;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.CommissionConfig;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.payment.PaymentCommissionConfigRepository;
import com.HealthLink.service.payment.FeeCalculatorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Set;

/**
 * Cài đặt của {@link FeeCalculatorService}.
 *
 * <p>Chiến lược xác định tỷ lệ chiết khấu:
 * <ol>
 *   <li>Ưu tiên {@code doctor.customCommissionRate} nếu đã được thiết lập riêng.</li>
 *   <li>Nếu không có tỷ lệ riêng → tra cứu bảng {@code CommissionConfigs} theo serviceType.</li>
 *   <li>Nếu không tìm thấy config → dùng giá trị mặc định cứng (15% Online / 10% Offline & Pharmacy).</li>
 * </ol>
 *
 * <p>ServiceType mapping:
 * <ul>
 *   <li>ONLINE  → consultationType: Video, Audio, Chat</li>
 *   <li>OFFLINE → consultationType: Offline, In-person</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FeeCalculatorServiceImpl implements FeeCalculatorService {

    // ── Các loại hình tư vấn thuộc nhóm ONLINE ──────────────────────────────
    private static final Set<String> ONLINE_TYPES = Set.of(
            "Video", "Audio", "Chat", "VIDEO", "AUDIO", "CHAT",
            "video", "audio", "chat"
    );

    // ── ServiceType keys tra bảng CommissionConfigs ──────────────────────────
    private static final String SERVICE_CONSULTATION_ONLINE  = "CONSULTATION_ONLINE";
    private static final String SERVICE_CONSULTATION_OFFLINE = "CONSULTATION_OFFLINE";
    private static final String SERVICE_PHARMACY_ORDER       = "PHARMACY_ORDER";

    // ── Tỷ lệ mặc định (fallback nếu DB chưa có cấu hình) ───────────────────
    private static final BigDecimal DEFAULT_ONLINE_RATE   = new BigDecimal("0.1500");
    private static final BigDecimal DEFAULT_OFFLINE_RATE  = new BigDecimal("0.1000");
    private static final BigDecimal DEFAULT_PHARMACY_RATE = new BigDecimal("0.1000");

    private final PaymentCommissionConfigRepository commissionConfigRepository;

    // ========================================================================
    // Tính phí cho Bác sĩ (Consultation)
    // ========================================================================

    @Override
    public FeeResult calculateConsultationFee(Appointment appointment) {
        // Xác định loại hình tư vấn: ONLINE hay OFFLINE
        String consultationType = appointment.getConsultationType();
        boolean isOnline = consultationType != null && ONLINE_TYPES.contains(consultationType);
        String serviceType = isOnline ? SERVICE_CONSULTATION_ONLINE : SERVICE_CONSULTATION_OFFLINE;

        // Lấy phí tư vấn từ Doctor
        Doctor doctor = appointment.getDoctor();
        BigDecimal consultationFee = (doctor != null && doctor.getConsultationFee() != null)
                ? doctor.getConsultationFee()
                : BigDecimal.ZERO;

        if (consultationFee.compareTo(BigDecimal.ZERO) == 0) {
            log.warn("Consultation fee is zero for appointment {}, no commission calculated",
                    appointment.getAppointmentId());
            return new FeeResult(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, serviceType);
        }

        // Xác định tỷ lệ chiết khấu theo thứ tự ưu tiên
        BigDecimal rate = resolveConsultationRate(doctor, serviceType, isOnline);

        // Công thức: PlatformFee = Fee × Rate; DoctorEarning = Fee - PlatformFee
        BigDecimal platformFee = consultationFee
                .multiply(rate)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal partnerEarning = consultationFee.subtract(platformFee);

        log.debug("Consultation fee calculated: fee={}, rate={}, platformFee={}, doctorEarning={}",
                consultationFee, rate, platformFee, partnerEarning);

        return new FeeResult(rate, platformFee, partnerEarning, serviceType);
    }

    // ========================================================================
    // Tính phí cho Nhà thuốc (Pharmacy Order)
    // ========================================================================

    @Override
    public FeeResult calculatePharmacyOrderFee(PharmacyOrder pharmacyOrder) {
        // Chỉ tính trên medicineAmount, KHÔNG tính trên deliveryFee
        BigDecimal medicineAmount = pharmacyOrder.getMedicineAmount() != null
                ? pharmacyOrder.getMedicineAmount()
                : BigDecimal.ZERO;

        BigDecimal deliveryFee = pharmacyOrder.getDeliveryFee() != null
                ? pharmacyOrder.getDeliveryFee()
                : BigDecimal.ZERO;

        if (medicineAmount.compareTo(BigDecimal.ZERO) == 0) {
            log.warn("Medicine amount is zero for pharmacy order {}, no commission calculated",
                    pharmacyOrder.getOrderId());
            return new FeeResult(BigDecimal.ZERO, BigDecimal.ZERO,
                    deliveryFee, SERVICE_PHARMACY_ORDER);
        }

        // Xác định tỷ lệ chiết khấu: ưu tiên customCommissionRate của Pharmacy
        BigDecimal rate = resolvePharmacyRate(pharmacyOrder);

        // Công thức:
        //   PlatformFee     = MedicineAmount × Rate
        //   PharmacyEarning = TotalAmount    - PlatformFee
        //                   = (MedicineAmount + DeliveryFee) - PlatformFee
        BigDecimal platformFee = medicineAmount
                .multiply(rate)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalAmount = medicineAmount.add(deliveryFee);
        BigDecimal partnerEarning = totalAmount.subtract(platformFee);

        log.debug("Pharmacy fee calculated: medicineAmount={}, deliveryFee={}, rate={}, " +
                        "platformFee={}, pharmacyEarning={}",
                medicineAmount, deliveryFee, rate, platformFee, partnerEarning);

        return new FeeResult(rate, platformFee, partnerEarning, SERVICE_PHARMACY_ORDER);
    }

    // ========================================================================
    // Private helpers – xác định tỷ lệ chiết khấu
    // ========================================================================

    /**
     * Xác định tỷ lệ cho bác sĩ theo thứ tự ưu tiên:
     * 1. customCommissionRateOnline/Offline của Doctor (nếu có và còn hiệu lực)
     * 2. CommissionConfigs trong DB
     * 3. Giá trị mặc định cứng
     */
    private BigDecimal resolveConsultationRate(Doctor doctor, String serviceType, boolean isOnline) {
        if (doctor != null) {
            if (isOnline) {
                // Ưu tiên 1: tỷ lệ riêng cho Online
                if (doctor.getCustomCommissionRateOnline() != null
                        && doctor.getCustomCommissionRateOnline().compareTo(BigDecimal.ZERO) > 0
                        && isCustomRateValid(doctor.getCustomCommissionRateOnlineEffectiveFrom(),
                                             doctor.getCustomCommissionRateOnlineEffectiveTo())) {
                    log.debug("Using custom ONLINE commission rate {} for doctor {}",
                            doctor.getCustomCommissionRateOnline(), doctor.getDoctorId());
                    return doctor.getCustomCommissionRateOnline();
                }
            } else {
                // Ưu tiên 1: tỷ lệ riêng cho Offline
                if (doctor.getCustomCommissionRateOffline() != null
                        && doctor.getCustomCommissionRateOffline().compareTo(BigDecimal.ZERO) > 0
                        && isCustomRateValid(doctor.getCustomCommissionRateOfflineEffectiveFrom(),
                                             doctor.getCustomCommissionRateOfflineEffectiveTo())) {
                    log.debug("Using custom OFFLINE commission rate {} for doctor {}",
                            doctor.getCustomCommissionRateOffline(), doctor.getDoctorId());
                    return doctor.getCustomCommissionRateOffline();
                }
            }
        }

        // Ưu tiên 2: tra cứu DB
        return commissionConfigRepository.findByServiceTypeAndActiveTrue(serviceType)
                .map(CommissionConfig::getCommissionRate)
                .orElseGet(() -> {
                    // Ưu tiên 3: fallback cứng
                    BigDecimal defaultRate = isOnline ? DEFAULT_ONLINE_RATE : DEFAULT_OFFLINE_RATE;
                    log.warn("No active CommissionConfig found for serviceType={}, using default {}",
                            serviceType, defaultRate);
                    return defaultRate;
                });
    }

    /**
     * Xác định tỷ lệ cho nhà thuốc theo thứ tự ưu tiên:
     * 1. customCommissionRate của Pharmacy (nếu có và còn hiệu lực)
     * 2. CommissionConfigs trong DB
     * 3. Giá trị mặc định 10%
     */
    private BigDecimal resolvePharmacyRate(PharmacyOrder pharmacyOrder) {
        // Ưu tiên 1: tỷ lệ riêng của nhà thuốc (kiểm tra thời hạn)
        if (pharmacyOrder.getPharmacy() != null
                && pharmacyOrder.getPharmacy().getCustomCommissionRate() != null
                && pharmacyOrder.getPharmacy().getCustomCommissionRate().compareTo(BigDecimal.ZERO) > 0
                && isCustomRateValid(pharmacyOrder.getPharmacy().getCustomCommissionRateEffectiveFrom(),
                                     pharmacyOrder.getPharmacy().getCustomCommissionRateEffectiveTo())) {
            log.debug("Using custom commission rate {} for pharmacy {}",
                    pharmacyOrder.getPharmacy().getCustomCommissionRate(),
                    pharmacyOrder.getPharmacy().getPharmacyId());
            return pharmacyOrder.getPharmacy().getCustomCommissionRate();
        }

        // Ưu tiên 2: tra cứu DB
        return commissionConfigRepository.findByServiceTypeAndActiveTrue(SERVICE_PHARMACY_ORDER)
                .map(CommissionConfig::getCommissionRate)
                .orElseGet(() -> {
                    // Ưu tiên 3: fallback cứng
                    log.warn("No active CommissionConfig found for PHARMACY_ORDER, using default {}",
                            DEFAULT_PHARMACY_RATE);
                    return DEFAULT_PHARMACY_RATE;
                });
    }

    /**
     * Kiểm tra xem custom rate có còn hiệu lực không
     * @param effectiveFrom thời điểm bắt đầu (null = ngay lập tức)
     * @param effectiveTo thời điểm kết thúc (null = vĩnh viễn)
     * @return true nếu còn hiệu lực
     */
    private boolean isCustomRateValid(java.time.LocalDateTime effectiveFrom, java.time.LocalDateTime effectiveTo) {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        if (effectiveFrom != null && now.isBefore(effectiveFrom)) {
            return false; // Chưa đến thời điểm bắt đầu
        }
        if (effectiveTo != null && now.isAfter(effectiveTo)) {
            return false; // Đã hết hạn
        }
        return true;
    }
}
