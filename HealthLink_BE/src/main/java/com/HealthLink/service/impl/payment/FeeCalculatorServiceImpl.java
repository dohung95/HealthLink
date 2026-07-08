package com.HealthLink.service.impl.payment;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.CommissionConfig;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.HomeVisitDetails;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.appointment.AppointmentHomeVisitServiceRepository;
import com.HealthLink.repository.payment.PaymentCommissionConfigRepository;
import com.HealthLink.service.payment.FeeCalculatorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
            "video", "audio", "chat", "Online", "ONLINE", "Consultation", "CONSULTATION"
    );

    // ── ServiceType keys tra bảng CommissionConfigs ──────────────────────────
    private static final String SERVICE_CONSULTATION_ONLINE       = "CONSULTATION_ONLINE";
    private static final String SERVICE_CONSULTATION_OFFLINE      = "CONSULTATION_OFFLINE";
    private static final String SERVICE_CONSULTATION_HOME_VISIT   = "CONSULTATION_HOME_VISIT";
    private static final String SERVICE_PHARMACY_ORDER            = "PHARMACY_ORDER";

    // ── Tỷ lệ mặc định (fallback nếu DB chưa có cấu hình) ───────────────────
    private static final Set<String> HOME_VISIT_TYPES = Set.of(
            "HomeVisit", "HOME_VISIT", "homevisit", "Offline", "OFFLINE", "offline"
    );

    private String normalizeConsultationType(String type) {
        if (type == null || type.isBlank()) return "Online";
        String t = type.trim().toLowerCase();
        if (ONLINE_TYPES.contains(type)) return "Online";
        if (HOME_VISIT_TYPES.contains(type)) return "HomeVisit";
        if (t.equals("homevisit") || t.equals("home visit") || t.equals("home-visit") || t.equals("home")
                || t.equals("offline") || t.equals("in-person") || t.equals("in person")) return "HomeVisit";
        return "Online";
    }

    private static final BigDecimal DEFAULT_ONLINE_RATE   = new BigDecimal("0.1500");
    private static final BigDecimal DEFAULT_OFFLINE_RATE  = new BigDecimal("0.1000");
    private static final BigDecimal DEFAULT_HOME_VISIT_RATE   = new BigDecimal("0.1000");
    private static final BigDecimal DEFAULT_PHARMACY_RATE     = new BigDecimal("0.1000");

    private final PaymentCommissionConfigRepository commissionConfigRepository;
    private final AppointmentHomeVisitServiceRepository appointmentHomeVisitServiceRepository;

    // Phí home-visit cơ bản (KHÔNG dùng HomeVisitDetails.homeVisitFee — field đó đang bị
    // AppointmentServiceImpl.buildHomeVisitDetails() gán nhầm bằng phí khám của bác sĩ
    // thay vì phí home-visit cơ bản thật). Đọc thẳng từ config, giống HomeVisitLocationService.
    @Value("${home-visit.base-fee:10.00}")
    private BigDecimal homeVisitBaseFee;

    // ========================================================================
    // Tính phí cho Bác sĩ (Consultation)
    // ========================================================================

    @Override
    public FeeResult calculateConsultationFee(Appointment appointment) {
        // Xác định loại hình tư vấn: ONLINE, HOME_VISIT hay OFFLINE
        String consultationType = appointment.getConsultationType();
        String normalizedType = normalizeConsultationType(consultationType);
        boolean isOnline = "Online".equalsIgnoreCase(normalizedType);
        boolean isHomeVisit = "HomeVisit".equalsIgnoreCase(normalizedType);
        String serviceType = isOnline
                ? SERVICE_CONSULTATION_ONLINE
                : isHomeVisit
                ? SERVICE_CONSULTATION_HOME_VISIT
                : SERVICE_CONSULTATION_OFFLINE;

        // Chỉ phần phí khám gốc + tiền dịch vụ home-visit phụ mới bị chia hoa hồng.
        // Phí di chuyển home-visit (base fee + travelFee) cho bác sĩ hưởng 100%, không qua rate.
        // Phí tự chọn bác sĩ (manualSelectionFee) hoàn toàn không xuất hiện ở đây — mặc định
        // thuộc về hệ thống (không tính vào commissionableAmount lẫn travelTotal).
        Doctor doctor = appointment.getDoctor();
        BigDecimal baseConsultationFee = (doctor != null && doctor.getConsultationFee() != null)
                ? doctor.getConsultationFee()
                : BigDecimal.ZERO;

        BigDecimal travelTotal = BigDecimal.ZERO;
        BigDecimal servicesTotal = BigDecimal.ZERO;

        if (isHomeVisit) {
            // Home visit: phí khám tính x1.5 (consultationFee x1.5), khớp với
            // FinanceServiceImpl.resolveAppointmentCheckoutAmount() lúc tính tiền charge.
            baseConsultationFee = baseConsultationFee.multiply(BigDecimal.valueOf(1.5));

            HomeVisitDetails details = appointment.getHomeVisitDetails();
            BigDecimal extraTravelFee = (details != null && details.getTravelFee() != null)
                    ? details.getTravelFee()
                    : BigDecimal.ZERO;
            travelTotal = homeVisitBaseFee.add(extraTravelFee).setScale(2, RoundingMode.HALF_UP);

            BigDecimal sum = appointmentHomeVisitServiceRepository
                    .sumPriceByAppointmentId(appointment.getAppointmentId());
            servicesTotal = (sum != null ? sum : BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal commissionableAmount = baseConsultationFee.add(servicesTotal);

        if (commissionableAmount.compareTo(BigDecimal.ZERO) == 0
                && travelTotal.compareTo(BigDecimal.ZERO) == 0) {
            log.warn("Consultation fee is zero for appointment {}, no commission calculated",
                    appointment.getAppointmentId());
            return new FeeResult(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, serviceType);
        }

        // Xác định tỷ lệ chiết khấu theo thứ tự ưu tiên
        BigDecimal rate = resolveConsultationRate(doctor, serviceType, isOnline);

        // Công thức: PlatformFee = (Khám + Dịch vụ phụ) × Rate;
        //            DoctorEarning = (Khám + Dịch vụ phụ) - PlatformFee + TravelTotal (100%)
        BigDecimal platformFee = commissionableAmount
                .multiply(rate)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal partnerEarning = commissionableAmount.subtract(platformFee).add(travelTotal);

        log.debug("Consultation fee calculated: baseFee={}, servicesTotal={}, travelTotal={}, rate={}, "
                        + "platformFee={}, doctorEarning={}",
                baseConsultationFee, servicesTotal, travelTotal, rate, platformFee, partnerEarning);

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
                if (doctor.getCustomCommissionRateOnline() != null
                        && doctor.getCustomCommissionRateOnline().compareTo(BigDecimal.ZERO) > 0
                        && isCustomRateValid(doctor.getCustomCommissionRateOnlineEffectiveFrom(),
                                             doctor.getCustomCommissionRateOnlineEffectiveTo())) {
                    log.debug("Using custom ONLINE commission rate {} for doctor {}",
                            doctor.getCustomCommissionRateOnline(), doctor.getDoctorId());
                    return doctor.getCustomCommissionRateOnline();
                }
            } else {
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

        return commissionConfigRepository.findByServiceTypeAndActiveTrue(serviceType)
                .map(CommissionConfig::getCommissionRate)
                .orElseGet(() -> {
                    BigDecimal defaultRate = isOnline ? DEFAULT_ONLINE_RATE
                            : SERVICE_CONSULTATION_HOME_VISIT.equals(serviceType) ? DEFAULT_HOME_VISIT_RATE
                            : DEFAULT_OFFLINE_RATE;
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
