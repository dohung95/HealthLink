package com.HealthLink.service.impl.payment;

import com.HealthLink.dto.payment.CommissionTransactionResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.CommissionTransaction;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Invoice;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.payment.CommissionTransactionRepository;
import com.HealthLink.repository.payment.InvoiceRepository;
import com.HealthLink.repository.payment.PaymentRepository;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.service.payment.CommissionService;
import com.HealthLink.service.payment.FeeCalculatorService;
import com.HealthLink.service.payment.FeeCalculatorService.FeeResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Cài đặt của {@link CommissionService}.
 *
 * <p>Luồng xử lý sau khi thanh toán thành công:
 * <ol>
 *   <li>Gọi {@link FeeCalculatorService} để tính platformFee, partnerEarning, rate.</li>
 *   <li>Tạo bản ghi {@link CommissionTransaction} để lưu vết chi tiết.</li>
 *   <li>Cộng dồn netAmount vào {@code totalEarnings} và {@code pendingSettlement} của đối tác.</li>
 *   <li>Ghi snapshot {@code platformFee}, {@code commissionRate} vào Invoice/PharmacyOrder.</li>
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CommissionServiceImpl implements CommissionService {

    // ── Hằng trạng thái ──────────────────────────────────────────────────────
    private static final String TX_STATUS_PENDING  = "PENDING";
    private static final String RECIPIENT_DOCTOR   = "DOCTOR";
    private static final String RECIPIENT_PHARMACY = "PHARMACY";
    private static final String SOURCE_APPOINTMENT = "APPOINTMENT";
    private static final String SOURCE_ORDER       = "PHARMACY_ORDER";

    // ── Phụ thuộc ─────────────────────────────────────────────────────────────
    private final FeeCalculatorService              feeCalculatorService;
    private final CommissionTransactionRepository   commissionTransactionRepository;
    private final InvoiceRepository                 invoiceRepository;
    private final PharmacyOrderRepository           pharmacyOrderRepository;
    private final DoctorRepository                  doctorRepository;
    private final PharmacyRepository                pharmacyRepository;

    // ========================================================================
    // Xử lý commission cho Bác sĩ
    // ========================================================================

    @Override
    @Transactional
    public void processConsultationCommission(Invoice invoice) {
        Appointment appointment = invoice.getAppointment();
        if (appointment == null) {
            log.error("Invoice {} has no appointment linked – cannot process commission",
                    invoice.getInvoiceId());
            return;
        }

        Doctor doctor = appointment.getDoctor();
        if (doctor == null) {
            log.error("Appointment {} has no doctor linked – cannot process commission",
                    appointment.getAppointmentId());
            return;
        }

        // Kiểm tra idempotency: tránh xử lý trùng
        if (commissionTransactionRepository.existsByAppointmentIdAndRecipientType(
                appointment.getAppointmentId(), RECIPIENT_DOCTOR)) {
            log.warn("Commission for appointment {} already processed, skipping",
                    appointment.getAppointmentId());
            return;
        }

        // 1. Tính phí chiết khấu
        FeeResult result = feeCalculatorService.calculateConsultationFee(appointment);

        // 2. Tạo bản ghi CommissionTransaction
        String txNumber = generateTransactionNumber();
        CommissionTransaction tx = CommissionTransaction.builder()
                .transactionNumber(txNumber)
                .sourceType(SOURCE_APPOINTMENT)
                .appointmentId(appointment.getAppointmentId())
                .recipientType(RECIPIENT_DOCTOR)
                .recipientId(doctor.getDoctorId())
                .recipientName(doctor.getFullName())
                .serviceType(result.serviceType())
                .grossAmount(invoice.getConsultationFee() != null
                        ? invoice.getConsultationFee() : BigDecimal.ZERO)
                .commissionRate(result.commissionRate())
                .commissionAmount(result.platformFee())
                .netAmount(result.partnerEarning())
                .status(TX_STATUS_PENDING)
                .build();
        commissionTransactionRepository.save(tx);

        // 3. Cộng dồn thu nhập vào Doctor
        BigDecimal currentEarnings = doctor.getTotalEarnings() != null
                ? doctor.getTotalEarnings() : BigDecimal.ZERO;
        BigDecimal currentPending = doctor.getPendingSettlement() != null
                ? doctor.getPendingSettlement() : BigDecimal.ZERO;

        doctor.setTotalEarnings(currentEarnings.add(result.partnerEarning()));
        doctor.setPendingSettlement(currentPending.add(result.partnerEarning()));
        doctorRepository.save(doctor);

        // 4. Ghi snapshot vào Invoice
        invoice.setPlatformFee(result.platformFee());
        invoice.setDoctorEarning(result.partnerEarning());
        invoice.setCommissionRate(result.commissionRate());
        invoiceRepository.save(invoice);

        log.info("Commission processed for appointment {} – doctor={}, txNumber={}, " +
                        "platformFee={}, doctorEarning={}",
                appointment.getAppointmentId(), doctor.getDoctorId(), txNumber,
                result.platformFee(), result.partnerEarning());
    }

    // ========================================================================
    // Xử lý commission cho Nhà thuốc
    // ========================================================================

    @Override
    @Transactional
    public void processPharmacyOrderCommission(PharmacyOrder pharmacyOrder) {
        Pharmacy pharmacy = pharmacyOrder.getPharmacy();
        if (pharmacy == null) {
            log.error("PharmacyOrder {} has no pharmacy linked – cannot process commission",
                    pharmacyOrder.getOrderId());
            return;
        }

        // Kiểm tra idempotency: tránh xử lý trùng
        if (commissionTransactionRepository.existsByPharmacyOrderIdAndRecipientType(
                pharmacyOrder.getOrderId(), RECIPIENT_PHARMACY)) {
            log.warn("Commission for pharmacy order {} already processed, skipping",
                    pharmacyOrder.getOrderId());
            return;
        }

        // 1. Tính phí chiết khấu
        FeeResult result = feeCalculatorService.calculatePharmacyOrderFee(pharmacyOrder);

        // 2. Tạo bản ghi CommissionTransaction
        String txNumber = generateTransactionNumber();
        CommissionTransaction tx = CommissionTransaction.builder()
                .transactionNumber(txNumber)
                .sourceType(SOURCE_ORDER)
                .pharmacyOrderId(pharmacyOrder.getOrderId())
                .recipientType(RECIPIENT_PHARMACY)
                .recipientId(pharmacy.getPharmacyId())
                .recipientName(pharmacy.getName())
                .serviceType(result.serviceType())
                .grossAmount(pharmacyOrder.getMedicineAmount() != null
                        ? pharmacyOrder.getMedicineAmount() : BigDecimal.ZERO)
                .commissionRate(result.commissionRate())
                .commissionAmount(result.platformFee())
                .netAmount(result.partnerEarning())
                .status(TX_STATUS_PENDING)
                .build();
        commissionTransactionRepository.save(tx);

        // 3. Cộng dồn thu nhập vào Pharmacy
        BigDecimal currentEarnings = pharmacy.getTotalEarnings() != null
                ? pharmacy.getTotalEarnings() : BigDecimal.ZERO;
        BigDecimal currentPending = pharmacy.getPendingSettlement() != null
                ? pharmacy.getPendingSettlement() : BigDecimal.ZERO;

        pharmacy.setTotalEarnings(currentEarnings.add(result.partnerEarning()));
        pharmacy.setPendingSettlement(currentPending.add(result.partnerEarning()));
        pharmacyRepository.save(pharmacy);

        // 4. Ghi snapshot vào PharmacyOrder
        pharmacyOrder.setPlatformFee(result.platformFee());
        pharmacyOrder.setPharmacyEarning(result.partnerEarning());
        pharmacyOrder.setCommissionRate(result.commissionRate());
        pharmacyOrderRepository.save(pharmacyOrder);

        log.info("Commission processed for pharmacy order {} – pharmacy={}, txNumber={}, " +
                        "platformFee={}, pharmacyEarning={}",
                pharmacyOrder.getOrderId(), pharmacy.getPharmacyId(), txNumber,
                result.platformFee(), result.partnerEarning());
    }

    // ========================================================================
    // Truy vấn lịch sử giao dịch
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<CommissionTransactionResponse> getTransactionsByRecipient(String recipientId) {
        return commissionTransactionRepository
                .findByRecipientIdOrderByCreatedAtDesc(recipientId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ========================================================================
    // Private helpers
    // ========================================================================

    /**
     * Sinh số giao dịch theo định dạng CTX-YYYYMM-XXXXX.
     * Dùng ngày giờ hiện tại + số thứ tự dựa trên tổng số bản ghi trong DB.
     */
    private String generateTransactionNumber() {
        String datePart = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMM"));
        long count = commissionTransactionRepository.count() + 1;
        return String.format("CTX-%s-%05d", datePart, count);
    }

    /** Ánh xạ CommissionTransaction → CommissionTransactionResponse. */
    private CommissionTransactionResponse toResponse(CommissionTransaction tx) {
        return CommissionTransactionResponse.builder()
                .transactionId(tx.getTransactionId())
                .transactionNumber(tx.getTransactionNumber())
                .sourceType(tx.getSourceType())
                .appointmentId(tx.getAppointmentId())
                .pharmacyOrderId(tx.getPharmacyOrderId())
                .recipientType(tx.getRecipientType())
                .recipientId(tx.getRecipientId())
                .recipientName(tx.getRecipientName())
                .serviceType(tx.getServiceType())
                .grossAmount(tx.getGrossAmount())
                .commissionRate(tx.getCommissionRate())
                .commissionAmount(tx.getCommissionAmount())
                .netAmount(tx.getNetAmount())
                .status(tx.getStatus())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}
