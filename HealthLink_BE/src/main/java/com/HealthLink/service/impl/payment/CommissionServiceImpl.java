package com.HealthLink.service.impl.payment;

import com.HealthLink.dto.payment.CommissionTransactionResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.CommissionTransaction;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Invoice;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.payment.PaymentCommissionTransactionRepository;
import com.HealthLink.repository.payment.InvoiceRepository;
import com.HealthLink.repository.payment.PaymentRepository;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
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
    private final PaymentCommissionTransactionRepository   commissionTransactionRepository;
    private final InvoiceRepository                 invoiceRepository;
    private final PharmacyOrderRepository           pharmacyOrderRepository;
    private final DoctorRepository                  doctorRepository;
    private final PharmacyRepository                pharmacyRepository;
    private final PrescriptionHeaderRepository      prescriptionHeaderRepository;

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
    // Xử lý Hoàn tiền (Refund)
    // ========================================================================

    /**
     * Khi Payment → REFUNDED:
     * 1. Tìm Invoice theo invoiceId.
     * 2. Lấy tất cả CommissionTransaction liên quan (theo appointmentId + pharmacyOrderId).
     * 3. Với mỗi giao dịch chưa bị REFUNDED:
     *    a. Cập nhật status → REFUNDED.
     *    b. Trừ netAmount khỏi pendingSettlement của đối tác (Doctor hoặc Pharmacy).
     */
    @Override
    @Transactional
    public void processRefund(Integer invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new BadRequestException("Invoice not found: " + invoiceId));

        Appointment appointment = invoice.getAppointment();
        if (appointment == null) {
            log.warn("Invoice {} has no appointment – skipping commission refund", invoiceId);
            return;
        }

        // --- 1. Hoàn tiền commission cho Bác sĩ ---
        List<CommissionTransaction> doctorTxs = commissionTransactionRepository
                .findByAppointmentId(appointment.getAppointmentId());
        for (CommissionTransaction tx : doctorTxs) {
            if ("REFUNDED".equals(tx.getStatus())) continue;  // idempotency

            String previousStatus = tx.getStatus();
            tx.setStatus("REFUNDED");
            commissionTransactionRepository.save(tx);

            // Trừ lại netAmount khỏi pendingSettlement của Doctor
            Doctor doctor = doctorRepository.findById(tx.getRecipientId()).orElse(null);
            if (doctor != null) {
                BigDecimal currentPending = doctor.getPendingSettlement() != null
                        ? doctor.getPendingSettlement() : BigDecimal.ZERO;
                BigDecimal reversed = currentPending.subtract(tx.getNetAmount())
                        .max(BigDecimal.ZERO);   // không để âm
                doctor.setPendingSettlement(reversed);
                doctorRepository.save(doctor);
                log.info("Refund: doctor {} pendingSettlement reduced by {} (tx={}, prev={})",
                        doctor.getDoctorId(), tx.getNetAmount(), tx.getTransactionNumber(), previousStatus);
            }
        }

        // --- 2. Hoàn tiền commission cho Nhà thuốc ---
        // Tìm prescription headers của appointment, sau đó tìm pharmacy orders liên kết
        List<PrescriptionHeader> headers = prescriptionHeaderRepository
                .findByAppointment_AppointmentId(appointment.getAppointmentId());
        List<Integer> headerIds = headers.stream()
                .map(PrescriptionHeader::getPrescriptionHeaderId)
                .collect(Collectors.toList());

        List<PharmacyOrder> linkedOrders = pharmacyOrderRepository
                .findByPatient_PatientId(appointment.getPatient().getPatientId())
                .stream()
                .filter(o -> o.getPrescriptionHeader() != null
                        && headerIds.contains(o.getPrescriptionHeader().getPrescriptionHeaderId()))
                .collect(Collectors.toList());

        // Trực tiếp tìm commission transactions theo pharmacyOrderId
        for (PharmacyOrder order : linkedOrders) {
            List<CommissionTransaction> pharmacyTxs = commissionTransactionRepository
                    .findByPharmacyOrderId(order.getOrderId());
            for (CommissionTransaction tx : pharmacyTxs) {
                if ("REFUNDED".equals(tx.getStatus())) continue;  // idempotency

                String previousStatus = tx.getStatus();
                tx.setStatus("REFUNDED");
                commissionTransactionRepository.save(tx);

                // Trừ lại netAmount khỏi pendingSettlement của Pharmacy
                Pharmacy pharmacy = pharmacyRepository.findById(tx.getRecipientId()).orElse(null);
                if (pharmacy != null) {
                    BigDecimal currentPending = pharmacy.getPendingSettlement() != null
                            ? pharmacy.getPendingSettlement() : BigDecimal.ZERO;
                    BigDecimal reversed = currentPending.subtract(tx.getNetAmount())
                            .max(BigDecimal.ZERO);
                    pharmacy.setPendingSettlement(reversed);
                    pharmacyRepository.save(pharmacy);
                    log.info("Refund: pharmacy {} pendingSettlement reduced by {} (tx={}, prev={})",
                            pharmacy.getPharmacyId(), tx.getNetAmount(), tx.getTransactionNumber(), previousStatus);
                }
            }
        }

        log.info("Refund processing complete for invoice {}", invoiceId);
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
