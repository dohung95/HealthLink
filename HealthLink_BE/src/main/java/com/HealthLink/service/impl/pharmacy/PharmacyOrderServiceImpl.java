package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.CancelOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyConsultationOrderCreateRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderItemRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.dto.pharmacy.PharmacyOrderRevisionRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderStatusRequest;
import com.HealthLink.entity.*;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.entity.enums.PrescriptionTiming;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ForbiddenException;
import com.HealthLink.exception.InvalidStatusException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.medicine.MedicineRepository;
import com.HealthLink.repository.notification.DeviceTokenRepository;
import com.HealthLink.repository.pharmacy.PharmacyConsultationRequestRepository;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.audit.AuditLogger;
import com.HealthLink.service.impl.pharmacy.PharmacyServiceHelper;
import com.HealthLink.service.pharmacy.PharmacyOrderService;
import com.HealthLink.service.notification.NotificationService;
import com.HealthLink.utility.mapper.PharmacyOrderMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PharmacyOrderServiceImpl implements PharmacyOrderService {

    // ── Status constants ──────────────────────────────────────────────────────
    private static final String STATUS_PENDING   = "PENDING";
    private static final String STATUS_CONFIRMED = "CONFIRMED";
    private static final String STATUS_PREPARING = "PREPARING";
    private static final String STATUS_READY     = "READY";
    private static final String STATUS_SHIPPING  = "SHIPPING";
    private static final String STATUS_DELIVERED = "DELIVERED";
    private static final String STATUS_COMPLETED = "COMPLETED";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final String STATUS_REVISION_REQUESTED = "REVISION_REQUESTED";
    private static final String REQUEST_STATUS_ORDER_CREATED = "ORDER_CREATED";
    private static final String REQUEST_STATUS_CANCELLED = "CANCELLED";
    private static final String PAYMENT_STATUS_PENDING = "PENDING";
    private static final String PAYMENT_STATUS_PAID = "PAID";
    private static final String REQUEST_TYPE_CONSULTATION = "CONSULTATION";
    private static final String REQUEST_TYPE_ORDER_REQUEST = "ORDER_REQUEST";
    private static final String DELIVERY_TYPE_DELIVERY = "Delivery";
    private static final String DELIVERY_TYPE_PICKUP = "Pickup";
    // ── Commission constants ──────────────────────────────────────────────────
    private static final BigDecimal STANDARD_COMMISSION_RATE = new BigDecimal("0.1000");
    private static final BigDecimal PREMIUM_COMMISSION_RATE = new BigDecimal("0.0800");
    private static final BigDecimal VIP_COMMISSION_RATE = new BigDecimal("0.0500");

    // ── Allowed next-status map (luồng hợp lệ) ───────────────────────────────
    // Pending → Confirmed / Cancelled
    // Confirmed → Preparing / Cancelled
    // Preparing → Ready / Cancelled
    // Ready → Shipping (Delivery) or Delivered (Pickup) / Cancelled
    // Shipping → Delivered
    // Delivered → Completed
    // Terminal states: Completed, Cancelled
    private static final java.util.Map<String, Set<String>> ALLOWED_TRANSITIONS =
        java.util.Map.of(
            STATUS_PENDING,   Set.of(STATUS_CONFIRMED, STATUS_CANCELLED),
            STATUS_CONFIRMED, Set.of(STATUS_PREPARING, STATUS_CANCELLED),
            STATUS_PREPARING, Set.of(STATUS_READY,     STATUS_CANCELLED),
            STATUS_READY,     Set.of(STATUS_SHIPPING,  STATUS_DELIVERED, STATUS_CANCELLED),
            STATUS_SHIPPING,  Set.of(STATUS_DELIVERED),
            STATUS_DELIVERED, Set.of(STATUS_COMPLETED),
            STATUS_COMPLETED, Set.of(),
            STATUS_CANCELLED, Set.of()
        );

    private final PharmacyOrderRepository orderRepository;
    private final PharmacyConsultationRequestRepository consultationRequestRepository;
    private final PharmacyRepository pharmacyRepository;
    private final PrescriptionHeaderRepository prescriptionHeaderRepository;
    private final MedicineRepository medicineRepository;
    private final NotificationService notificationService;
    private final DeviceTokenRepository deviceTokenRepository;
    private final AuditLogger audit = AuditLogger.pharmacy();

    // =========================================================================
    // Patient creates a pharmacy order from an existing prescription
    // =========================================================================
    @Override
    @Transactional
    public PharmacyOrderResponse createOrderFromPrescription(PharmacyOrderRequest request, String patientId) {
        PrescriptionHeader prescription = prescriptionHeaderRepository
                .findById(request.getPrescriptionHeaderId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "PrescriptionHeader", "id", request.getPrescriptionHeaderId()));

        Patient patient = prescription.getPatient();
        validatePatientOwnsPrescription(patient, patientId);
        validatePrescriptionCanBeOrdered(prescription);
        checkNoExistingOrder(request.getPrescriptionHeaderId());

        Pharmacy pharmacy = pharmacyRepository
                .findById(request.getPharmacyId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Pharmacy", "id", request.getPharmacyId()));
        validatePharmacyCanReceiveOrders(pharmacy);

        List<PharmacyOrderItem> orderItems = buildOrderItemsFromPrescription(prescription);
        BigDecimal medicineAmount = calculateMedicineAmount(orderItems);

        String deliveryType = resolveDeliveryType(request, pharmacy);
        BigDecimal deliveryFee = BigDecimal.ZERO;

        String deliveryAddress = buildDeliveryAddress(request, patient);
        Double deliveryLat    = request.getDeliveryLatitude();
        Double deliveryLon    = request.getDeliveryLongitude();

        String deliveryPhoneNumber = PharmacyServiceHelper.firstNonBlank(
                request.getDeliveryPhoneNumber(),
                patient != null && patient.getUser() != null ? patient.getUser().getPhoneNumber() : null
        );
        String deliveryAddressSource = PharmacyServiceHelper.normalizeDeliveryAddressSource(request.getDeliveryAddressSource());

        if (DELIVERY_TYPE_DELIVERY.equals(deliveryType)) {
            if (!pharmacy.isDeliveryAvailable()) {
                throw new BadRequestException("Pharmacy does not support delivery");
            }

            if (deliveryAddress == null || deliveryAddress.isBlank()) {
                deliveryAddress = PharmacyServiceHelper.buildPatientAddress(patient);
                deliveryLat     = patient.getLatitude();
                deliveryLon     = patient.getLongitude();
            }

            if (deliveryAddress == null || deliveryAddress.isBlank()) {
                throw new BadRequestException("Delivery address is required for delivery orders");
            }

            validateDeliveryRadius(pharmacy, deliveryLat, deliveryLon);

            deliveryFee = pharmacy.getDeliveryFee() != null
                    ? pharmacy.getDeliveryFee()
                    : BigDecimal.ZERO;
        } else if (deliveryAddress == null || deliveryAddress.isBlank()) {
            deliveryAddress = PharmacyServiceHelper.buildPatientAddress(patient);
            deliveryLat     = patient.getLatitude();
            deliveryLon     = patient.getLongitude();
        }

        BigDecimal totalAmount = medicineAmount.add(deliveryFee);

        String orderNumber = generateOrderNumber();

        PharmacyOrder order = PharmacyOrder.builder()
                .orderNumber(orderNumber)
                .prescriptionHeader(prescription)
                .pharmacy(pharmacy)
                .patient(patient)
                .status(STATUS_PENDING)
                .deliveryType(deliveryType)
                .deliveryAddress(deliveryAddress)
                .deliveryLatitude(deliveryLat)
                .deliveryLongitude(deliveryLon)
                .deliveryFee(deliveryFee)
                .deliveryPhoneNumber(deliveryPhoneNumber)
                .deliveryAddressSource(deliveryAddressSource)
                .medicineAmount(medicineAmount)
                .totalAmount(totalAmount)
                .orderItems(orderItems)
                .paymentStatus(PAYMENT_STATUS_PENDING)
                .paymentMethod(request.getPaymentMethod())
                .notes(request.getNotes())
                .pharmacistNotes(PharmacyServiceHelper.trimToNull(request.getPharmacistNotes()))
                .createdAt(LocalDateTime.now())
                .build();
        attachOrderItems(order, orderItems);

        applyCommission(order, pharmacy, totalAmount);

        PharmacyOrder saved;
        try {
            saved = orderRepository.save(order);
        } catch (DataIntegrityViolationException e) {
            throw new BadRequestException("An order for this prescription/request already exists");
        }

        audit.log("ORDER_CREATED", String.valueOf(saved.getOrderId()), patientId,
                java.util.Map.of("pharmacyId", request.getPharmacyId(),
                        "totalAmount", String.valueOf(totalAmount),
                        "deliveryType", deliveryType));

        notifyPharmacyAboutNewOrderAfterCommit(saved);

        return PharmacyOrderMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public PharmacyOrderResponse createOrderFromConsultationRequest(
            Integer requestId,
            PharmacyConsultationOrderCreateRequest request,
            String pharmacyId
    ) {
        PharmacyConsultationRequest consultationRequest = consultationRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "PharmacyConsultationRequest", "id", requestId));

        validatePharmacyOwnsRequest(consultationRequest, pharmacyId);
        validateConsultationRequestCanCreateOrder(consultationRequest);

        Pharmacy pharmacy = consultationRequest.getPharmacy();
        validatePharmacyCanReceiveOrders(pharmacy);

        Patient patient = consultationRequest.getPatient();
        List<PharmacyOrderItem> orderItems = buildOrderItemsFromRequest(request.getItems(), consultationRequest);
        validateOrderRequestItems(consultationRequest, orderItems);
        BigDecimal medicineAmount = calculateMedicineAmount(orderItems);
        String deliveryType = normalizeDeliveryType(
                PharmacyServiceHelper.firstNonBlank(request.getDeliveryType(), consultationRequest.getPreferredDeliveryType())
        );
        BigDecimal deliveryFee = BigDecimal.ZERO;

        String deliveryAddress = PharmacyServiceHelper.firstNonBlank(request.getDeliveryAddress(), consultationRequest.getDeliveryAddress());
        Double deliveryLat = request.getDeliveryLatitude() != null
                ? request.getDeliveryLatitude()
                : consultationRequest.getDeliveryLatitude();
        Double deliveryLon = request.getDeliveryLongitude() != null
                ? request.getDeliveryLongitude()
                : consultationRequest.getDeliveryLongitude();
        String deliveryPhoneNumber = PharmacyServiceHelper.firstNonBlank(
                request.getDeliveryPhoneNumber(),
                consultationRequest.getDeliveryPhoneNumber()
        );
        String deliveryAddressSource = PharmacyServiceHelper.firstNonBlank(
                request.getDeliveryAddressSource(),
                consultationRequest.getDeliveryAddressSource()
        );

        if (DELIVERY_TYPE_DELIVERY.equals(deliveryType)) {
            if (!pharmacy.isDeliveryAvailable()) {
                throw new BadRequestException("Pharmacy does not support delivery");
            }

            if (deliveryAddress == null) {
                deliveryAddress = PharmacyServiceHelper.buildPatientAddress(patient);
                deliveryLat = patient != null ? patient.getLatitude() : null;
                deliveryLon = patient != null ? patient.getLongitude() : null;
            }

            if (deliveryAddress == null || deliveryAddress.isBlank()) {
                throw new BadRequestException("Delivery address is required for delivery orders");
            }

            validateDeliveryRadius(pharmacy, deliveryLat, deliveryLon);

            deliveryFee = pharmacy.getDeliveryFee() != null
                    ? pharmacy.getDeliveryFee()
                    : BigDecimal.ZERO;
        } else if (deliveryAddress == null) {
            deliveryAddress = PharmacyServiceHelper.buildPatientAddress(patient);
            deliveryLat = patient != null ? patient.getLatitude() : null;
            deliveryLon = patient != null ? patient.getLongitude() : null;
        }

        // Use delivery fee from request if provided, otherwise fallback to pharmacy default
        BigDecimal actualDeliveryFee = request.getDeliveryFee() != null
                ? request.getDeliveryFee()
                : deliveryFee;
        // Validate delivery fee
        if (actualDeliveryFee.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Delivery fee must be greater than or equal to 0");
        }

        BigDecimal totalAmount = medicineAmount.add(actualDeliveryFee);

        LocalDateTime estimatedDeliveryTime =
                resolveEstimatedDeliveryTime(deliveryType, request);

        PharmacyOrder order = PharmacyOrder.builder()
                .orderNumber(generateOrderNumber())
                .consultationRequest(consultationRequest)
                .pharmacy(pharmacy)
                .patient(patient)
                .status(STATUS_PENDING)
                .deliveryType(deliveryType)
                .deliveryAddress(deliveryAddress)
                .deliveryLatitude(deliveryLat)
                .deliveryLongitude(deliveryLon)
                .deliveryFee(actualDeliveryFee)
                .deliveryPhoneNumber(deliveryPhoneNumber)
                .deliveryAddressSource(PharmacyServiceHelper.normalizeDeliveryAddressSource(deliveryAddressSource))
                .medicineAmount(medicineAmount)
                .totalAmount(totalAmount)
                .estimatedDeliveryTime(estimatedDeliveryTime)
                .orderItems(orderItems)
                .paymentStatus(PAYMENT_STATUS_PENDING)
                .paymentMethod(PharmacyServiceHelper.trimToNull(request.getPaymentMethod()))
                .notes(PharmacyServiceHelper.firstNonBlank(request.getNotes(), consultationRequest.getAdditionalNotes()))
                .pharmacistNotes(PharmacyServiceHelper.trimToNull(request.getPharmacistNotes()))
                .createdAt(LocalDateTime.now())
                .build();
        attachOrderItems(order, orderItems);

        applyCommission(order, pharmacy, medicineAmount);

        PharmacyOrder savedOrder = orderRepository.save(order);
        consultationRequest.setOrder(savedOrder);
        consultationRequest.setStatus(REQUEST_STATUS_ORDER_CREATED);
        consultationRequestRepository.save(consultationRequest);

        audit.log("ORDER_CREATED_FROM_CONSULTATION", String.valueOf(savedOrder.getOrderId()), pharmacyId,
                java.util.Map.of("consultationRequestId", String.valueOf(requestId),
                        "totalAmount", String.valueOf(totalAmount)));

        notifyPatientAboutNewOrderFromRequestAfterCommit(savedOrder);

        return PharmacyOrderMapper.toResponse(savedOrder);
    }

    // =========================================================================
    // Task 2.2 – Cập nhật trạng thái đơn hàng (dược sĩ)
    // =========================================================================
    @Override
    @Transactional
    public PharmacyOrderResponse updateOrderStatus(Integer orderId, PharmacyOrderStatusRequest request) {

        PharmacyOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("PharmacyOrder", "id", orderId));

        String currentStatus = normalizeStatus(order.getStatus());
        String targetStatus  = normalizeStatus(request.getStatus());

        if (Objects.equals(currentStatus, targetStatus)) {
            log.info("Skipping order status update notification because status is unchanged: orderId={}, status={}",
                    orderId, currentStatus);
            return PharmacyOrderMapper.toResponse(order);
        }

        // Kiểm tra luồng trạng thái hợp lệ
        Set<String> allowed = ALLOWED_TRANSITIONS.getOrDefault(currentStatus, Set.of());
        if (!allowed.contains(targetStatus)) {
            throw new InvalidStatusException(currentStatus, targetStatus);
        }

        if (STATUS_CANCELLED.equals(targetStatus)
                && PAYMENT_STATUS_PAID.equalsIgnoreCase(safeValue(order.getPaymentStatus(), ""))) {
            throw new BadRequestException("Paid orders cannot be cancelled. Use the refund flow instead.");
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
        boolean notifyDoctorAboutCompletedPaidOrder = shouldNotifyDoctorAboutCompletedPaidOrder(order);
        if (notifyDoctorAboutCompletedPaidOrder) {
            order.setDoctorCompletionPaidNotified(true);
        }
        PharmacyOrder updated = orderRepository.save(order);

        audit.log("ORDER_STATUS_CHANGED", String.valueOf(orderId), null,
                java.util.Map.of("from", currentStatus, "to", targetStatus));

        notifyPatientAboutOrderStatusAfterCommit(updated, currentStatus, targetStatus);
        if (notifyDoctorAboutCompletedPaidOrder) {
            notifyDoctorAboutCompletedAndPaidOrderAfterCommit(updated);
        }

        return PharmacyOrderMapper.toResponse(updated);
    }

    // =========================================================================
    // Patient cancels own order
    // =========================================================================
    @Override
    @Transactional
    public PharmacyOrderResponse cancelOrderByPatient(Integer orderId, CancelOrderRequest request, String patientId) {
        PharmacyOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("PharmacyOrder", "id", orderId));

        if (order.getPatient() == null || !patientId.equals(order.getPatient().getPatientId())) {
            throw new ForbiddenException("You are not allowed to cancel this order");
        }

        String currentStatus = normalizeStatus(order.getStatus());
        if (!Set.of(STATUS_PENDING, STATUS_CONFIRMED).contains(currentStatus)) {
            throw new BadRequestException("Order can only be cancelled when status is PENDING or CONFIRMED");
        }

        if (PAYMENT_STATUS_PAID.equalsIgnoreCase(safeValue(order.getPaymentStatus(), ""))) {
            throw new BadRequestException("Paid orders cannot be cancelled. Use the refund flow instead.");
        }

        order.setStatus(STATUS_CANCELLED);
        order.setCancelledAt(LocalDateTime.now());
        order.setCancelledBy("Patient");
        order.setCancelReason(PharmacyServiceHelper.trimToNull(request.getCancelReason()));

        PharmacyOrder updated = orderRepository.save(order);

        audit.log("ORDER_CANCELLED_BY_PATIENT", String.valueOf(orderId), patientId,
                java.util.Map.of("cancelReason", request.getCancelReason()));

        notifyPatientAboutOrderStatusAfterCommit(updated, currentStatus, STATUS_CANCELLED);

        return PharmacyOrderMapper.toResponse(updated);
    }

    // =========================================================================
    // Patient requests revision
    // =========================================================================
    @Override
    @Transactional
    public PharmacyOrderResponse requestOrderRevision(Integer orderId, PharmacyOrderRevisionRequest request, String patientId) {
        PharmacyOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("PharmacyOrder", "id", orderId));

        if (order.getPatient() == null || !patientId.equals(order.getPatient().getPatientId())) {
            throw new ForbiddenException("You are not allowed to request revision for this order");
        }

        String currentStatus = normalizeStatus(order.getStatus());
        if (!Set.of(STATUS_PENDING, STATUS_CONFIRMED).contains(currentStatus)) {
            throw new BadRequestException("Order can only be revised when status is PENDING or CONFIRMED");
        }

        if (PAYMENT_STATUS_PAID.equalsIgnoreCase(safeValue(order.getPaymentStatus(), ""))) {
            throw new BadRequestException("Cannot request revision for a paid order");
        }

        order.setStatus(STATUS_REVISION_REQUESTED);
        order.setRevisionRequestNotes(PharmacyServiceHelper.trimToNull(request.getReason()));
        order.setRevisionRequestedAt(LocalDateTime.now());
        order.setRevisionResolvedAt(null);
        order.setPatientConfirmedAt(null);

        PharmacyOrder updated = orderRepository.save(order);

        audit.log("REVISION_REQUESTED", String.valueOf(orderId), patientId,
                java.util.Map.of("reason", request.getReason()));

        notifyPharmacyAboutRevisionRequestAfterCommit(updated);
        notifyPatientAboutOrderStatusAfterCommit(updated, currentStatus, STATUS_REVISION_REQUESTED);

        return PharmacyOrderMapper.toResponse(updated);
    }

    // =========================================================================
    // Pharmacy updates order quote
    // =========================================================================
    @Override
    @Transactional
    public PharmacyOrderResponse updateOrderQuote(Integer orderId, PharmacyConsultationOrderCreateRequest request, String pharmacyId) {
        PharmacyOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("PharmacyOrder", "id", orderId));

        if (order.getPharmacy() == null || !pharmacyId.equals(order.getPharmacy().getPharmacyId())) {
            throw new ForbiddenException("You are not allowed to update this order");
        }

        String currentStatus = normalizeStatus(order.getStatus());
        if (!Set.of(STATUS_PENDING, STATUS_CONFIRMED, STATUS_REVISION_REQUESTED).contains(currentStatus)) {
            throw new BadRequestException("Cannot update quote for order with status " + currentStatus);
        }

        if (PAYMENT_STATUS_PAID.equalsIgnoreCase(safeValue(order.getPaymentStatus(), ""))) {
            throw new BadRequestException("Cannot update quote for a paid order");
        }

        List<PharmacyOrderItem> orderItems = buildOrderItemsFromRequest(request.getItems(),
                order.getConsultationRequest());
        BigDecimal medicineAmount = calculateMedicineAmount(orderItems);

        String deliveryType = normalizeDeliveryType(request.getDeliveryType());
        BigDecimal deliveryFee = request.getDeliveryFee() != null ? request.getDeliveryFee() : BigDecimal.ZERO;

        String deliveryAddress = PharmacyServiceHelper.trimToNull(request.getDeliveryAddress());
        if (deliveryAddress == null) {
            deliveryAddress = order.getDeliveryAddress();
        }

        Double deliveryLat = request.getDeliveryLatitude() != null ? request.getDeliveryLatitude() : order.getDeliveryLatitude();
        Double deliveryLon = request.getDeliveryLongitude() != null ? request.getDeliveryLongitude() : order.getDeliveryLongitude();

        BigDecimal totalAmount = medicineAmount.add(deliveryFee);

        order.getOrderItems().clear();
        order.setOrderItems(orderItems);
        attachOrderItems(order, orderItems);

        order.setMedicineAmount(medicineAmount);
        order.setDeliveryFee(deliveryFee);
        order.setTotalAmount(totalAmount);
        order.setDeliveryType(deliveryType);
        order.setDeliveryAddress(deliveryAddress);
        order.setDeliveryLatitude(deliveryLat);
        order.setDeliveryLongitude(deliveryLon);
        order.setEstimatedDeliveryTime(request.getEstimatedDeliveryTime());
        order.setNotes(PharmacyServiceHelper.firstNonBlank(request.getNotes(), order.getNotes()));
        order.setPharmacistNotes(PharmacyServiceHelper.firstNonBlank(request.getPharmacistNotes(), order.getPharmacistNotes()));
        order.setPaymentMethod(PharmacyServiceHelper.trimToNull(request.getPaymentMethod()));

        order.setStatus(STATUS_PENDING);
        order.setRevisionResolvedAt(LocalDateTime.now());
        order.setPatientConfirmedAt(null);

        applyCommission(order, order.getPharmacy(), medicineAmount);

        PharmacyOrder updated = orderRepository.save(order);

        audit.log("ORDER_QUOTE_UPDATED", String.valueOf(orderId), pharmacyId,
                java.util.Map.of("totalAmount", String.valueOf(totalAmount)));

        notifyPatientAboutOrderQuoteUpdatedAfterCommit(updated);

        return PharmacyOrderMapper.toResponse(updated);
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
    public List<PharmacyOrderResponse> getOrdersByPatient(String patientId, String status) {
        List<PharmacyOrder> orders = (status != null && !status.isBlank())
                ? orderRepository.findByPatient_PatientIdAndStatus(patientId, status)
                : orderRepository.findByPatient_PatientId(patientId);
        return orders.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PharmacyOrderResponse> getOrdersByDoctor(String doctorId) {
        return orderRepository.findByPrescriptionHeader_Doctor_DoctorIdOrderByCreatedAtDesc(doctorId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PharmacyOrderResponse getOrderById(Integer orderId) {
        PharmacyOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("PharmacyOrder", "id", orderId));
        return PharmacyOrderMapper.toResponse(order);
    }

    // =========================================================================
    // Commission helpers
    // =========================================================================

    private void applyCommission(PharmacyOrder order, Pharmacy pharmacy, BigDecimal totalAmount) {
        BigDecimal rate = resolveCommissionRate(pharmacy);
        BigDecimal platformFee = totalAmount.multiply(rate);
        BigDecimal pharmacyEarning = totalAmount.subtract(platformFee);

        order.setCommissionRate(rate);
        order.setPlatformFee(platformFee);
        order.setPharmacyEarning(pharmacyEarning);
    }

    private BigDecimal resolveCommissionRate(Pharmacy pharmacy) {
        if (pharmacy.getCustomCommissionRate() != null) {
            return pharmacy.getCustomCommissionRate();
        }
        String tier = pharmacy.getCommissionTier();
        if (tier == null) tier = "STANDARD";
        return switch (tier.toUpperCase()) {
            case "VIP" -> VIP_COMMISSION_RATE;
            case "PREMIUM" -> PREMIUM_COMMISSION_RATE;
            default -> STANDARD_COMMISSION_RATE;
        };
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    private void validatePatientOwnsPrescription(Patient patient, String patientId) {
        if (patient == null || patient.getPatientId() == null || !patient.getPatientId().equals(patientId)) {
            throw new ForbiddenException("You are not allowed to create an order for this prescription");
        }
    }

    private void validatePharmacyOwnsRequest(PharmacyConsultationRequest request, String pharmacyId) {
        if (request == null
                || request.getPharmacy() == null
                || request.getPharmacy().getPharmacyId() == null
                || !request.getPharmacy().getPharmacyId().equals(pharmacyId)) {
            throw new ForbiddenException("You are not allowed to create an order for this request");
        }
    }

    private void validatePrescriptionCanBeOrdered(PrescriptionHeader prescription) {
        LocalDateTime now = LocalDateTime.now();
        if (prescription.getValidUntil() != null && prescription.getValidUntil().isBefore(now)) {
            throw new BadRequestException("Prescription is expired");
        }

        String status = prescription.getStatus();
        if (status != null
                && (STATUS_CANCELLED.equalsIgnoreCase(status)
                || "Canceled".equalsIgnoreCase(status)
                || "Expired".equalsIgnoreCase(status))) {
            throw new BadRequestException("Prescription cannot be ordered from status " + status);
        }
    }

    private void validateConsultationRequestCanCreateOrder(PharmacyConsultationRequest consultationRequest) {
        if (consultationRequest.getRequestId() != null
                && orderRepository.existsByConsultationRequest_RequestId(consultationRequest.getRequestId())) {
            throw new BadRequestException("An order has already been created for this request");
        }

        String requestType = PharmacyServiceHelper.requestTypeOf(consultationRequest);
        String status = normalizeStatus(consultationRequest.getStatus());

        if (REQUEST_TYPE_ORDER_REQUEST.equals(requestType)) {
            if (!STATUS_PENDING.equals(status)) {
                throw new BadRequestException("Order request can only create an order while pending");
            }
            if (consultationRequest.getRequestPrescriptions() == null
                    || consultationRequest.getRequestPrescriptions().isEmpty()) {
                throw new BadRequestException("Order request requires a prescription");
            }
            return;
        }

        if (REQUEST_STATUS_CANCELLED.equalsIgnoreCase(safeValue(consultationRequest.getStatus(), ""))) {
            throw new BadRequestException("Cannot create order for a cancelled request");
        }

        if (REQUEST_STATUS_ORDER_CREATED.equalsIgnoreCase(safeValue(consultationRequest.getStatus(), ""))
                || consultationRequest.getOrder() != null) {
            throw new BadRequestException("An order has already been created for this request");
        }

    }

    private void validateOrderRequestItems(
            PharmacyConsultationRequest consultationRequest,
            List<PharmacyOrderItem> orderItems
    ) {
        if (!REQUEST_TYPE_ORDER_REQUEST.equals(PharmacyServiceHelper.requestTypeOf(consultationRequest))) {
            return;
        }

        Set<Integer> allowedPrescriptionItemIds = consultationRequest.getRequestPrescriptions().stream()
                .filter(Objects::nonNull)
                .flatMap(rp -> rp.getPrescriptionHeader().getPrescriptionItems().stream())
                .map(PrescriptionItem::getPrescriptionItemId)
                .collect(Collectors.toSet());

        for (PharmacyOrderItem item : orderItems) {
            Integer sourceId = item.getSourcePrescriptionItem() != null
                    ? item.getSourcePrescriptionItem().getPrescriptionItemId()
                    : null;
            if (sourceId == null || !allowedPrescriptionItemIds.contains(sourceId)) {
                throw new BadRequestException("Order request items must come from the submitted prescription");
            }
        }
    }

    private void validatePharmacyCanReceiveOrders(Pharmacy pharmacy) {
        if (!pharmacy.isActive()) {
            throw new BadRequestException("Pharmacy is not active");
        }

        if (!pharmacy.isVerified()) {
            throw new BadRequestException("Pharmacy is not verified");
        }
    }

    private List<PharmacyOrderItem> buildOrderItemsFromRequest(
            List<PharmacyOrderItemRequest> itemRequests,
            PharmacyConsultationRequest consultationRequest
    ) {
        if (itemRequests == null || itemRequests.isEmpty()) {
            throw new BadRequestException("Order must have at least 1 medication");
        }

        List<PharmacyOrderItem> items = new ArrayList<>();
        for (PharmacyOrderItemRequest itemRequest : itemRequests) {
            Medicine medicine = medicineRepository.findById(itemRequest.getMedicineId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Medicine", "id", itemRequest.getMedicineId()));
            BigDecimal unitPrice = normalizeUnitPrice(itemRequest.getUnitPrice(), medicine.getPrice());
            Integer quantity = normalizePositive(itemRequest.getQuantity(), "Quantity");
            Integer totalSupplyDays = normalizePositive(itemRequest.getTotalSupplyDays(), "Total supply days");
            PrescriptionHeader sourceHeader = resolveSourcePrescriptionHeader(
                    itemRequest.getSourcePrescriptionHeaderId(),
                    consultationRequest
            );
            PrescriptionItem sourceItem = resolveSourcePrescriptionItem(
                    sourceHeader,
                    itemRequest.getSourcePrescriptionItemId()
            );

            items.add(PharmacyOrderItem.builder()
                    .medicine(medicine)
                    .sourcePrescriptionHeader(sourceHeader)
                    .sourcePrescriptionItem(sourceItem)
                    .medicationName(medicine.getName())
                    .totalSupplyDays(totalSupplyDays)
                    .quantity(quantity)
                    .unit(PharmacyServiceHelper.firstNonBlank(itemRequest.getUnit(), medicine.getUnit()))
                    .frequency(PharmacyServiceHelper.trimToNull(itemRequest.getFrequency()))
                    .timing(normalizeOptionalTiming(itemRequest.getTimings(), itemRequest.getTiming()))
                    .route(PharmacyServiceHelper.trimToNull(itemRequest.getRoute()))
                    .unitPrice(unitPrice)
                    .totalPrice(unitPrice.multiply(BigDecimal.valueOf(quantity)))
                    .notes(PharmacyServiceHelper.trimToNull(itemRequest.getNotes()))
                    .build());
        }

        return items;
    }

    private List<PharmacyOrderItem> buildOrderItemsFromPrescription(PrescriptionHeader prescription) {
        if (prescription.getPrescriptionItems() == null || prescription.getPrescriptionItems().isEmpty()) {
            throw new BadRequestException("Prescription must have at least 1 medication");
        }

        List<PharmacyOrderItem> items = new ArrayList<>();
        for (PrescriptionItem prescriptionItem : prescription.getPrescriptionItems()) {
            Medicine medicine = prescriptionItem.getMedicine();
            BigDecimal unitPrice = normalizeUnitPrice(prescriptionItem.getUnitPrice(),
                    medicine != null ? medicine.getPrice() : null);
            Integer quantity = defaultPositive(prescriptionItem.getQuantity());
            Integer totalSupplyDays = defaultPositive(prescriptionItem.getTotalSupplyDays());
            BigDecimal totalPrice = prescriptionItem.getTotalPrice() != null
                    ? prescriptionItem.getTotalPrice()
                    : unitPrice.multiply(BigDecimal.valueOf(quantity));

            items.add(PharmacyOrderItem.builder()
                    .medicine(medicine)
                    .sourcePrescriptionHeader(prescription)
                    .sourcePrescriptionItem(prescriptionItem)
                    .medicationName(safeValue(PharmacyServiceHelper.firstNonBlank(prescriptionItem.getMedicationName(),
                            medicine != null ? medicine.getName() : null), "Medication"))
                    .totalSupplyDays(totalSupplyDays)
                    .quantity(quantity)
                    .unit(prescriptionItem.getUnit())
                    .frequency(prescriptionItem.getFrequency())
                    .timing(prescriptionItem.getTiming())
                    .route(prescriptionItem.getRoute())
                    .unitPrice(unitPrice)
                    .totalPrice(totalPrice)
                    .notes(prescriptionItem.getNotes())
                    .build());
        }

        return items;
    }

    private PrescriptionHeader resolveSourcePrescriptionHeader(
            Integer prescriptionHeaderId,
            PharmacyConsultationRequest consultationRequest
    ) {
        if (prescriptionHeaderId == null) {
            return null;
        }

        PrescriptionHeader sourceHeader = findRequestPrescription(consultationRequest, prescriptionHeaderId);
        Patient patient = consultationRequest != null ? consultationRequest.getPatient() : null;
        if (sourceHeader.getPatient() == null
                || patient == null
                || !Objects.equals(sourceHeader.getPatient().getPatientId(), patient.getPatientId())) {
            throw new ForbiddenException("Source prescription does not belong to this patient");
        }
        return sourceHeader;
    }

    private PrescriptionHeader findRequestPrescription(
            PharmacyConsultationRequest consultationRequest,
            Integer prescriptionHeaderId
    ) {
        if (consultationRequest == null || consultationRequest.getRequestPrescriptions() == null) {
            throw new ForbiddenException("Source prescription was not sent with this request");
        }

        return consultationRequest.getRequestPrescriptions().stream()
                .map(PharmacyConsultationRequestPrescription::getPrescriptionHeader)
                .filter(Objects::nonNull)
                .filter(header -> Objects.equals(header.getPrescriptionHeaderId(), prescriptionHeaderId))
                .findFirst()
                .orElseThrow(() -> new ForbiddenException(
                        "Source prescription was not sent with this request"
                ));
    }

    private PrescriptionItem resolveSourcePrescriptionItem(PrescriptionHeader sourceHeader, Integer prescriptionItemId) {
        if (prescriptionItemId == null) {
            return null;
        }
        if (sourceHeader == null) {
            throw new BadRequestException("Source prescription header is required for source prescription item");
        }
        if (sourceHeader.getPrescriptionItems() == null) {
            throw new BadRequestException("Source prescription item does not belong to source prescription");
        }
        return sourceHeader.getPrescriptionItems().stream()
                .filter(item -> Objects.equals(item.getPrescriptionItemId(), prescriptionItemId))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Source prescription item does not belong to source prescription"));
    }

    private BigDecimal calculateMedicineAmount(List<PharmacyOrderItem> items) {
        return items.stream()
                .map(item -> item.getTotalPrice() != null ? item.getTotalPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void attachOrderItems(PharmacyOrder order, List<PharmacyOrderItem> items) {
        for (PharmacyOrderItem item : items) {
            item.setPharmacyOrder(order);
        }
    }

    private Integer normalizePositive(Integer value, String fieldName) {
        if (value == null || value < 1) {
            throw new BadRequestException(fieldName + " must be >= 1");
        }
        return value;
    }

    private Integer defaultPositive(Integer value) {
        return value != null && value > 0 ? value : 1;
    }

    private BigDecimal normalizeUnitPrice(BigDecimal requestedPrice, BigDecimal fallbackPrice) {
        BigDecimal unitPrice = requestedPrice != null ? requestedPrice : fallbackPrice;
        if (unitPrice == null) {
            return BigDecimal.ZERO;
        }
        if (unitPrice.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Unit price must be greater than or equal to 0");
        }
        return unitPrice;
    }

    private String normalizeOptionalTiming(List<String> timings, String timing) {
        try {
            if (timings != null && !timings.isEmpty()) {
                return PrescriptionTiming.normalizeJoined(timings);
            }
            String normalized = PharmacyServiceHelper.trimToNull(timing);
            return normalized != null ? PrescriptionTiming.normalizeJoined(normalized) : null;
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException(ex.getMessage());
        }
    }

    private String normalizeDeliveryType(String deliveryType) {
        if (deliveryType == null || deliveryType.isBlank()) {
            return DELIVERY_TYPE_DELIVERY;
        }

        if (DELIVERY_TYPE_DELIVERY.equalsIgnoreCase(deliveryType)) {
            return DELIVERY_TYPE_DELIVERY;
        }

        if (DELIVERY_TYPE_PICKUP.equalsIgnoreCase(deliveryType)) {
            return DELIVERY_TYPE_PICKUP;
        }

        throw new BadRequestException("Delivery type must be Delivery or Pickup");
    }

    private LocalDateTime resolveEstimatedDeliveryTime(
            String deliveryType,
            PharmacyConsultationOrderCreateRequest request
    ) {
        if (!DELIVERY_TYPE_DELIVERY.equals(deliveryType)) {
            return request.getEstimatedDeliveryTime();
        }

        if (request.getEstimatedDeliveryTime() != null) {
            return request.getEstimatedDeliveryTime();
        }

        Integer minutes = request.getEstimatedDeliveryMinutes();
        if (minutes == null) {
            throw new BadRequestException("Estimated delivery time is required for delivery orders");
        }
        if (minutes < 1 || minutes > 999) {
            throw new BadRequestException("Estimated delivery minutes must be between 1 and 999");
        }

        return LocalDateTime.now().plusMinutes(minutes);
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new BadRequestException("Status is required");
        }
        return status.trim().toUpperCase();
    }

    private void validateDeliveryRadius(Pharmacy pharmacy, Double deliveryLat, Double deliveryLon) {
        if (pharmacy.getDeliveryRadius() == null) {
            throw new BadRequestException("Pharmacy has no delivery radius configured");
        }
        if (pharmacy.getLatitude() == null || pharmacy.getLongitude() == null) {
            throw new BadRequestException("Pharmacy location is not configured");
        }
        if (deliveryLat == null || deliveryLon == null) {
            throw new BadRequestException("Delivery location is required");
        }

        double distanceKm = PharmacyServiceHelper.calculateDistanceKm(
                pharmacy.getLatitude(),
                pharmacy.getLongitude(),
                deliveryLat,
                deliveryLon
        );
        if (distanceKm > pharmacy.getDeliveryRadius()) {
            throw new BadRequestException("Delivery address is outside pharmacy delivery radius");
        }
    }

    // calculateDistanceKm and buildPatientAddress moved to PharmacyServiceHelper

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

    private void notifyPharmacyAboutRevisionRequestAfterCommit(PharmacyOrder order) {
        User pharmacyUser = resolvePharmacyUser(order, NotificationType.ORDER_STATUS);
        if (pharmacyUser == null) {
            return;
        }

        String orderNumber = safeValue(order.getOrderNumber(), "unknown order");
        String patientName = order.getPatient() != null
                ? safeValue(order.getPatient().getFullName(), "Unknown patient")
                : "Unknown patient";
        Integer orderId = order.getOrderId();
        String actionUrl = "/pharmacy-orders/" + orderId;
        String title = "Revision requested";
        String message = String.format(
                "Patient %s requested changes for order %s.",
                patientName,
                orderNumber
        );

        runAfterCommit("revision request notification orderId=" + orderId, () -> {
            notificationService.sendWebSocketNotification(
                    pharmacyUser,
                    NotificationType.ORDER_STATUS,
                    title,
                    message,
                    orderId,
                    actionUrl
            );
            log.info("Revision request notification queued for pharmacyUserId={}, orderId={}",
                    pharmacyUser.getId(), orderId);
        });
    }

    private void notifyPatientAboutOrderQuoteUpdatedAfterCommit(PharmacyOrder order) {
        User patientUser = resolvePatientUser(order, NotificationType.ORDER_STATUS);
        if (patientUser == null) {
            return;
        }

        String orderNumber = safeValue(order.getOrderNumber(), "unknown order");
        Integer orderId = order.getOrderId();
        String actionUrl = "/pharmacy-orders/" + orderId;
        String title = "Order quote updated";
        String message = String.format(
                "Your order %s has been updated by the pharmacy. Please review and confirm.",
                orderNumber
        );
        boolean hasActiveMobileToken = !deviceTokenRepository
                .findByUser_IdAndActiveTrue(patientUser.getId())
                .isEmpty();

        runAfterCommit("order quote updated notification orderId=" + orderId, () -> {
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
        });
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
        Integer consultationRequestId = order.getConsultationRequest() != null
                ? order.getConsultationRequest().getRequestId()
                : null;
        String actionUrl = "/pharmacy-orders/" + orderId;
        String title = "New pharmacy order";
        String message = consultationRequestId != null && prescriptionHeaderId == null
                ? String.format(
                "Order %s for %s was created from consultation request %s.",
                orderNumber,
                patientName,
                consultationRequestId
        )
                : String.format(
                "Order %s for %s was created from prescription %s.",
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

    private void notifyPatientAboutNewOrderFromRequestAfterCommit(PharmacyOrder order) {
        User patientUser = resolvePatientUser(order, NotificationType.NEW_ORDER);
        if (patientUser == null || order.getConsultationRequest() == null) {
            return;
        }

        Integer orderId = order.getOrderId();
        Integer requestId = order.getConsultationRequest().getRequestId();
        String orderNumber = safeValue(order.getOrderNumber(), "unknown order");
        String actionUrl = "/pharmacy-orders/" + orderId;
        String title = "Pharmacy order created";
        String message = String.format(
                "Your request %s has been converted into order %s.",
                requestId,
                orderNumber
        );
        boolean hasActiveMobileToken = !deviceTokenRepository
                .findByUser_IdAndActiveTrue(patientUser.getId())
                .isEmpty();

        runAfterCommit("new order from request notification orderId=" + orderId, () -> {
            notificationService.sendWebSocketNotification(
                    patientUser,
                    NotificationType.NEW_ORDER,
                    title,
                    message,
                    orderId,
                    actionUrl
            );

            if (hasActiveMobileToken) {
                notificationService.sendMobilePushNotification(
                        patientUser,
                        NotificationType.NEW_ORDER,
                        title,
                        message,
                        NotificationPriority.NORMAL,
                        orderId,
                        actionUrl
                );
            }
        });
    }

    private void notifyPatientAboutOrderStatusAfterCommit(PharmacyOrder order, String oldStatus, String newStatus) {
        if (STATUS_PREPARING.equals(newStatus)) {
            notifyPatientPaymentRequired(order);
            return;
        }

        User patientUser = resolvePatientUser(order, NotificationType.ORDER_STATUS);
        if (patientUser == null) {
            return;
        }

        String orderNumber = safeValue(order.getOrderNumber(), "unknown order");
        Integer orderId = order.getOrderId();
        String actionUrl = "/pharmacy-orders/" + orderId;

        String title;
        String message;
        switch (newStatus) {
            case STATUS_CONFIRMED:
                title = "Order confirmed";
                message = String.format("Your order %s has been confirmed by the pharmacy.", orderNumber);
                break;
            case STATUS_READY:
                title = "Order ready";
                message = String.format("Your order %s is ready.", orderNumber);
                break;
            case STATUS_SHIPPING:
                title = "Order shipped";
                message = String.format("Your order %s is on its way!", orderNumber);
                break;
            case STATUS_DELIVERED:
                title = "Order delivered";
                message = String.format("Your order %s has been delivered.", orderNumber);
                break;
            case STATUS_COMPLETED:
                title = "Order completed";
                message = String.format("Your order %s is completed. Thank you!", orderNumber);
                break;
            case STATUS_CANCELLED:
                title = "Order cancelled";
                String reason = safeValue(order.getCancelReason(), "");
                message = reason.isBlank()
                        ? String.format("Your order %s has been cancelled.", orderNumber)
                        : String.format("Your order %s has been cancelled. Reason: %s", orderNumber, reason);
                break;
            default:
                title = "Order status updated";
                message = String.format("Your order %s changed from %s to %s.",
                        orderNumber, safeValue(oldStatus, "unknown"), safeValue(newStatus, "unknown"));
                break;
        }

        runAfterCommit("order status notification orderId=" + orderId, () -> {
            notificationService.sendWebSocketNotification(
                    patientUser,
                    NotificationType.ORDER_STATUS,
                    title,
                    message,
                    orderId,
                    actionUrl
            );

            log.info("Order status notification sent to patientUserId={}, orderId={}, newStatus={}",
                    patientUser.getId(), orderId, newStatus);
        });
    }

    private void notifyPatientPaymentRequired(PharmacyOrder order) {
        User patientUser = resolvePatientUser(order, NotificationType.PAYMENT_REQUIRED);
        if (patientUser == null) {
            return;
        }

        String orderNumber = safeValue(order.getOrderNumber(), "unknown order");
        Integer orderId = order.getOrderId();
        String title = "Payment required";
        String message = String.format(
                "Your order %s is being prepared. Please proceed to payment.",
                orderNumber
        );
        String actionUrl = "/payment/order/" + orderId;

        runAfterCommit("payment notification orderId=" + orderId, () -> {
            notificationService.sendWebSocketNotification(
                    patientUser,
                    NotificationType.PAYMENT_REQUIRED,
                    title,
                    message,
                    orderId,
                    actionUrl
            );

            log.info("Payment notification sent to patientUserId={}, orderId={}",
                    patientUser.getId(), orderId);
        });
    }

    private void notifyDoctorAboutCompletedAndPaidOrderAfterCommit(PharmacyOrder order) {
        User doctorUser = resolveDoctorUser(order, NotificationType.INVOICE_PAID);
        if (doctorUser == null) {
            return;
        }

        String orderNumber = safeValue(order.getOrderNumber(), "unknown order");
        String patientName = order.getPatient() != null
                ? safeValue(order.getPatient().getFullName(), "Unknown patient")
                : "Unknown patient";
        String pharmacyName = order.getPharmacy() != null
                ? safeValue(order.getPharmacy().getName(), "the pharmacy")
                : "the pharmacy";
        Integer orderId = order.getOrderId();

        runAfterCommit("doctor completed and paid order notification orderId=" + orderId, () -> {
            notificationService.sendWebSocketNotification(
                    doctorUser,
                    NotificationType.INVOICE_PAID,
                    "Pharmacy order completed and paid",
                    String.format(
                            "Order %s for %s was completed by %s and the patient payment has been confirmed.",
                            orderNumber,
                            patientName,
                            pharmacyName
                    ),
                    orderId,
                    "/pharmacy-orders/" + orderId
            );

            log.info("Completed-and-paid order notification queued for doctorUserId={}, orderId={}",
                    doctorUser.getId(), orderId);
        });
    }

    private boolean shouldNotifyDoctorAboutCompletedPaidOrder(PharmacyOrder order) {
        return STATUS_COMPLETED.equalsIgnoreCase(order.getStatus())
                && PAYMENT_STATUS_PAID.equalsIgnoreCase(safeValue(order.getPaymentStatus(), ""))
                && order.getPrescriptionHeader() != null
                && order.getPrescriptionHeader().getDoctor() != null
                && !Boolean.TRUE.equals(order.getDoctorCompletionPaidNotified());
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

    private User resolveDoctorUser(PharmacyOrder order, NotificationType type) {
        if (order == null || order.getPrescriptionHeader() == null || order.getPrescriptionHeader().getDoctor() == null) {
            log.warn("Cannot send {} notification: order or prescribing doctor is missing", type);
            return null;
        }

        User user = order.getPrescriptionHeader().getDoctor().getUser();
        if (user == null || user.getId() == null || user.getId().isBlank()) {
            log.warn("Cannot send {} notification: prescribing doctor is not mapped to a user", type);
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
}
