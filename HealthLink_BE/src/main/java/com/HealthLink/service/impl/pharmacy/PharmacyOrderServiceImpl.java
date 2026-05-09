package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.dto.pharmacy.PharmacyOrderStatusRequest;
import com.HealthLink.entity.*;
import com.HealthLink.exception.InvalidStatusException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.pharmacy.PharmacyOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PharmacyOrderServiceImpl implements PharmacyOrderService {

    // ── Status constants ──────────────────────────────────────────────────────
    private static final String STATUS_PENDING   = "Pending";
    private static final String STATUS_CONFIRMED = "Confirmed";
    private static final String STATUS_PREPARING = "Preparing";
    private static final String STATUS_READY     = "Ready";
    private static final String STATUS_SHIPPING  = "Shipping";
    private static final String STATUS_DELIVERED = "Delivered";
    private static final String STATUS_COMPLETED = "Completed";
    private static final String STATUS_CANCELLED = "Cancelled";
    private static final String STATUS_REFUNDED  = "Refunded";

    // PrescriptionHeader status
    private static final String PRESCRIPTION_STATUS_SENT = "Sent";

    // ── Allowed next-status map (luồng hợp lệ) ───────────────────────────────
    // Pending → Confirmed / Cancelled
    // Confirmed → Preparing / Cancelled
    // Preparing → Ready / Cancelled
    // Ready → Shipping (Delivery) or Delivered (Pickup) / Cancelled
    // Shipping → Delivered
    // Delivered → Completed
    // Terminal states: Completed, Cancelled, Refunded
    private static final java.util.Map<String, Set<String>> ALLOWED_TRANSITIONS =
        java.util.Map.of(
            STATUS_PENDING,   Set.of(STATUS_CONFIRMED, STATUS_CANCELLED),
            STATUS_CONFIRMED, Set.of(STATUS_PREPARING, STATUS_CANCELLED),
            STATUS_PREPARING, Set.of(STATUS_READY,     STATUS_CANCELLED),
            STATUS_READY,     Set.of(STATUS_SHIPPING,  STATUS_DELIVERED, STATUS_CANCELLED),
            STATUS_SHIPPING,  Set.of(STATUS_DELIVERED),
            STATUS_DELIVERED, Set.of(STATUS_COMPLETED),
            STATUS_COMPLETED, Set.of(),
            STATUS_CANCELLED, Set.of(STATUS_REFUNDED),
            STATUS_REFUNDED,  Set.of()
        );

    private final PharmacyOrderRepository orderRepository;
    private final PharmacyRepository pharmacyRepository;
    private final PrescriptionHeaderRepository prescriptionHeaderRepository;

    // =========================================================================
    // Task 2.1 & 2.3 – Chuyển đơn, tạo PharmacyOrder
    // =========================================================================
    @Override
    @Transactional
    public PharmacyOrderResponse transferPrescription(PharmacyOrderRequest request) {

        // 1. Tìm PrescriptionHeader
        PrescriptionHeader prescription = prescriptionHeaderRepository
                .findById(request.getPrescriptionHeaderId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "PrescriptionHeader", "id", request.getPrescriptionHeaderId()));

        // 2. Tìm Pharmacy
        Pharmacy pharmacy = pharmacyRepository
                .findById(request.getPharmacyId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Pharmacy", "id", request.getPharmacyId()));

        // 3. Lấy Patient từ PrescriptionHeader
        Patient patient = prescription.getPatient();

        // 4. Lấy medicineAmount từ PrescriptionHeader.totalAmount
        BigDecimal medicineAmount = prescription.getTotalAmount() != null
                ? prescription.getTotalAmount()
                : BigDecimal.ZERO;

        // 5. Lấy deliveryFee từ Pharmacy
        BigDecimal deliveryFee = pharmacy.getDeliveryFee() != null
                ? pharmacy.getDeliveryFee()
                : BigDecimal.ZERO;

        // 6. Tính totalAmount
        BigDecimal totalAmount = medicineAmount.add(deliveryFee);

        // 7. Tự động điền deliveryAddress từ Patient nếu request không truyền
        String deliveryAddress = request.getDeliveryAddress();
        Double deliveryLat    = request.getDeliveryLatitude();
        Double deliveryLon    = request.getDeliveryLongitude();

        if (deliveryAddress == null || deliveryAddress.isBlank()) {
            deliveryAddress = buildPatientAddress(patient);
            deliveryLat     = patient.getLatitude();
            deliveryLon     = patient.getLongitude();
        }

        // 8. Sinh orderNumber unique: ORD-YYYYMMDD-XXXX
        String orderNumber = generateOrderNumber();

        // 9. Xây dựng PharmacyOrder
        PharmacyOrder order = PharmacyOrder.builder()
                .orderNumber(orderNumber)
                .prescriptionHeader(prescription)
                .pharmacy(pharmacy)
                .patient(patient)
                .status(STATUS_PENDING)
                .deliveryType(request.getDeliveryType() != null ? request.getDeliveryType() : "Delivery")
                .deliveryAddress(deliveryAddress)
                .deliveryLatitude(deliveryLat)
                .deliveryLongitude(deliveryLon)
                .deliveryFee(deliveryFee)
                .medicineAmount(medicineAmount)
                .totalAmount(totalAmount)
                .paymentStatus("Pending")
                .paymentMethod(request.getPaymentMethod())
                .notes(request.getNotes())
                .createdAt(LocalDateTime.now())
                .build();

        PharmacyOrder saved = orderRepository.save(order);

        // 10. Cập nhật trạng thái PrescriptionHeader → Sent
        prescription.setStatus(PRESCRIPTION_STATUS_SENT);
        prescriptionHeaderRepository.save(prescription);

        return toResponse(saved);
    }

    // =========================================================================
    // Task 2.2 – Cập nhật trạng thái đơn hàng (dược sĩ)
    // =========================================================================
    @Override
    @Transactional
    public PharmacyOrderResponse updateOrderStatus(Integer orderId, PharmacyOrderStatusRequest request) {

        PharmacyOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("PharmacyOrder", "id", orderId));

        String currentStatus = order.getStatus();
        String targetStatus  = request.getStatus();

        // Kiểm tra luồng trạng thái hợp lệ
        Set<String> allowed = ALLOWED_TRANSITIONS.getOrDefault(currentStatus, Set.of());
        if (!allowed.contains(targetStatus)) {
            throw new InvalidStatusException(currentStatus, targetStatus);
        }

        // Ghi nhận thời điểm tương ứng
        LocalDateTime now = LocalDateTime.now();
        switch (targetStatus) {
            case STATUS_CONFIRMED -> order.setConfirmedAt(now);
            case STATUS_PREPARING -> order.setPreparingAt(now);
            case STATUS_SHIPPING  -> {
                order.setShippedAt(now);
                if (request.getEstimatedDeliveryTime() != null) {
                    order.setEstimatedDeliveryTime(request.getEstimatedDeliveryTime());
                }
            }
            case STATUS_DELIVERED -> {
                order.setDeliveredAt(now);
                order.setActualDeliveryTime(now);
            }
            case STATUS_CANCELLED -> {
                order.setCancelledAt(now);
                order.setCancelReason(request.getCancelReason());
                order.setCancelledBy(request.getCancelledBy() != null
                        ? request.getCancelledBy() : "Pharmacy");
            }
        }

        // Cập nhật ghi chú dược sĩ (nếu có)
        if (request.getPharmacistNotes() != null) {
            order.setPharmacistNotes(request.getPharmacistNotes());
        }

        order.setStatus(targetStatus);
        PharmacyOrder updated = orderRepository.save(order);

        return toResponse(updated);
    }

    // =========================================================================
    // Queries
    // =========================================================================
    @Override
    @Transactional(readOnly = true)
    public List<PharmacyOrderResponse> getOrdersByPharmacy(String pharmacyId, String status) {
        List<PharmacyOrder> orders = (status != null && !status.isBlank())
                ? orderRepository.findByPharmacy_PharmacyIdAndStatus(pharmacyId, status)
                : orderRepository.findByPharmacy_PharmacyId(pharmacyId);

        return orders.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PharmacyOrderResponse> getOrdersByPatient(String patientId) {
        return orderRepository.findByPatient_PatientId(patientId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PharmacyOrderResponse getOrderById(Integer orderId) {
        PharmacyOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("PharmacyOrder", "id", orderId));
        return toResponse(order);
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    /**
     * Ghép địa chỉ đầy đủ từ Patient (address + city + country).
     */
    private String buildPatientAddress(Patient patient) {
        StringBuilder sb = new StringBuilder();
        if (patient.getAddress() != null) sb.append(patient.getAddress());
        if (patient.getCity()    != null) { if (!sb.isEmpty()) sb.append(", "); sb.append(patient.getCity()); }
        if (patient.getCountry() != null) { if (!sb.isEmpty()) sb.append(", "); sb.append(patient.getCountry()); }
        return sb.toString();
    }

    /**
     * Sinh orderNumber dạng ORD-YYYYMMDD-XXXX (4 chữ số ngẫu nhiên,
     * kiểm tra uniqueness).
     */
    private String generateOrderNumber() {
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String orderNumber;
        int attempt = 0;
        do {
            // Random 4 chữ số (0000-9999)
            int seq = (int) (Math.random() * 10_000);
            orderNumber = String.format("ORD-%s-%04d", dateStr, seq);
            attempt++;
            if (attempt > 100) {
                // Fallback dùng timestamp millis nếu quá nhiều xung đột
                orderNumber = "ORD-" + dateStr + "-" + System.currentTimeMillis() % 10000;
                break;
            }
        } while (orderRepository.existsByOrderNumber(orderNumber));

        return orderNumber;
    }

    /**
     * Map PharmacyOrder entity → PharmacyOrderResponse DTO.
     */
    private PharmacyOrderResponse toResponse(PharmacyOrder o) {
        PrescriptionHeader ph = o.getPrescriptionHeader();
        Pharmacy           pha = o.getPharmacy();
        Patient            pat = o.getPatient();

        return PharmacyOrderResponse.builder()
                .orderId(o.getOrderId())
                .orderNumber(o.getOrderNumber())
                // Prescription
                .prescriptionHeaderId(ph != null ? ph.getPrescriptionHeaderId() : null)
                .diagnosis(ph != null ? ph.getDiagnosis() : null)
                // Pharmacy
                .pharmacyId(pha != null ? pha.getPharmacyId() : null)
                .pharmacyName(pha != null ? pha.getName() : null)
                .pharmacyPhone(pha != null ? pha.getPhoneNumber() : null)
                // Patient
                .patientId(pat != null ? pat.getPatientId() : null)
                .patientName(pat != null ? pat.getFullName() : null)
                // Order details
                .status(o.getStatus())
                .deliveryType(o.getDeliveryType())
                .deliveryAddress(o.getDeliveryAddress())
                .deliveryLatitude(o.getDeliveryLatitude())
                .deliveryLongitude(o.getDeliveryLongitude())
                // Amounts
                .medicineAmount(o.getMedicineAmount())
                .deliveryFee(o.getDeliveryFee())
                .totalAmount(o.getTotalAmount())
                // Payment
                .paymentStatus(o.getPaymentStatus())
                .paymentMethod(o.getPaymentMethod())
                // Notes
                .notes(o.getNotes())
                .pharmacistNotes(o.getPharmacistNotes())
                // Timestamps
                .estimatedDeliveryTime(o.getEstimatedDeliveryTime())
                .actualDeliveryTime(o.getActualDeliveryTime())
                .confirmedAt(o.getConfirmedAt())
                .preparingAt(o.getPreparingAt())
                .shippedAt(o.getShippedAt())
                .deliveredAt(o.getDeliveredAt())
                .cancelledAt(o.getCancelledAt())
                .cancelReason(o.getCancelReason())
                .createdAt(o.getCreatedAt())
                .build();
    }
}
