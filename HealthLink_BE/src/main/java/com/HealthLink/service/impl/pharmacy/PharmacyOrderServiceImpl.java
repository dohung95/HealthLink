package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.dto.pharmacy.PharmacyOrderStatusRequest;
import com.HealthLink.entity.*;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.exception.InvalidStatusException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.notification.DeviceTokenRepository;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.pharmacy.PharmacyOrderService;
import com.HealthLink.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
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
    private final NotificationService notificationService;
    private final DeviceTokenRepository deviceTokenRepository;

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

        notifyPharmacyAboutNewOrderAfterCommit(saved);

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

        if (Objects.equals(currentStatus, targetStatus)) {
            log.info("Skipping order status update notification because status is unchanged: orderId={}, status={}",
                    orderId, currentStatus);
            return toResponse(order);
        }

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

        notifyPatientAboutOrderStatusAfterCommit(updated, currentStatus, targetStatus);

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

    private void notifyPharmacyAboutNewOrderAfterCommit(PharmacyOrder order) {
        User pharmacyUser = resolvePharmacyUser(order, NotificationType.NEW_ORDER);
        if (pharmacyUser == null) {
            return;
        }

        String orderNumber = safeValue(order.getOrderNumber(), "unknown order");
        String patientName = order.getPatient() != null
                ? safeValue(order.getPatient().getFullName(), "Unknown patient")
                : "Unknown patient";
        Integer orderId = order.getOrderId();
        Integer prescriptionHeaderId = order.getPrescriptionHeader() != null
                ? order.getPrescriptionHeader().getPrescriptionHeaderId()
                : null;
        String actionUrl = "/pharmacy-orders/" + orderId;
        String title = "New pharmacy order";
        String message = String.format(
                "Order %s for %s was transferred from prescription %s.",
                orderNumber,
                patientName,
                prescriptionHeaderId != null ? prescriptionHeaderId : "unknown"
        );

        runAfterCommit("new pharmacy order notification orderId=" + orderId, () -> {
            notificationService.sendWebSocketNotification(
                    pharmacyUser,
                    NotificationType.NEW_ORDER,
                    title,
                    message,
                    orderId,
                    actionUrl
            );
            log.info("New order notification queued for pharmacyUserId={}, orderId={}",
                    pharmacyUser.getId(), orderId);
        });
    }

    private void notifyPatientAboutOrderStatusAfterCommit(PharmacyOrder order, String oldStatus, String newStatus) {
        User patientUser = resolvePatientUser(order, NotificationType.ORDER_STATUS);
        if (patientUser == null) {
            return;
        }

        String orderNumber = safeValue(order.getOrderNumber(), "unknown order");
        Integer orderId = order.getOrderId();
        String actionUrl = "/pharmacy-orders/" + orderId;
        String title = "Order status updated";
        String message = String.format(
                "Order %s changed from %s to %s.",
                orderNumber,
                safeValue(oldStatus, "unknown"),
                safeValue(newStatus, "unknown")
        );
        boolean hasActiveMobileToken = !deviceTokenRepository
                .findByUser_IdAndActiveTrue(patientUser.getId())
                .isEmpty();

        runAfterCommit("order status notification orderId=" + orderId, () -> {
            notificationService.sendWebSocketNotification(
                    patientUser,
                    NotificationType.ORDER_STATUS,
                    title,
                    message,
                    orderId,
                    actionUrl
            );

            if (hasActiveMobileToken) {
                notificationService.sendMobilePushNotification(
                        patientUser,
                        NotificationType.ORDER_STATUS,
                        title,
                        message,
                        NotificationPriority.NORMAL,
                        orderId,
                        actionUrl
                );
            }

            log.info("Order status notification queued for patientUserId={}, orderId={}, oldStatus={}, newStatus={}, mobilePush={}",
                    patientUser.getId(), orderId, oldStatus, newStatus, hasActiveMobileToken);
        });
    }

    private User resolvePharmacyUser(PharmacyOrder order, NotificationType type) {
        if (order == null || order.getPharmacy() == null) {
            log.warn("Cannot send {} notification: order or pharmacy is missing", type);
            return null;
        }

        User user = order.getPharmacy().getUser();
        if (user == null || user.getId() == null || user.getId().isBlank()) {
            log.warn("Cannot send {} notification: pharmacyId={} is not mapped to a user",
                    type, order.getPharmacy().getPharmacyId());
            return null;
        }
        return user;
    }

    private User resolvePatientUser(PharmacyOrder order, NotificationType type) {
        if (order == null || order.getPatient() == null) {
            log.warn("Cannot send {} notification: order or patient is missing", type);
            return null;
        }

        User user = order.getPatient().getUser();
        if (user == null || user.getId() == null || user.getId().isBlank()) {
            log.warn("Cannot send {} notification: patientId={} is not mapped to a user",
                    type, order.getPatient().getPatientId());
            return null;
        }
        return user;
    }

    private void runAfterCommit(String context, Runnable task) {
        Runnable safeTask = () -> {
            try {
                task.run();
            } catch (Exception ex) {
                log.error("Failed to send {} after commit: {}", context, ex.getMessage(), ex);
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    safeTask.run();
                }
            });
            return;
        }

        safeTask.run();
    }

    private String safeValue(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
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
                // Commission fields – ánh xạ từ PharmacyOrder entity
                // ⚠️ Controller phải lọc bỏ các trường này khi trả về cho Patient
                .platformFee(o.getPlatformFee())
                .pharmacyEarning(o.getPharmacyEarning())
                .commissionRate(o.getCommissionRate())
                .build();
    }
}
