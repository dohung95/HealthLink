package com.HealthLink.service.impl.payment;

import com.HealthLink.config.PayPalConfig;
import com.HealthLink.dto.payment.InvoiceResponse;
import com.HealthLink.dto.payment.PayPalCaptureRequest;
import com.HealthLink.dto.payment.PayPalOrderRequest;
import com.HealthLink.dto.payment.PharmacyOrderPayPalCaptureRequest;
import com.HealthLink.dto.payment.PharmacyOrderPayPalOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Invoice;
import com.HealthLink.entity.Payment;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.InvoiceNotFoundException;
import com.HealthLink.exception.PayPalIntegrationException;
import com.HealthLink.repository.notification.DeviceTokenRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.payment.InvoiceRepository;
import com.HealthLink.repository.payment.PaymentRepository;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.HealthLink.service.notification.NotificationService;
import com.HealthLink.service.payment.CommissionService;
import com.HealthLink.service.payment.FinanceService;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.entity.User;
import com.HealthLink.utility.mapper.PharmacyOrderMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Cài đặt của {@link FinanceService}.
 *
 * <p>Tác vụ 3.1 – Tự động tạo hóa đơn
 * <p>Tác vụ 3.2 – PayPal v2 Orders API (Tạo + Xác nhận)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FinanceServiceImpl implements FinanceService {

    // ── Các hằng trạng thái ─────────────────────────────────────────────────
    private static final String INVOICE_PENDING   = "Pending";
    private static final String INVOICE_PAID      = "Paid";
    private static final String INVOICE_CANCELLED = "Cancelled";

    private static final String PAYMENT_PENDING = "Pending";
    private static final String PAYMENT_SUCCESS = "Success";
    private static final String PAYMENT_FAILED  = "Failed";

    private static final String GATEWAY_PAYPAL   = "PayPal";
    private static final String METHOD_EWALLET   = "EWallet";
    private static final String METHOD_CARD      = "Card";

    private static final String APPT_COMPLETED = "Completed";
    private static final String PHARMACY_ORDER_COMPLETED = "Completed";

    // ── Các phụ thuộc ───────────────────────────────────────────────────────
    private final PayPalConfig payPalConfig;

    @Qualifier("paypalRestTemplate")
    private final RestTemplate restTemplate;

    private final ObjectMapper objectMapper;

    private final AppointmentRepository          appointmentRepository;
    private final InvoiceRepository              invoiceRepository;
    private final PaymentRepository              paymentRepository;
    private final PharmacyOrderRepository        pharmacyOrderRepository;
    private final NotificationService            notificationService;
    private final DeviceTokenRepository          deviceTokenRepository;

    /** Service xử lý logic chiết khấu sau khi thanh toán thành công */
    private final CommissionService              commissionService;

    // ========================================================================
    // Tác vụ 3.1 – Tạo hóa đơn
    // ========================================================================

    @Override
    @Transactional
    public InvoiceResponse generateInvoice(Integer appointmentId) {

        // 1. Tải lịch hẹn
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new BadRequestException("Appointment not found with ID: " + appointmentId));

        // 2. Kiểm tra: lịch hẹn phải đã hoàn tất
        if (!APPT_COMPLETED.equals(appointment.getStatus())) {
            throw new BadRequestException("Only completed appointments can have invoices generated.");
        }

        // 3. Kiểm tra: hóa đơn chưa được tạo trước đó
        if (invoiceRepository.existsByAppointment_AppointmentId(appointmentId)) {
            throw new BadRequestException("An invoice already exists for this appointment.");
        }

        // 4. Doctor invoice only covers the consultation fee.
        BigDecimal consultationFee = appointment.getDoctor() != null
                && appointment.getDoctor().getConsultationFee() != null
                ? appointment.getDoctor().getConsultationFee()
                : BigDecimal.ZERO;

        BigDecimal deliveryFee = BigDecimal.ZERO;
        BigDecimal medicineFee = BigDecimal.ZERO;

        // 5. Tính tổng – mặc định không có giảm giá/thuế (có thể mở rộng sau)
        BigDecimal discount = BigDecimal.ZERO;
        BigDecimal tax      = BigDecimal.ZERO;
        BigDecimal amount   = consultationFee
                .subtract(discount)
                .add(tax)
                .setScale(2, RoundingMode.HALF_UP);

        // 6. Tạo số hóa đơn duy nhất: INV-YYYYMMDD-XXXX
        String invoiceNumber = generateInvoiceNumber();

        // 7. Tạo và lưu Invoice
        Invoice invoice = Invoice.builder()
                .appointment(appointment)
                .patient(appointment.getPatient())
                .invoiceNumber(invoiceNumber)
                .consultationFee(consultationFee)
                .medicineFee(medicineFee)
                .deliveryFee(deliveryFee)
                .discount(discount)
                .tax(tax)
                .amount(amount)
                .status(INVOICE_PENDING)
                .issueDate(LocalDateTime.now())
                .dueDate(LocalDateTime.now().plusDays(7))
                .build();

        invoice = invoiceRepository.save(invoice);
        log.info("Invoice {} generated for appointment {}", invoiceNumber, appointmentId);

        return toResponse(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoice(Integer invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));
        return toResponse(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getInvoicesByPatient(String patientId) {
        return invoiceRepository.findByPatient_PatientId(patientId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ========================================================================
    // Tác vụ 3.2 – Tích hợp PayPal
    // ========================================================================

    @Override
    @Transactional
    public Map<String, Object> createPayPalOrder(PayPalOrderRequest request) {

        Invoice invoice = invoiceRepository.findById(request.getInvoiceId())
                .orElseThrow(() -> new InvoiceNotFoundException(request.getInvoiceId()));

        if (INVOICE_PAID.equals(invoice.getStatus())) {
            throw new BadRequestException("This invoice has already been paid.");
        }

        // Lấy access token OAuth2
        String accessToken = getPayPalAccessToken();

        // Xây dựng payload tạo đơn hàng của PayPal v2
        String currency = request.getCurrency() != null ? request.getCurrency() : "USD";
        String amountStr = invoice.getAmount().setScale(2, RoundingMode.HALF_UP).toPlainString();

        Map<String, Object> amountMap = Map.of(
                "currency_code", currency,
                "value", amountStr
        );
        Map<String, Object> purchaseUnit = Map.of(
                "reference_id", "invoice-" + invoice.getInvoiceId(),
                "description", "HealthLink Invoice " + invoice.getInvoiceNumber(),
                "amount", amountMap
        );
        Map<String, Object> payload = Map.of(
                "intent", "CAPTURE",
                "purchase_units", List.of(purchaseUnit)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            String body = objectMapper.writeValueAsString(payload);
            HttpEntity<String> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    payPalConfig.getBaseUrl() + "/v2/checkout/orders",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null) {
                throw new PayPalIntegrationException("PayPal returned an empty response when creating the order.");
            }

            String orderId = (String) responseBody.get("id");
            log.info("PayPal order created: {} for invoice {}", orderId, invoice.getInvoiceId());

            Map<String, Object> result = new HashMap<>();
            result.put("orderId", orderId);
            result.put("invoiceId", invoice.getInvoiceId());
            result.put("amount", amountStr);
            result.put("currency", currency);
            result.put("status", responseBody.get("status"));
            result.put("links", responseBody.get("links"));
            return result;

        } catch (PayPalIntegrationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new PayPalIntegrationException("Error occurred while creating PayPal order: " + ex.getMessage(), ex);
        }
    }

    @Override
    @Transactional
    public Map<String, Object> createPharmacyOrderPayPalOrder(PharmacyOrderPayPalOrderRequest request) {
        PharmacyOrder pharmacyOrder = pharmacyOrderRepository.findById(request.getPharmacyOrderId())
                .orElseThrow(() -> new BadRequestException(
                        "Pharmacy order not found with ID: " + request.getPharmacyOrderId()
                ));

        if (INVOICE_PAID.equalsIgnoreCase(pharmacyOrder.getPaymentStatus())) {
            throw new BadRequestException("This pharmacy order has already been paid.");
        }

        String accessToken = getPayPalAccessToken();
        String currency = request.getCurrency() != null ? request.getCurrency() : "USD";
        String amountStr = (pharmacyOrder.getTotalAmount() != null ? pharmacyOrder.getTotalAmount() : BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP)
                .toPlainString();

        Map<String, Object> amountMap = Map.of(
                "currency_code", currency,
                "value", amountStr
        );
        Map<String, Object> purchaseUnit = Map.of(
                "reference_id", "pharmacy-order-" + pharmacyOrder.getOrderId(),
                "description", "HealthLink Pharmacy Order " + pharmacyOrder.getOrderNumber(),
                "amount", amountMap
        );
        Map<String, Object> payload = Map.of(
                "intent", "CAPTURE",
                "purchase_units", List.of(purchaseUnit)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            String body = objectMapper.writeValueAsString(payload);
            HttpEntity<String> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    payPalConfig.getBaseUrl() + "/v2/checkout/orders",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null) {
                throw new PayPalIntegrationException("PayPal returned an empty response when creating the order.");
            }

            String orderId = (String) responseBody.get("id");
            log.info("PayPal order created: {} for pharmacy order {}", orderId, pharmacyOrder.getOrderId());

            Map<String, Object> result = new HashMap<>();
            result.put("orderId", orderId);
            result.put("pharmacyOrderId", pharmacyOrder.getOrderId());
            result.put("amount", amountStr);
            result.put("currency", currency);
            result.put("status", responseBody.get("status"));
            result.put("links", responseBody.get("links"));
            return result;

        } catch (PayPalIntegrationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new PayPalIntegrationException(
                    "Error occurred while creating PayPal order for pharmacy order: " + ex.getMessage(),
                    ex
            );
        }
    }

    @Override
    @Transactional
    public InvoiceResponse capturePayPalPayment(PayPalCaptureRequest request) {

        Invoice invoice = invoiceRepository.findById(request.getInvoiceId())
                .orElseThrow(() -> new InvoiceNotFoundException(request.getInvoiceId()));

        if (INVOICE_PAID.equals(invoice.getStatus())) {
            throw new BadRequestException("This invoice has already been paid.");
        }

        // Guard: prevent duplicate capture for the same PayPal orderId
        if (paymentRepository.findByTransactionId(request.getOrderId()).isPresent()) {
            throw new BadRequestException("This PayPal transaction has already been processed: " + request.getOrderId());
        }

        String accessToken = getPayPalAccessToken();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>("{}", headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    payPalConfig.getBaseUrl() + "/v2/checkout/orders/" + request.getOrderId() + "/capture",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null) {
                throw new PayPalIntegrationException("PayPal returned an empty response when capturing the payment.");
            }

            String paypalStatus = (String) responseBody.get("status");
            log.info("PayPal capture status: {} for order {}", paypalStatus, request.getOrderId());

            // Chuyển toàn bộ phản hồi thành chuỗi để lưu metadata kiểm tra
            String metadata;
            try {
                metadata = objectMapper.writeValueAsString(responseBody);
            } catch (Exception e) {
                metadata = responseBody.toString();
            }

            // Xác định số tiền đã capture từ phản hồi PayPal
            BigDecimal capturedAmount = extractCapturedAmount(responseBody, invoice.getAmount());

            // Xác định phương thức thanh toán từ request (EWallet hoặc Card)
            String paymentMethod = METHOD_CARD.equalsIgnoreCase(request.getPaymentMethod())
                    ? METHOD_CARD : METHOD_EWALLET;

            if ("COMPLETED".equals(paypalStatus)) {
                // ── Nhánh thành công ───────────────────────────────────────
                Payment payment = Payment.builder()
                        .invoice(invoice)
                        .amount(capturedAmount)
                        .paymentMethod(paymentMethod)
                        .paymentGateway(GATEWAY_PAYPAL)
                        .transactionId(request.getOrderId())
                        .status(PAYMENT_SUCCESS)
                        .paidAt(LocalDateTime.now())
                        .metadata(metadata)
                        .build();
                paymentRepository.save(payment);

                // Cập nhật Invoice
                invoice.setStatus(INVOICE_PAID);
                invoice.setPaidAt(LocalDateTime.now());
                invoiceRepository.save(invoice);

                // Tự động xử lý commission sau khi thanh toán thành công
                // 1. Tạo CommissionTransaction, cập nhật thu nhập Doctor và snapshot vào Invoice
                try {
                    commissionService.processConsultationCommission(invoice);
                } catch (Exception ex) {
                    // Ghi log lỗi nhưng không rollback giao dịch thanh toán đã thành công
                    log.error("Commission processing failed for invoice {}: {}",
                            invoice.getInvoiceId(), ex.getMessage(), ex);
                }

                log.info("Payment SUCCESS – invoice {} paid via PayPal order {}",
                        invoice.getInvoiceId(), request.getOrderId());

            } else {
                // ── Nhánh thất bại ─────────────────────────────────────────
                Payment payment = Payment.builder()
                        .invoice(invoice)
                        .amount(capturedAmount)
                        .paymentMethod(paymentMethod)
                        .paymentGateway(GATEWAY_PAYPAL)
                        .transactionId(request.getOrderId())
                        .status(PAYMENT_FAILED)
                        .failureReason("PayPal status: " + paypalStatus)
                        .metadata(metadata)
                        .build();
                paymentRepository.save(payment);

                throw new PayPalIntegrationException(
                        "PayPal transaction failed, status: " + paypalStatus);
            }

            return toResponse(invoiceRepository.findById(invoice.getInvoiceId())
                    .orElseThrow(() -> new InvoiceNotFoundException(invoice.getInvoiceId())));

        } catch (PayPalIntegrationException | BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new PayPalIntegrationException("Error occurred while capturing PayPal payment: " + ex.getMessage(), ex);
        }
    }

    @Override
    @Transactional
    public PharmacyOrderResponse capturePharmacyOrderPayPalPayment(PharmacyOrderPayPalCaptureRequest request) {
        PharmacyOrder pharmacyOrder = pharmacyOrderRepository.findById(request.getPharmacyOrderId())
                .orElseThrow(() -> new BadRequestException(
                        "Pharmacy order not found with ID: " + request.getPharmacyOrderId()
                ));

        if (INVOICE_PAID.equalsIgnoreCase(pharmacyOrder.getPaymentStatus())) {
            throw new BadRequestException("This pharmacy order has already been paid.");
        }

        if (paymentRepository.findByTransactionId(request.getOrderId()).isPresent()) {
            throw new BadRequestException(
                    "This PayPal transaction has already been processed: " + request.getOrderId()
            );
        }

        String accessToken = getPayPalAccessToken();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>("{}", headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    payPalConfig.getBaseUrl() + "/v2/checkout/orders/" + request.getOrderId() + "/capture",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null) {
                throw new PayPalIntegrationException("PayPal returned an empty response when capturing the payment.");
            }

            String paypalStatus = (String) responseBody.get("status");
            String metadata;
            try {
                metadata = objectMapper.writeValueAsString(responseBody);
            } catch (Exception e) {
                metadata = responseBody.toString();
            }

            BigDecimal fallbackAmount = pharmacyOrder.getTotalAmount() != null
                    ? pharmacyOrder.getTotalAmount()
                    : BigDecimal.ZERO;
            BigDecimal capturedAmount = extractCapturedAmount(responseBody, fallbackAmount);
            String paymentMethod = METHOD_CARD.equalsIgnoreCase(request.getPaymentMethod())
                    ? METHOD_CARD : METHOD_EWALLET;

            if ("COMPLETED".equals(paypalStatus)) {
                Payment payment = Payment.builder()
                        .invoice(null)
                        .pharmacyOrder(pharmacyOrder)
                        .amount(capturedAmount)
                        .paymentMethod(paymentMethod)
                        .paymentGateway(GATEWAY_PAYPAL)
                        .transactionId(request.getOrderId())
                        .status(PAYMENT_SUCCESS)
                        .paidAt(LocalDateTime.now())
                        .metadata(metadata)
                        .build();
                paymentRepository.save(payment);

                pharmacyOrder.setPaymentStatus(INVOICE_PAID);
                if (pharmacyOrder.getPaymentMethod() == null || pharmacyOrder.getPaymentMethod().isBlank()) {
                    pharmacyOrder.setPaymentMethod(paymentMethod);
                }
                boolean notifyDoctorAboutCompletedPaidOrder = shouldNotifyDoctorAboutCompletedPaidOrder(pharmacyOrder);
                if (notifyDoctorAboutCompletedPaidOrder) {
                    pharmacyOrder.setDoctorCompletionPaidNotified(true);
                }
                pharmacyOrderRepository.save(pharmacyOrder);

                try {
                    commissionService.processPharmacyOrderCommission(pharmacyOrder);
                } catch (Exception ex) {
                    log.error("Pharmacy commission processing failed for order {}: {}",
                            pharmacyOrder.getOrderId(), ex.getMessage(), ex);
                }

                notifyAboutPaidPharmacyOrderAfterCommit(pharmacyOrder);
                if (notifyDoctorAboutCompletedPaidOrder) {
                    notifyDoctorAboutCompletedAndPaidOrderAfterCommit(pharmacyOrder);
                }
                log.info("Payment SUCCESS – pharmacy order {} paid via PayPal order {}",
                        pharmacyOrder.getOrderId(), request.getOrderId());
            } else {
                Payment payment = Payment.builder()
                        .invoice(null)
                        .pharmacyOrder(pharmacyOrder)
                        .amount(capturedAmount)
                        .paymentMethod(paymentMethod)
                        .paymentGateway(GATEWAY_PAYPAL)
                        .transactionId(request.getOrderId())
                        .status(PAYMENT_FAILED)
                        .failureReason("PayPal status: " + paypalStatus)
                        .metadata(metadata)
                        .build();
                paymentRepository.save(payment);
                throw new PayPalIntegrationException("PayPal transaction failed, status: " + paypalStatus);
            }

            PharmacyOrder refreshedOrder = pharmacyOrderRepository.findById(pharmacyOrder.getOrderId())
                    .orElseThrow(() -> new BadRequestException(
                            "Pharmacy order not found with ID: " + pharmacyOrder.getOrderId()
                    ));
            return PharmacyOrderMapper.toResponse(refreshedOrder);

        } catch (PayPalIntegrationException | BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new PayPalIntegrationException(
                    "Error occurred while capturing PayPal payment for pharmacy order: " + ex.getMessage(),
                    ex
            );
        }
    }

    // ========================================================================
    // Tác vụ 3.3 – Xử lý hoàn tiền (Refund Logic)
    // ========================================================================

    @Override
    @Transactional
    public InvoiceResponse processRefund(Integer paymentId, String refundReason) {

        // 1. Tìm bản ghi Payment
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new BadRequestException("Payment not found with ID: " + paymentId));

        // 2. Chỉ hoàn tiền Payment đang ở trạng thái SUCCESS
        if (!PAYMENT_SUCCESS.equals(payment.getStatus())) {
            throw new BadRequestException(
                    "Only successful payments can be refunded. Current status: " + payment.getStatus());
        }

        // 3. Lấy Invoice liên kết
        Invoice invoice = payment.getInvoice();
        if (invoice == null) {
            throw new BadRequestException("Payment " + paymentId + " has no associated invoice.");
        }

        // 4. Cập nhật Payment → REFUNDED
        payment.setStatus("REFUNDED");
        payment.setRefundedAmount(payment.getAmount());
        payment.setRefundedAt(LocalDateTime.now());
        payment.setRefundReason(refundReason != null ? refundReason : "Refund requested");
        paymentRepository.save(payment);

        // 5. Cập nhật Invoice → REFUNDED
        invoice.setStatus("Refunded");
        invoiceRepository.save(invoice);

        // 6. Truy vết và hoàn lại commission của đối tác (Doctor + Pharmacy)
        try {
            commissionService.processRefund(invoice.getInvoiceId());
        } catch (Exception ex) {
            log.error("Commission refund processing failed for invoice {}: {}",
                    invoice.getInvoiceId(), ex.getMessage(), ex);
        }

        log.info("Refund processed: paymentId={}, invoiceId={}, amount={}",
                paymentId, invoice.getInvoiceId(), payment.getAmount());

        return toResponse(invoiceRepository.findById(invoice.getInvoiceId())
                .orElseThrow(() -> new InvoiceNotFoundException(invoice.getInvoiceId())));
    }

    // ========================================================================
    // Private helpers
    // ========================================================================

    /** Đổi client-credentials lấy PayPal access token. */
    private String getPayPalAccessToken() {
        String credentials = payPalConfig.getClientId() + ":" + payPalConfig.getClientSecret();
        String encoded = Base64.getEncoder()
                .encodeToString(credentials.getBytes(StandardCharsets.UTF_8));

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + encoded);
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");

        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(form, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    payPalConfig.getBaseUrl() + "/v1/oauth2/token",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );
            Map<?, ?> body = response.getBody();
            if (body == null || !body.containsKey("access_token")) {
                throw new PayPalIntegrationException("Failed to receive access_token from PayPal.");
            }
            return (String) body.get("access_token");
        } catch (PayPalIntegrationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new PayPalIntegrationException("Error occurred while authenticating with PayPal: " + ex.getMessage(), ex);
        }
    }

    /**
    * Tạo số hóa đơn duy nhất theo định dạng INV-YYYYMMDD-XXXX.
    * Dùng ngày hiện tại + số thứ tự 4 chữ số dựa trên số hóa đơn trong ngày.
     */
    private String generateInvoiceNumber() {
        String datePart = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = invoiceRepository.count() + 1;
        return String.format("INV-%s-%04d", datePart, count);
    }

    /**
     * Thử trích xuất số tiền đã capture từ phản hồi PayPal.
     * Nếu lỗi phân tích, sẽ dùng số tiền của hóa đơn làm giá trị dự phòng.
     */
    @SuppressWarnings("unchecked")
    private BigDecimal extractCapturedAmount(Map<String, Object> body, BigDecimal fallback) {
        try {
            List<Map<String, Object>> units =
                    (List<Map<String, Object>>) body.get("purchase_units");
            if (units != null && !units.isEmpty()) {
                Map<String, Object> payments =
                        (Map<String, Object>) units.get(0).get("payments");
                if (payments != null) {
                    List<Map<String, Object>> captures =
                            (List<Map<String, Object>>) payments.get("captures");
                    if (captures != null && !captures.isEmpty()) {
                        Map<String, Object> amount =
                                (Map<String, Object>) captures.get(0).get("amount");
                        if (amount != null) {
                            return new BigDecimal(amount.get("value").toString())
                                    .setScale(2, RoundingMode.HALF_UP);
                        }
                    }
                }
            }
        } catch (Exception ignored) {
            // trả về giá trị dự phòng
        }
        return fallback;
    }

    // ─── Ánh xạ DTO ────────────────────────────────────────────────────────

    private void notifyAboutPaidPharmacyOrderAfterCommit(PharmacyOrder pharmacyOrder) {
        User patientUser = pharmacyOrder.getPatient() != null ? pharmacyOrder.getPatient().getUser() : null;
        User pharmacyUser = pharmacyOrder.getPharmacy() != null ? pharmacyOrder.getPharmacy().getUser() : null;
        String actionUrl = "/pharmacy-orders/" + pharmacyOrder.getOrderId();
        String orderNumber = pharmacyOrder.getOrderNumber() != null
                ? pharmacyOrder.getOrderNumber()
                : String.valueOf(pharmacyOrder.getOrderId());

        runAfterCommit("pharmacy order payment notification", () -> {
            if (patientUser != null) {
                String patientTitle = "Payment successful";
                String patientMessage = String.format(
                        "Payment for pharmacy order %s was captured successfully.",
                        orderNumber
                );

                notificationService.sendWebSocketNotification(
                        patientUser,
                        NotificationType.INVOICE_PAID,
                        patientTitle,
                        patientMessage,
                        pharmacyOrder.getOrderId(),
                        actionUrl
                );

                boolean hasActiveMobileToken = !deviceTokenRepository
                        .findByUser_IdAndActiveTrue(patientUser.getId())
                        .isEmpty();

                if (hasActiveMobileToken) {
                    notificationService.sendMobilePushNotification(
                            patientUser,
                            NotificationType.INVOICE_PAID,
                            patientTitle,
                            patientMessage,
                            NotificationPriority.NORMAL,
                            pharmacyOrder.getOrderId(),
                            actionUrl
                    );
                }
            }

            if (pharmacyUser != null) {
                String pharmacyTitle = "Order paid";
                String pharmacyMessage = String.format(
                        "Patient payment for order %s has been confirmed.",
                        orderNumber
                );

                notificationService.sendWebSocketNotification(
                        pharmacyUser,
                        NotificationType.INVOICE_PAID,
                        pharmacyTitle,
                        pharmacyMessage,
                        pharmacyOrder.getOrderId(),
                        actionUrl
                );
            }
        });
    }

    private void notifyDoctorAboutCompletedAndPaidOrderAfterCommit(PharmacyOrder pharmacyOrder) {
        User doctorUser = resolveDoctorUser(pharmacyOrder, NotificationType.INVOICE_PAID);
        if (doctorUser == null) {
            return;
        }

        String actionUrl = "/pharmacy-orders/" + pharmacyOrder.getOrderId();
        String orderNumber = pharmacyOrder.getOrderNumber() != null
                ? pharmacyOrder.getOrderNumber()
                : String.valueOf(pharmacyOrder.getOrderId());
        String patientName = pharmacyOrder.getPatient() != null
                ? safeValue(pharmacyOrder.getPatient().getFullName(), "Unknown patient")
                : "Unknown patient";
        String pharmacyName = pharmacyOrder.getPharmacy() != null
                ? safeValue(pharmacyOrder.getPharmacy().getName(), "the pharmacy")
                : "the pharmacy";

        runAfterCommit("doctor completed and paid pharmacy order notification", () ->
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
                        pharmacyOrder.getOrderId(),
                        actionUrl
                )
        );
    }

    private boolean shouldNotifyDoctorAboutCompletedPaidOrder(PharmacyOrder pharmacyOrder) {
        return PHARMACY_ORDER_COMPLETED.equalsIgnoreCase(safeValue(pharmacyOrder.getStatus(), ""))
                && INVOICE_PAID.equalsIgnoreCase(safeValue(pharmacyOrder.getPaymentStatus(), ""))
                && pharmacyOrder.getPrescriptionHeader() != null
                && pharmacyOrder.getPrescriptionHeader().getDoctor() != null
                && !Boolean.TRUE.equals(pharmacyOrder.getDoctorCompletionPaidNotified());
    }

    private User resolveDoctorUser(PharmacyOrder pharmacyOrder, NotificationType type) {
        if (pharmacyOrder == null
                || pharmacyOrder.getPrescriptionHeader() == null
                || pharmacyOrder.getPrescriptionHeader().getDoctor() == null) {
            log.warn("Cannot send {} notification: pharmacy order or prescribing doctor is missing", type);
            return null;
        }

        User user = pharmacyOrder.getPrescriptionHeader().getDoctor().getUser();
        if (user == null || user.getId() == null || user.getId().isBlank()) {
            log.warn("Cannot send {} notification: prescribing doctor is not mapped to a user", type);
            return null;
        }

        return user;
    }

    private String safeValue(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
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

    private InvoiceResponse toResponse(Invoice invoice) {
        List<InvoiceResponse.PaymentSummary> paymentSummaries = Collections.emptyList();
        if (invoice.getPayments() != null) {
            paymentSummaries = invoice.getPayments().stream()
                    .map(p -> InvoiceResponse.PaymentSummary.builder()
                            .paymentId(p.getPaymentId())
                            .amount(p.getAmount())
                            .paymentMethod(p.getPaymentMethod())
                            .paymentGateway(p.getPaymentGateway())
                            .transactionId(p.getTransactionId())
                            .status(p.getStatus())
                            .paidAt(p.getPaidAt())
                            .build())
                    .collect(Collectors.toList());
        }

        return InvoiceResponse.builder()
                .invoiceId(invoice.getInvoiceId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .appointmentId(invoice.getAppointment() != null
                        ? invoice.getAppointment().getAppointmentId() : null)
                .patientId(invoice.getPatient() != null
                        ? invoice.getPatient().getPatientId() : null)
                .consultationFee(invoice.getConsultationFee())
                .medicineFee(invoice.getMedicineFee())
                .deliveryFee(invoice.getDeliveryFee())
                .discount(invoice.getDiscount())
                .tax(invoice.getTax())
                .amount(invoice.getAmount())
                .status(invoice.getStatus())
                .issueDate(invoice.getIssueDate())
                .dueDate(invoice.getDueDate())
                .paidAt(invoice.getPaidAt())
                .notes(invoice.getNotes())
                // Commission fields – ánh xạ từ Invoice entity
                // ⚠️ Controller phải lọc bỏ các trường này khi trả về cho Patient
                .platformFee(invoice.getPlatformFee())
                .doctorEarning(invoice.getDoctorEarning())
                .commissionRate(invoice.getCommissionRate())
                .payments(paymentSummaries)
                .build();
    }
}
