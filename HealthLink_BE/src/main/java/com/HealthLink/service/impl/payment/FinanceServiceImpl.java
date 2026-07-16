package com.HealthLink.service.impl.payment;

import com.HealthLink.config.PayPalConfig;
import com.HealthLink.dto.consultation.FollowUpResponse;
import com.HealthLink.dto.payment.FollowUpHomeVisitDetailsRequest;
import com.HealthLink.dto.payment.AppointmentPayPalCaptureRequest;
import com.HealthLink.dto.payment.AppointmentPayPalOrderRequest;
import com.HealthLink.dto.payment.InvoiceResponse;
import com.HealthLink.dto.payment.PharmacyOrderPayPalCaptureRequest;
import com.HealthLink.dto.payment.PharmacyOrderPayPalOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.dto.request.AppointmentRequest;
import com.HealthLink.dto.response.AppointmentResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.entity.Invoice;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.Payment;
import com.HealthLink.entity.HomeVisitDetails;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.utility.DoctorServiceHelper;
import com.HealthLink.exception.InvoiceNotFoundException;
import com.HealthLink.exception.PayPalIntegrationException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.notification.DeviceTokenRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.repository.payment.InvoiceRepository;
import com.HealthLink.repository.payment.PaymentRepository;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.HealthLink.service.appointment.AppointmentService;
import com.HealthLink.service.followup.FollowUpAppointmentService;
import com.HealthLink.service.notification.NotificationService;
import com.HealthLink.service.payment.CommissionService;
import com.HealthLink.service.payment.FinanceService;
import com.HealthLink.service.payment.InvoicePdfService;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.entity.enums.FollowUpStatus;
import com.HealthLink.entity.enums.HomeVisitProposalStatus;
import com.HealthLink.entity.User;
import com.HealthLink.utility.mapper.PharmacyOrderMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import com.HealthLink.dto.response.HomeVisitEstimateResponse;
import com.HealthLink.entity.AppointmentHomeVisitService;
import com.HealthLink.entity.HomeVisitService;
import com.HealthLink.repository.appointment.AppointmentHomeVisitServiceRepository;
import com.HealthLink.repository.appointment.HomeVisitServiceRepository;
import com.HealthLink.service.homevisit.HomeVisitLocationService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Cài đặt của {@link FinanceService}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FinanceServiceImpl implements FinanceService {

    private static final String TYPE_ONLINE = "Online";
    private static final String TYPE_HOME_VISIT = "HomeVisit";

    // ── Các hằng trạng thái ─────────────────────────────────────────────────
    private static final String INVOICE_PAID = "PAID";
    private static final String INVOICE_REFUNDED = "REFUNDED";

    private static final String PAYMENT_PENDING = "PENDING";
    private static final String PAYMENT_SUCCESS = "SUCCESS";
    private static final String PAYMENT_FAILED = "FAILED";
    private static final String PAYMENT_REFUNDED = "REFUNDED";

    private static final String GATEWAY_PAYPAL = "PayPal";
    private static final String METHOD_EWALLET = "EWallet";
    private static final String METHOD_CARD = "Card";

    private static final String APPT_PENDING_PAYMENT = "PENDINGPAYMENT";
    private static final String APPT_SCHEDULED = "SCHEDULED";
    private static final String APPOINTMENT_CHECKOUT_REFERENCE_ID = "appointment-checkout";
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_PATIENT = "PATIENT";
    private static final String ROLE_DOCTOR = "DOCTOR";
    private static final String PHARMACY_ORDER_PENDING = "PENDING";
    private static final String PHARMACY_ORDER_CONFIRMED = "CONFIRMED";
    private static final String PHARMACY_ORDER_PREPARING = "PREPARING";
    private static final String PHARMACY_ORDER_COMPLETED = "COMPLETED";
    // Phí phụ trội khi patient tự chọn bác sĩ (MANUAL_SELECTED) — lấy từ config server,
    // KHÔNG tin giá trị manualSelectionFee do client gửi lên (tránh thao túng giá).
    @Value("${booking.manual-doctor-selection-fee:10.00}")
    private BigDecimal manualDoctorSelectionFee;

    // ── Các phụ thuộc ───────────────────────────────────────────────────────
    private final PayPalConfig payPalConfig;

    @Qualifier("paypalRestTemplate")
    private final RestTemplate restTemplate;

    private final ObjectMapper objectMapper;

    private final AppointmentRepository appointmentRepository;
    private final ConsultationRepository consultationRepository;
    private final AppointmentService appointmentService;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final PharmacyOrderRepository pharmacyOrderRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final DeviceTokenRepository deviceTokenRepository;
    private final HomeVisitLocationService homeVisitLocationService;
    private final HomeVisitServiceRepository homeVisitServiceRepository;
    private final AppointmentHomeVisitServiceRepository appointmentHomeVisitServiceRepository;
    private final DoctorScheduleRepository doctorScheduleRepository;

    private final FollowUpAppointmentService followUpAppointmentService;

    /**
     * Service xử lý logic chiết khấu sau khi thanh toán thành công
     */
    private final CommissionService commissionService;

    /**
     * Service xử lý tạo PDF hóa đơn
     */
    private final InvoicePdfService invoicePdfService;

    // ========================================================================
    // Tác vụ 3.1 – Tạo hóa đơn
    // ========================================================================
    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoice(Integer invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));
        return toAuthorizedResponse(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getInvoicesByPatient(String patientId) {
        assertPatientHistoryAccess(patientId);
        return invoiceRepository.findByPatient_PatientId(patientId)
                .stream()
                .map(this::toAuthorizedResponse)
                .collect(Collectors.toList());
    }

    // ========================================================================
    // Tác vụ 3.2 – Tích hợp PayPal
    // ========================================================================
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> createAppointmentPayPalOrder(AppointmentPayPalOrderRequest request) {
        assertAppointmentCheckoutAccess(request.getPatientId());

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new BadRequestException("Patient not found with ID: " + request.getPatientId()));
        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new BadRequestException("Doctor not found with ID: " + request.getDoctorId()));

        request.setConsultationType(
                normalizeConsultationTypeForBooking(request.getConsultationType())
        );

        checkDoctorSupportsConsultationType(doctor, request.getConsultationType());

        BigDecimal amount = resolveAppointmentCheckoutAmount(
                doctor,
                request.getConsultationType(),
                request.getVisitLatitude(),
                request.getVisitLongitude(),
                request.getHomeVisitServiceIds()
        );

        if (!TYPE_HOME_VISIT.equalsIgnoreCase(request.getConsultationType())
                && "MANUAL_SELECTED".equalsIgnoreCase(request.getDoctorSelectionMode())) {
            amount = amount.add(resolveManualSelectionFee());
        }
        String currency = request.getCurrency() != null ? request.getCurrency() : "USD";
        String amountStr = amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
        String description = String.format(
                "HealthLink Appointment %s with %s",
                request.getConsultationType(),
                safeValue(doctor.getFullName(), "Doctor")
        );

        Map<String, Object> amountMap = Map.of(
                "currency_code", currency,
                "value", amountStr
        );
        Map<String, Object> purchaseUnit = Map.of(
                "reference_id", APPOINTMENT_CHECKOUT_REFERENCE_ID,
                "description", description,
                "custom_id", String.format("%s:%s", patient.getPatientId(), doctor.getDoctorId()),
                "amount", amountMap
        );
        Map<String, Object> applicationContext = Map.of(
                "return_url", "healthlink://paypal-success",
                "cancel_url", "healthlink://paypal-cancel",
                "user_action", "PAY_NOW",
                "brand_name", "HealthLink"
        );

        Map<String, Object> payload = Map.of(
                "intent", "CAPTURE",
                "purchase_units", List.of(purchaseUnit),
                "application_context", applicationContext
        );

        try {
            String accessToken = getPayPalAccessToken();

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

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

            Object idObj = responseBody.get("id");
            if (idObj == null) {
                throw new PayPalIntegrationException("PayPal response does not contain order ID.");
            }

            String approvalUrl = null;

            Object linksObj = responseBody.get("links");
            if (linksObj instanceof List<?> links) {
                for (Object linkObj : links) {
                    if (linkObj instanceof Map<?, ?> link) {
                        Object rel = link.get("rel");
                        Object href = link.get("href");

                        if ("approve".equalsIgnoreCase(String.valueOf(rel))) {
                            approvalUrl = String.valueOf(href);
                            break;
                        }
                    }
                }
            }

            String orderId = idObj.toString();
            log.info("PayPal appointment checkout order created: {} for patient {} doctor {}",
                    orderId, patient.getPatientId(), doctor.getDoctorId());

            Map<String, Object> result = new HashMap<>();
            result.put("orderId", orderId);
            result.put("amount", amount);
            result.put("currency", currency);
            result.put("approvalUrl", approvalUrl);
            result.put("links", responseBody.get("links"));
            return result;

        } catch (PayPalIntegrationException ex) {
            throw ex;
        } catch (HttpStatusCodeException ex) {
            throw payPalApiException("PayPal appointment order creation", ex);
        } catch (Exception ex) {
            throw new PayPalIntegrationException(
                    "Error occurred while creating PayPal order for appointment checkout: " + ex.getMessage(),
                    ex
            );
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

        if (!PAYMENT_PENDING.equalsIgnoreCase(safeValue(pharmacyOrder.getPaymentStatus(), ""))) {
            throw new BadRequestException("This pharmacy order payment status is not valid for payment.");
        }

        if ("CANCELLED".equalsIgnoreCase(safeValue(pharmacyOrder.getStatus(), ""))
                || "REFUNDED".equalsIgnoreCase(safeValue(pharmacyOrder.getStatus(), ""))
                || "REVISION_REQUESTED".equalsIgnoreCase(safeValue(pharmacyOrder.getStatus(), ""))) {
            throw new BadRequestException("This pharmacy order cannot be paid due to its current status.");
        }

        if (isRetailDirectOrder(pharmacyOrder)
                && PHARMACY_ORDER_PENDING.equalsIgnoreCase(safeValue(pharmacyOrder.getStatus(), ""))) {
            throw new BadRequestException("Retail order must be confirmed by the pharmacy before payment.");
        }

        if (pharmacyOrder.getTotalAmount() == null || pharmacyOrder.getTotalAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Order total amount must be greater than zero.");
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
    public InvoiceResponse captureAppointmentPayPalPayment(AppointmentPayPalCaptureRequest request) {
        assertAppointmentCheckoutAccess(request.getPatientId());

        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new BadRequestException("Doctor not found with ID: " + request.getDoctorId()));

        request.setConsultationType(
                normalizeConsultationTypeForBooking(request.getConsultationType())
        );
        checkDoctorSupportsConsultationType(doctor, request.getConsultationType());

        BigDecimal expectedAmount = resolveAppointmentCheckoutAmount(
                doctor,
                request.getConsultationType(),
                request.getVisitLatitude(),
                request.getVisitLongitude(),
                request.getHomeVisitServiceIds()
        );

        if (!TYPE_HOME_VISIT.equalsIgnoreCase(request.getConsultationType())
                && "MANUAL_SELECTED".equalsIgnoreCase(request.getDoctorSelectionMode())) {
            expectedAmount = expectedAmount.add(resolveManualSelectionFee());
        }

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
            log.info("PayPal appointment checkout capture status: {} for order {}",
                    paypalStatus, request.getOrderId());

            String metadata;
            try {
                metadata = objectMapper.writeValueAsString(responseBody);
            } catch (Exception e) {
                metadata = responseBody.toString();
            }

            BigDecimal capturedAmount = extractCapturedAmount(responseBody, expectedAmount);
            validatePayPalCaptureMatchesAppointmentCheckout(responseBody, expectedAmount);

            String paymentMethod = METHOD_CARD.equalsIgnoreCase(request.getPaymentMethod())
                    ? METHOD_CARD : METHOD_EWALLET;

            Consultation sourceConsultation = resolveSourceConsultation(request);

            if (!"COMPLETED".equals(paypalStatus)) {
                Payment failedPayment = Payment.builder()
                        .amount(capturedAmount)
                        .paymentMethod(paymentMethod)
                        .paymentGateway(GATEWAY_PAYPAL)
                        .transactionId(request.getOrderId())
                        .status(PAYMENT_FAILED)
                        .failureReason("PayPal status: " + paypalStatus)
                        .metadata(metadata)
                        .build();
                paymentRepository.save(failedPayment);

                throw new PayPalIntegrationException(
                        "PayPal transaction failed, status: " + paypalStatus);
            }

            AppointmentRequest appointmentRequest = toAppointmentRequest(request);
            AppointmentResponse createdAppointment = appointmentService.createAppointment(appointmentRequest);
            Integer appointmentId = createdAppointment.getAppointmentId();

            Appointment appointment = appointmentRepository.findById(appointmentId)
                    .orElseThrow(() -> new BadRequestException(
                    "Appointment not found after payment capture: " + appointmentId));

            LocalDateTime paidAt = LocalDateTime.now();
            appointment.setStatus(APPT_SCHEDULED);
            appointment.setConfirmedAt(paidAt);
            // appointment.fee (từ AppointmentServiceImpl.createAppointment) chưa gồm
            // manualSelectionFee/home-visit servicesTotal — ghi đè bằng tổng bill đầy đủ
            // đã tính ở expectedAmount, để hoa hồng bác sĩ (đọc từ invoice.consultationFee)
            // và các màn hình hiển thị "Fee" khác đều tính đúng trên tổng bill thật.
            appointment.setFee(expectedAmount.setScale(2, RoundingMode.HALF_UP));
            if (sourceConsultation != null) {
                appointment.setFollowUpSourceAppointmentId(sourceConsultation.getAppointment().getAppointmentId());
            }
            appointment = appointmentRepository.save(appointment);

            if (TYPE_HOME_VISIT.equalsIgnoreCase(appointment.getConsultationType())) {
                saveAppointmentHomeVisitServices(appointment, request.getHomeVisitServiceIds());
            }

            linkSourceConsultation(sourceConsultation, appointment);

            notifyDoctorAboutNewAppointmentAfterCommit(appointment);

            BigDecimal consultationFee = appointment.getFee();

            BigDecimal invoiceAmount = expectedAmount.setScale(2, RoundingMode.HALF_UP);

            Invoice invoice = Invoice.builder()
                    .appointment(appointment)
                    .patient(appointment.getPatient())
                    .invoiceNumber(generateInvoiceNumber())
                    .consultationFee(consultationFee)
                    .medicineFee(BigDecimal.ZERO)
                    .deliveryFee(BigDecimal.ZERO)
                    .discount(BigDecimal.ZERO)
                    .tax(BigDecimal.ZERO)
                    .amount(invoiceAmount)
                    .status(INVOICE_PAID)
                    .issueDate(paidAt)
                    .dueDate(paidAt)
                    .paidAt(paidAt)
                    .build();
            invoice = invoiceRepository.save(invoice);
            appointment.setInvoice(invoice);

            Payment payment = Payment.builder()
                    .invoice(invoice)
                    .amount(capturedAmount)
                    .paymentMethod(paymentMethod)
                    .paymentGateway(GATEWAY_PAYPAL)
                    .transactionId(request.getOrderId())
                    .status(PAYMENT_SUCCESS)
                    .paidAt(paidAt)
                    .metadata(metadata)
                    .build();
            payment.setGatewayCaptureId(extractGatewayCaptureId(responseBody));
            paymentRepository.save(payment);

            // Xử lý commission cho bác sĩ (tính theo tỷ lệ Online/Offline tương ứng)
            try {
                commissionService.processConsultationCommission(invoice);
            } catch (Exception ex) {
                log.error("Commission processing failed for appointment {}: {}",
                        appointment.getAppointmentId(), ex.getMessage(), ex);
            }

            log.info("Appointment {} created after PayPal payment order {}",
                    appointment.getAppointmentId(), request.getOrderId());

            Integer capturedInvoiceId = invoice.getInvoiceId();
            return toAuthorizedResponse(invoiceRepository.findById(capturedInvoiceId)
                    .orElseThrow(() -> new InvoiceNotFoundException(capturedInvoiceId)));

        } catch (PayPalIntegrationException | BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new PayPalIntegrationException(
                    "Error occurred while capturing PayPal appointment payment: " + ex.getMessage(),
                    ex
            );
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

        if (INVOICE_PAID.equalsIgnoreCase(safeValue(pharmacyOrder.getPaymentStatus(), ""))) {
            throw new BadRequestException("This pharmacy order has already been paid.");
        }

        if ("CANCELLED".equalsIgnoreCase(safeValue(pharmacyOrder.getStatus(), ""))
                || "REFUNDED".equalsIgnoreCase(safeValue(pharmacyOrder.getStatus(), ""))
                || "REVISION_REQUESTED".equalsIgnoreCase(safeValue(pharmacyOrder.getStatus(), ""))) {
            throw new BadRequestException("This pharmacy order cannot be paid due to its current status.");
        }

        if (isRetailDirectOrder(pharmacyOrder)
                && PHARMACY_ORDER_PENDING.equalsIgnoreCase(safeValue(pharmacyOrder.getStatus(), ""))) {
            throw new BadRequestException("Retail order must be confirmed by the pharmacy before payment.");
        }

        if (pharmacyOrder.getTotalAmount() == null || pharmacyOrder.getTotalAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Order total amount must be greater than zero.");
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
                LocalDateTime paidAt = LocalDateTime.now();

                // Idempotency: check if invoice already exists for this pharmacy order
                Invoice invoice = invoiceRepository.findByPharmacyOrder_OrderId(pharmacyOrder.getOrderId())
                        .orElse(null);
                if (invoice == null) {
                    invoice = Invoice.builder()
                            .pharmacyOrder(pharmacyOrder)
                            .patient(pharmacyOrder.getPatient())
                            .invoiceNumber(generateInvoiceNumber())
                            .medicineFee(pharmacyOrder.getMedicineAmount() != null
                                    ? pharmacyOrder.getMedicineAmount() : BigDecimal.ZERO)
                            .deliveryFee(pharmacyOrder.getDeliveryFee() != null
                                    ? pharmacyOrder.getDeliveryFee() : BigDecimal.ZERO)
                            .amount(pharmacyOrder.getTotalAmount() != null
                                    ? pharmacyOrder.getTotalAmount() : BigDecimal.ZERO)
                            .status(INVOICE_PAID)
                            .issueDate(paidAt)
                            .paidAt(paidAt)
                            .build();
                    invoiceRepository.save(invoice);
                }

                Payment payment = Payment.builder()
                        .invoice(invoice)
                        .pharmacyOrder(pharmacyOrder)
                        .amount(capturedAmount)
                        .paymentMethod(paymentMethod)
                        .paymentGateway(GATEWAY_PAYPAL)
                        .transactionId(request.getOrderId())
                        .status(PAYMENT_SUCCESS)
                        .paidAt(paidAt)
                        .metadata(metadata)
                        .build();
                payment.setGatewayCaptureId(extractGatewayCaptureId(responseBody));
                paymentRepository.save(payment);

                pharmacyOrder.setPaymentStatus(INVOICE_PAID);
                if (pharmacyOrder.getPaymentMethod() == null || pharmacyOrder.getPaymentMethod().isBlank()) {
                    pharmacyOrder.setPaymentMethod(paymentMethod);
                }

                String currentOrderStatus = safeValue(pharmacyOrder.getStatus(), "");
                if (Set.of(PHARMACY_ORDER_PENDING, PHARMACY_ORDER_CONFIRMED)
                        .contains(currentOrderStatus.toUpperCase())) {
                    if (pharmacyOrder.getConfirmedAt() == null) {
                        pharmacyOrder.setConfirmedAt(paidAt);
                    }
                    pharmacyOrder.setStatus(PHARMACY_ORDER_PREPARING);
                    pharmacyOrder.setPreparingAt(paidAt);
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

    @Override
    @Transactional
    public FollowUpResponse saveFollowUpLocation(Integer appointmentId, FollowUpHomeVisitDetailsRequest request) {
        Consultation consultation = consultationRepository
                .findByAppointment_AppointmentId(appointmentId)
                .orElseThrow(() -> new BadRequestException("Consultation not found: " + appointmentId));

        if (consultation.getFollowUpStatus() != FollowUpStatus.PENDING_PAYMENT) {
            throw new BadRequestException("Follow-up is not in PENDING_PAYMENT status");
        }
        if (!TYPE_HOME_VISIT.equalsIgnoreCase(normalizeConsultationTypeForBooking(consultation.getConsultationType()))) {
            throw new BadRequestException("Only HomeVisit follow-up can set location");
        }

        Appointment source = consultation.getAppointment();
        HomeVisitDetails sourceDetails = source != null ? source.getHomeVisitDetails() : null;
        if (hasUsableHomeVisitDetails(sourceDetails)) {
            copySourceDetailsToConsultation(consultation, sourceDetails);
        } else {
            validateAndApplyPatientDetails(consultation, request);
        }

        List<Integer> serviceIds = request != null ? request.getHomeVisitServiceIds() : null;
        consultation.setHomeVisitServiceIds(toServiceIdCsv(serviceIds));
        consultationRepository.save(consultation);

        return toFollowUpPaymentResponse(consultation);
    }

    @Override
    @Transactional
    public Map<String, Object> createFollowUpPayPalOrder(Integer appointmentId) {
        Consultation consultation = consultationRepository
                .findByAppointment_AppointmentId(appointmentId)
                .orElseThrow(() -> new BadRequestException("Consultation not found for appointment: " + appointmentId));

        if (consultation.getFollowUpStatus() != FollowUpStatus.PENDING_PAYMENT) {
            throw new BadRequestException("Follow-up is not in PENDING_PAYMENT status");
        }

        ensureFollowUpHomeVisitLocation(consultation);

        Appointment sourceAppointment = consultation.getAppointment();
        Doctor doctor = sourceAppointment.getDoctor();
        List<Integer> serviceIds = parseServiceIds(consultation.getHomeVisitServiceIds());
        BigDecimal amount = resolveAppointmentCheckoutAmount(doctor, consultation.getConsultationType(), consultation.getHomeVisitLatitude(), consultation.getHomeVisitLongitude(), serviceIds);
        String currency = "USD";
        String amountStr = amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
        String description = String.format(
                "HealthLink Follow-up %s with %s",
                consultation.getConsultationType(),
                safeValue(doctor.getFullName(), "Doctor")
        );

        Map<String, Object> amountMap = Map.of("currency_code", currency, "value", amountStr);
        Map<String, Object> purchaseUnit = Map.of(
                "reference_id", "follow-up-" + appointmentId,
                "description", description,
                "custom_id", String.format("%s:%d", sourceAppointment.getPatient().getPatientId(), appointmentId),
                "amount", amountMap
        );
        Map<String, Object> applicationContext = Map.of(
                "return_url", "healthlink://paypal-success",
                "cancel_url", "healthlink://paypal-cancel",
                "user_action", "PAY_NOW",
                "brand_name", "HealthLink"
        );

        Map<String, Object> payload = Map.of(
                "intent", "CAPTURE",
                "purchase_units", List.of(purchaseUnit),
                "application_context", applicationContext
        );

        try {
            String accessToken = getPayPalAccessToken();
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    payPalConfig.getBaseUrl() + "/v2/checkout/orders",
                    HttpMethod.POST, entity, Map.class);

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null) {
                throw new PayPalIntegrationException("Empty PayPal response");
            }

            String orderId = (String) responseBody.get("id");
            String approvalUrl = null;
            Object linksObj = responseBody.get("links");
            if (linksObj instanceof List<?> links) {
                for (Object linkObj : links) {
                    if (linkObj instanceof Map<?, ?> link) {
                        if ("approve".equalsIgnoreCase(String.valueOf(link.get("rel")))) {
                            approvalUrl = String.valueOf(link.get("href"));
                            break;
                        }
                    }
                }
            }

            log.info("PayPal follow-up order created: {} for appointmentId={}", orderId, appointmentId);

            Map<String, Object> result = new HashMap<>();
            result.put("orderId", orderId);
            result.put("amount", amount);
            result.put("currency", currency);
            result.put("approvalUrl", approvalUrl);
            result.put("links", responseBody.get("links"));
            return result;

        } catch (PayPalIntegrationException ex) {
            throw ex;
        } catch (HttpStatusCodeException ex) {
            throw payPalApiException("PayPal follow-up order creation", ex);
        } catch (Exception ex) {
            throw new PayPalIntegrationException("Error creating PayPal follow-up order: " + ex.getMessage(), ex);
        }
    }

    @Override
    @Transactional
    public FollowUpResponse captureFollowUpPayPalPayment(String orderId, Integer appointmentId, String paymentMethod) {
        Consultation consultation = consultationRepository
                .findByAppointment_AppointmentId(appointmentId)
                .orElseThrow(() -> new BadRequestException("Consultation not found for appointment: " + appointmentId));

        if (consultation.getFollowUpStatus() != FollowUpStatus.PENDING_PAYMENT) {
            throw new BadRequestException("Follow-up is not in PENDING_PAYMENT status");
        }

        if (paymentRepository.findByTransactionId(orderId).isPresent()) {
            throw new BadRequestException("PayPal transaction already processed: " + orderId);
        }

        ensureFollowUpHomeVisitLocation(consultation);

        Appointment sourceAppointment = consultation.getAppointment();

        LocalDateTime followUpDate = consultation.getFollowUpDate();
        if (followUpDate == null) {
            throw new BadRequestException("Follow-up date not set on consultation");
        }

        Appointment existingFollowUpAppointment = consultation.getFollowUpAppointmentId() == null
                ? null
                : appointmentRepository.findById(consultation.getFollowUpAppointmentId()).orElse(null);
        if (existingFollowUpAppointment == null
                || "CANCELLED".equalsIgnoreCase(existingFollowUpAppointment.getStatus())) {
            existingFollowUpAppointment = null;
            followUpAppointmentService.validateFollowUpSlot(
                    sourceAppointment,
                    followUpDate,
                    consultation.getConsultationType());
        }

        Doctor doctor = sourceAppointment.getDoctor();
        Patient patient = sourceAppointment.getPatient();
        List<Integer> serviceIds = parseServiceIds(consultation.getHomeVisitServiceIds());
        BigDecimal expectedAmount = resolveAppointmentCheckoutAmount(doctor, consultation.getConsultationType(), consultation.getHomeVisitLatitude(), consultation.getHomeVisitLongitude(), serviceIds);

        String accessToken = getPayPalAccessToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    payPalConfig.getBaseUrl() + "/v2/checkout/orders/" + orderId + "/capture",
                    HttpMethod.POST, new HttpEntity<>("{}", headers), Map.class);

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null) {
                throw new PayPalIntegrationException("Empty PayPal capture response");
            }

            String paypalStatus = (String) responseBody.get("status");
            String metadata = objectMapper.writeValueAsString(responseBody);
            BigDecimal capturedAmount = extractCapturedAmount(responseBody, expectedAmount);
            validatePayPalCaptureMatchesFollowUpCheckout(responseBody, expectedAmount, appointmentId);
            String payMethod = "EWallet";

            if (!"COMPLETED".equals(paypalStatus)) {
                Payment failedPayment = Payment.builder()
                        .amount(capturedAmount).paymentMethod(payMethod)
                        .paymentGateway(GATEWAY_PAYPAL).transactionId(orderId)
                        .status(PAYMENT_FAILED)
                        .failureReason("PayPal status: " + paypalStatus)
                        .metadata(metadata).build();
                paymentRepository.save(failedPayment);
                throw new PayPalIntegrationException("PayPal transaction failed, status: " + paypalStatus);
            }

            Appointment followUpAppointment = existingFollowUpAppointment != null
                    ? existingFollowUpAppointment
                    : new Appointment();
            followUpAppointment.setPatient(patient);
            followUpAppointment.setDoctor(doctor);
            followUpAppointment.setAppointmentTime(followUpDate);
            int followUpSlotMinutes = resolveFollowUpPaymentSlotDuration(
                    doctor.getDoctorId(),
                    followUpDate,
                    consultation.getConsultationType());
            followUpAppointment.setEndTime(followUpDate.plusMinutes(followUpSlotMinutes));
            followUpAppointment.setStatus(APPT_SCHEDULED);
            followUpAppointment.setConsultationType(consultation.getConsultationType());
            followUpAppointment.setConfirmedAt(LocalDateTime.now());
            followUpAppointment.setFee(expectedAmount);
            if (consultation.getFollowUpNotes() != null) {
                followUpAppointment.setNotes(consultation.getFollowUpNotes());
            }
            followUpAppointment.setFollowUpSourceAppointmentId(sourceAppointment.getAppointmentId());
            followUpAppointment = appointmentRepository.save(followUpAppointment);

            if (TYPE_HOME_VISIT.equalsIgnoreCase(normalizeConsultationTypeForBooking(consultation.getConsultationType()))) {
                HomeVisitEstimateResponse homeVisitEstimate = null;
                try {
                    homeVisitEstimate = homeVisitLocationService.estimate(
                            doctor.getDoctorId(),
                            consultation.getHomeVisitLatitude(),
                            consultation.getHomeVisitLongitude()
                    );
                    if (!Boolean.TRUE.equals(homeVisitEstimate.getServiceable())) {
                        throw new BadRequestException(homeVisitEstimate.getMessage());
                    }
                } catch (Exception ex) {
                    throw new BadRequestException("Failed to estimate home visit: " + ex.getMessage());
                }
                followUpAppointment.setHomeVisitDetails(
                        buildFollowUpHomeVisitDetails(consultation, followUpAppointment, homeVisitEstimate)
                );
                followUpAppointment = appointmentRepository.save(followUpAppointment);
            }

            List<Integer> svcIds = parseServiceIds(consultation.getHomeVisitServiceIds());
            saveAppointmentHomeVisitServices(followUpAppointment, svcIds);

            consultation.setFollowUpAppointmentId(followUpAppointment.getAppointmentId());
            consultation.setFollowUpStatus(FollowUpStatus.PAID);
            consultationRepository.save(consultation);

            Invoice invoice = Invoice.builder()
                    .appointment(followUpAppointment)
                    .patient(patient)
                    .invoiceNumber(generateInvoiceNumber())
                    .consultationFee(expectedAmount)
                    .medicineFee(BigDecimal.ZERO)
                    .deliveryFee(BigDecimal.ZERO)
                    .discount(BigDecimal.ZERO)
                    .tax(BigDecimal.ZERO)
                    .amount(expectedAmount)
                    .status(INVOICE_PAID)
                    .issueDate(LocalDateTime.now())
                    .dueDate(LocalDateTime.now())
                    .paidAt(LocalDateTime.now())
                    .build();
            invoice = invoiceRepository.save(invoice);
            followUpAppointment.setInvoice(invoice);
            appointmentRepository.save(followUpAppointment);

            Payment payment = Payment.builder()
                    .invoice(invoice)
                    .amount(capturedAmount)
                    .paymentMethod(payMethod)
                    .paymentGateway(GATEWAY_PAYPAL)
                    .transactionId(orderId)
                    .status(PAYMENT_SUCCESS)
                    .paidAt(LocalDateTime.now())
                    .metadata(metadata)
                    .build();
            paymentRepository.save(payment);

            try {
                commissionService.processConsultationCommission(invoice);
            } catch (Exception ex) {
                log.error("Commission processing failed for follow-up appointment {}: {}",
                        followUpAppointment.getAppointmentId(), ex.getMessage(), ex);
            }

            try {
                notificationService.sendWebSocketNotification(
                        patient.getUser(),
                        NotificationType.FOLLOW_UP_PAID,
                        "Follow-up Payment Successful",
                        "Your payment for the follow-up appointment has been processed successfully.",
                        appointmentId,
                        "/appointments/" + appointmentId
                );
            } catch (Exception ex) {
                log.error("Failed to send FOLLOW_UP_PAID notification: {}", ex.getMessage());
            }

            log.info("Follow-up payment captured for appointmentId={}, followUpAppointmentId={}",
                    appointmentId, followUpAppointment.getAppointmentId());

            return FollowUpResponse.builder()
                    .consultationId(consultation.getConsultationId())
                    .appointmentId(consultation.getAppointment().getAppointmentId())
                    .followUpAppointmentId(followUpAppointment.getAppointmentId())
                    .followUpDate(consultation.getFollowUpDate())
                    .followUpNotes(consultation.getFollowUpNotes())
                    .diagnosis(consultation.getDiagnosis())
                    .doctorNotes(consultation.getDoctorNotes())
                    .treatmentPlan(consultation.getTreatmentPlan())
                    .consultationType(consultation.getConsultationType())
                    .followUpStatus(FollowUpStatus.PAID.name())
                    .build();

        } catch (PayPalIntegrationException | BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new PayPalIntegrationException("Error capturing follow-up PayPal payment: " + ex.getMessage(), ex);
        }
    }

    // ========================================================================
    // Invoice PDF generation
    // ========================================================================
    @Override
    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Integer invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));

        // Authorization
        assertInvoiceAccess(invoice);

        if (invoice.getPharmacyOrder() != null) {
            return invoicePdfService.generatePharmacyOrderInvoicePdf(invoice, invoice.getPharmacyOrder());
        } else if (invoice.getAppointment() != null) {
            return invoicePdfService.generateAppointmentInvoicePdf(invoice);
        }

        throw new BadRequestException("Invoice has no associated order or appointment");
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
        if (!PAYMENT_SUCCESS.equalsIgnoreCase(payment.getStatus())) {
            throw new BadRequestException(
                    "Only successful payments can be refunded. Current status: " + payment.getStatus());
        }

        // 3. Gọi PayPal Refund API nếu có gatewayCaptureId
        String captureId = payment.getGatewayCaptureId();
        if (captureId != null && !captureId.isBlank()) {
            try {
                String token = getPayPalAccessToken();
                HttpHeaders h = new HttpHeaders();
                h.setBearerAuth(token);
                h.setContentType(MediaType.APPLICATION_JSON);
                String val = payment.getAmount().setScale(2, RoundingMode.HALF_UP).toPlainString();
                Map<String, Object> payload = Map.of(
                        "amount", Map.of("currency_code", "USD", "value", val));
                restTemplate.exchange(
                        payPalConfig.getBaseUrl() + "/v2/payments/captures/" + captureId + "/refund",
                        HttpMethod.POST, new HttpEntity<>(payload, h), Map.class);
                log.info("PayPal refund success for capture {}", captureId);
            } catch (Exception ex) {
                log.error("PayPal refund failed for capture {}: {}", captureId, ex.getMessage());
                throw new PayPalIntegrationException("PayPal refund failed: " + ex.getMessage(), ex);
            }
        }

        // 4. Lấy Invoice liên kết
        Invoice invoice = payment.getInvoice();
        if (invoice == null) {
            throw new BadRequestException("Payment " + paymentId + " has no associated invoice.");
        }

        // 5. Cập nhật Payment → REFUNDED
        payment.setStatus(PAYMENT_REFUNDED);
        payment.setRefundedAmount(payment.getAmount());
        payment.setRefundedAt(LocalDateTime.now());
        payment.setRefundReason(refundReason != null ? refundReason : "Refund requested");
        paymentRepository.save(payment);

        // 5. Cập nhật Invoice → REFUNDED
        invoice.setStatus(INVOICE_REFUNDED);
        invoiceRepository.save(invoice);

        // 6. Truy vết và hoàn lại commission của đối tác (Doctor + Pharmacy)
        commissionService.processRefund(invoice.getInvoiceId());

        log.info("Refund processed: paymentId={}, invoiceId={}, amount={}",
                paymentId, invoice.getInvoiceId(), payment.getAmount());

        return toResponse(invoiceRepository.findById(invoice.getInvoiceId())
                .orElseThrow(() -> new InvoiceNotFoundException(invoice.getInvoiceId())));
    }

    // ========================================================================
    // Private helpers
    // ========================================================================
    /**
     * Đổi client-credentials lấy PayPal access token.
     */
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
        } catch (HttpStatusCodeException ex) {
            throw payPalApiException("PayPal authentication", ex);
        } catch (Exception ex) {
            throw new PayPalIntegrationException("Error occurred while authenticating with PayPal: " + ex.getMessage(), ex);
        }
    }

    private PayPalIntegrationException payPalApiException(String action, HttpStatusCodeException ex) {
        String responseBody = ex.getResponseBodyAsString();
        String details = responseBody == null || responseBody.isBlank()
                ? ex.getMessage()
                : responseBody;
        log.error("{} failed: status={}, body={}", action, ex.getStatusCode(), details, ex);
        return new PayPalIntegrationException(
                action + " failed: " + ex.getStatusCode() + " " + details,
                ex
        );
    }

    /**
     * Tạo số hóa đơn duy nhất theo định dạng INV-YYYYMMDD-XXXX. Dùng ngày hiện
     * tại + số thứ tự 4 chữ số dựa trên số hóa đơn trong ngày.
     */
    private String generateInvoiceNumber() {
        String datePart = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = invoiceRepository.count() + 1;
        return String.format("INV-%s-%04d", datePart, count);
    }

    /**
     * Thử trích xuất số tiền đã capture từ phản hồi PayPal. Nếu lỗi phân tích,
     * sẽ dùng số tiền của hóa đơn làm giá trị dự phòng.
     */
    @SuppressWarnings("unchecked")
    private BigDecimal extractCapturedAmount(Map<String, Object> body, BigDecimal fallback) {
        try {
            List<Map<String, Object>> units
                    = (List<Map<String, Object>>) body.get("purchase_units");
            if (units != null && !units.isEmpty()) {
                Map<String, Object> payments
                        = (Map<String, Object>) units.get(0).get("payments");
                if (payments != null) {
                    List<Map<String, Object>> captures
                            = (List<Map<String, Object>>) payments.get("captures");
                    if (captures != null && !captures.isEmpty()) {
                        Map<String, Object> amount
                                = (Map<String, Object>) captures.get(0).get("amount");
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

    @SuppressWarnings("unchecked")
    private String extractGatewayCaptureId(Map<String, Object> body) {
        try {
            List<Map<String, Object>> units = (List<Map<String, Object>>) body.get("purchase_units");
            if (units == null || units.isEmpty()) {
                return null;
            }
            Map<String, Object> payments = (Map<String, Object>) units.get(0).get("payments");
            if (payments == null) {
                return null;
            }
            List<Map<String, Object>> captures = (List<Map<String, Object>>) payments.get("captures");
            if (captures == null || captures.isEmpty()) {
                return null;
            }
            return (String) captures.get(0).get("id");
        } catch (Exception ignored) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private String extractReferenceId(Map<String, Object> body) {
        List<Map<String, Object>> units = (List<Map<String, Object>>) body.get("purchase_units");
        if (units == null || units.isEmpty()) {
            return null;
        }
        Object referenceId = units.get(0).get("reference_id");
        return referenceId != null ? referenceId.toString() : null;
    }

    private void validatePayPalCaptureMatchesInvoice(Map<String, Object> responseBody, Invoice invoice) {
        String expectedReferenceId = "invoice-" + invoice.getInvoiceId();
        String actualReferenceId = extractReferenceId(responseBody);
        if (!expectedReferenceId.equals(actualReferenceId)) {
            throw new PayPalIntegrationException(
                    "PayPal capture reference does not match invoice " + invoice.getInvoiceId());
        }

        BigDecimal actualAmount = extractCapturedAmount(responseBody, null);
        if (actualAmount == null
                || actualAmount.compareTo(invoice.getAmount().setScale(2, RoundingMode.HALF_UP)) != 0) {
            throw new PayPalIntegrationException(
                    "PayPal captured amount does not match invoice amount for invoice " + invoice.getInvoiceId());
        }
    }

    private void validatePayPalCaptureMatchesFollowUpCheckout(
            Map<String, Object> responseBody,
            BigDecimal expectedAmount,
            Integer appointmentId
    ) {
        String actualReferenceId = extractReferenceId(responseBody);
        String expectedReferenceId = "follow-up-" + appointmentId;
        if (!expectedReferenceId.equals(actualReferenceId)) {
            throw new PayPalIntegrationException(
                    "PayPal capture reference does not match follow-up checkout.");
        }
        BigDecimal actualAmount = extractCapturedAmount(responseBody, null);
        if (actualAmount == null
                || actualAmount.compareTo(expectedAmount.setScale(2, RoundingMode.HALF_UP)) != 0) {
            throw new PayPalIntegrationException(
                    "PayPal captured amount does not match follow-up checkout amount.");
        }
    }

    private void validatePayPalCaptureMatchesAppointmentCheckout(
            Map<String, Object> responseBody,
            BigDecimal expectedAmount
    ) {
        String actualReferenceId = extractReferenceId(responseBody);
        if (!APPOINTMENT_CHECKOUT_REFERENCE_ID.equals(actualReferenceId)) {
            throw new PayPalIntegrationException(
                    "PayPal capture reference does not match appointment checkout.");
        }

        BigDecimal actualAmount = extractCapturedAmount(responseBody, null);
        if (actualAmount == null
                || actualAmount.compareTo(expectedAmount.setScale(2, RoundingMode.HALF_UP)) != 0) {
            throw new PayPalIntegrationException(
                    "PayPal captured amount does not match appointment checkout amount.");
        }
    }

//    private AppointmentRequest toAppointmentRequest(AppointmentPayPalOrderRequest request) {
//        AppointmentRequest appointmentRequest = new AppointmentRequest();
//        appointmentRequest.setPatientId(request.getPatientId());
//        appointmentRequest.setDoctorId(request.getDoctorId());
//        appointmentRequest.setAppointmentTime(request.getAppointmentTime());
//        appointmentRequest.setConsultationType(request.getConsultationType());
//        appointmentRequest.setSymptoms(request.getSymptoms());
//        appointmentRequest.setNotes(request.getNotes());
//        appointmentRequest.setVisitAddress(request.getVisitAddress());
//        appointmentRequest.setVisitCity(request.getVisitCity());
//        appointmentRequest.setContactPhone(request.getContactPhone());
//        appointmentRequest.setReasonForHomeVisit(request.getReasonForHomeVisit());
//        appointmentRequest.setSpecialNotes(request.getSpecialNotes());
//
//        appointmentRequest.setIsForSelf(request.getIsForSelf());
//
//        appointmentRequest.setReceiverName(request.getReceiverName());
//        appointmentRequest.setReceiverAge(request.getReceiverAge());
//        appointmentRequest.setReceiverGender(request.getReceiverGender());
//        appointmentRequest.setReceiverRelationship(request.getReceiverRelationship());
//        appointmentRequest.setReceiverPhone(request.getReceiverPhone());
//
//        appointmentRequest.setVisitLatitude(request.getVisitLatitude());
//        appointmentRequest.setVisitLongitude(request.getVisitLongitude());
//        return appointmentRequest;
//    }
    private AppointmentRequest toAppointmentRequest(AppointmentPayPalCaptureRequest request) {
        AppointmentRequest appointmentRequest = new AppointmentRequest();
        appointmentRequest.setPatientId(request.getPatientId());
        appointmentRequest.setDoctorId(request.getDoctorId());
        appointmentRequest.setAppointmentTime(request.getAppointmentTime());
        appointmentRequest.setConsultationType(request.getConsultationType());
        appointmentRequest.setSymptoms(request.getSymptoms());
        appointmentRequest.setNotes(request.getNotes());
        appointmentRequest.setDoctorSelectionMode(
                request.getDoctorSelectionMode() != null
                ? request.getDoctorSelectionMode()
                : "AUTO_ASSIGNED"
        );
        appointmentRequest.setManualSelectionFee(
                request.getManualSelectionFee() != null
                ? request.getManualSelectionFee()
                : BigDecimal.ZERO
        );
        appointmentRequest.setVisitAddress(request.getVisitAddress());
        appointmentRequest.setVisitCity(request.getVisitCity());
        appointmentRequest.setContactPhone(request.getContactPhone());
        appointmentRequest.setReasonForHomeVisit(request.getReasonForHomeVisit());
        appointmentRequest.setSpecialNotes(request.getSpecialNotes());

        appointmentRequest.setIsForSelf(request.getIsForSelf());

        appointmentRequest.setReceiverName(request.getReceiverName());
        appointmentRequest.setReceiverAge(request.getReceiverAge());
        appointmentRequest.setReceiverGender(request.getReceiverGender());
        appointmentRequest.setReceiverRelationship(request.getReceiverRelationship());
        appointmentRequest.setReceiverPhone(request.getReceiverPhone());

        appointmentRequest.setVisitLatitude(request.getVisitLatitude());
        appointmentRequest.setVisitLongitude(request.getVisitLongitude());

        appointmentRequest.setHomeVisitStartTime(request.getHomeVisitStartTime());
        appointmentRequest.setHomeVisitEndTime(request.getHomeVisitEndTime());
        return appointmentRequest;
    }

    private Consultation resolveSourceConsultation(AppointmentPayPalCaptureRequest request) {
        if (request.getSourceConsultationId() == null) {
            return null;
        }

        Consultation consultation = consultationRepository.findById(request.getSourceConsultationId())
                .orElseThrow(() -> new BadRequestException(
                "Consultation not found with ID: " + request.getSourceConsultationId()));

        if (consultation.getAppointment() == null) {
            throw new BadRequestException("Source consultation is missing its appointment");
        }

        if (!TYPE_HOME_VISIT.equalsIgnoreCase(request.getConsultationType())) {
            throw new BadRequestException("sourceConsultationId is only supported for HomeVisit bookings");
        }

        if (consultation.getHomeVisitProposalStatus() != HomeVisitProposalStatus.ACCEPTED) {
            throw new BadRequestException("Home visit proposal must be accepted before booking");
        }

        if (!request.getPatientId().equalsIgnoreCase(consultation.getAppointment().getPatient().getUser().getId())) {
            throw new BadRequestException("Source consultation does not belong to the current patient");
        }

        if (!request.getDoctorId().equalsIgnoreCase(consultation.getAppointment().getDoctor().getDoctorId())) {
            throw new BadRequestException("Source consultation doctor does not match this booking");
        }

        if (consultation.getFollowUpAppointmentId() != null) {
            throw new BadRequestException("This consultation already has a linked follow-up appointment");
        }

        return consultation;
    }

    private void linkSourceConsultation(Consultation sourceConsultation, Appointment appointment) {
        if (sourceConsultation == null) {
            return;
        }

        sourceConsultation.setFollowUpAppointmentId(appointment.getAppointmentId());
        consultationRepository.save(sourceConsultation);
    }

    private void ensureFollowUpHomeVisitLocation(Consultation consultation) {
        String normalizedType = normalizeConsultationTypeForBooking(consultation.getConsultationType());
        if (!TYPE_HOME_VISIT.equalsIgnoreCase(normalizedType)) {
            return;
        }
        if (consultation.getHomeVisitLatitude() == null || consultation.getHomeVisitLongitude() == null) {
            throw new BadRequestException("Home visit location is required for follow-up HomeVisit payment");
        }
    }

    private HomeVisitDetails buildFollowUpHomeVisitDetails(
            Consultation consultation,
            Appointment followUpAppointment,
            HomeVisitEstimateResponse estimate) {
        return HomeVisitDetails.builder()
                .appointment(followUpAppointment)
                .visitAddress(consultation.getFollowUpVisitAddress())
                .visitCity(consultation.getFollowUpVisitCity())
                .contactPhone(consultation.getFollowUpContactPhone())
                .reasonForHomeVisit(consultation.getFollowUpReasonForHomeVisit())
                .specialNotes(consultation.getFollowUpSpecialNotes())
                .isForSelf(consultation.getFollowUpIsForSelf() == null ? Boolean.TRUE : consultation.getFollowUpIsForSelf())
                .receiverName(consultation.getFollowUpReceiverName())
                .receiverAge(consultation.getFollowUpReceiverAge())
                .receiverGender(consultation.getFollowUpReceiverGender())
                .receiverRelationship(consultation.getFollowUpReceiverRelationship())
                .receiverPhone(consultation.getFollowUpReceiverPhone())
                .visitLatitude(consultation.getHomeVisitLatitude())
                .visitLongitude(consultation.getHomeVisitLongitude())
                .distanceKm(estimate != null ? estimate.getDistanceKm() : null)
                .estimatedTravelMinutes(estimate != null ? estimate.getEstimatedTravelMinutes() : null)
                .homeVisitFee(estimate != null ? estimate.getHomeVisitFee() : null)
                .travelFee(estimate != null ? estimate.getTravelFee() : null)
                .build();
    }

    private boolean hasUsableHomeVisitDetails(HomeVisitDetails details) {
        return details != null
                && details.getVisitLatitude() != null
                && details.getVisitLongitude() != null
                && !isBlank(details.getVisitAddress())
                && !isBlank(details.getContactPhone())
                && !isBlank(details.getReasonForHomeVisit());
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private void copySourceDetailsToConsultation(Consultation consultation, HomeVisitDetails details) {
        consultation.setFollowUpVisitAddress(details.getVisitAddress());
        consultation.setFollowUpVisitCity(details.getVisitCity());
        consultation.setFollowUpContactPhone(details.getContactPhone());
        consultation.setFollowUpReasonForHomeVisit(details.getReasonForHomeVisit());
        consultation.setFollowUpSpecialNotes(details.getSpecialNotes());
        consultation.setFollowUpIsForSelf(details.getIsForSelf());
        consultation.setFollowUpReceiverName(details.getReceiverName());
        consultation.setFollowUpReceiverAge(details.getReceiverAge());
        consultation.setFollowUpReceiverGender(details.getReceiverGender());
        consultation.setFollowUpReceiverRelationship(details.getReceiverRelationship());
        consultation.setFollowUpReceiverPhone(details.getReceiverPhone());
        consultation.setHomeVisitLatitude(details.getVisitLatitude());
        consultation.setHomeVisitLongitude(details.getVisitLongitude());
    }

    private void validateAndApplyPatientDetails(Consultation consultation, FollowUpHomeVisitDetailsRequest request) {
        if (request == null
                || isBlank(request.getVisitAddress())
                || isBlank(request.getContactPhone())
                || isBlank(request.getReasonForHomeVisit())
                || request.getVisitLatitude() == null
                || request.getVisitLongitude() == null) {
            throw new BadRequestException("Home visit location is required for follow-up HomeVisit payment");
        }

        Boolean isForSelf = request.getIsForSelf() == null ? Boolean.TRUE : request.getIsForSelf();
        if (!Boolean.TRUE.equals(isForSelf)
                && (isBlank(request.getReceiverName())
                || request.getReceiverAge() == null
                || isBlank(request.getReceiverGender())
                || isBlank(request.getReceiverRelationship())
                || isBlank(request.getReceiverPhone()))) {
            throw new BadRequestException("Receiver details are required when the home visit is not for the patient");
        }

        consultation.setFollowUpVisitAddress(request.getVisitAddress());
        consultation.setFollowUpVisitCity(request.getVisitCity());
        consultation.setFollowUpContactPhone(request.getContactPhone());
        consultation.setFollowUpReasonForHomeVisit(request.getReasonForHomeVisit());
        consultation.setFollowUpSpecialNotes(request.getSpecialNotes());
        consultation.setFollowUpIsForSelf(isForSelf);
        consultation.setFollowUpReceiverName(request.getReceiverName());
        consultation.setFollowUpReceiverAge(request.getReceiverAge());
        consultation.setFollowUpReceiverGender(request.getReceiverGender());
        consultation.setFollowUpReceiverRelationship(request.getReceiverRelationship());
        consultation.setFollowUpReceiverPhone(request.getReceiverPhone());
        consultation.setHomeVisitLatitude(request.getVisitLatitude());
        consultation.setHomeVisitLongitude(request.getVisitLongitude());
    }

    private String toServiceIdCsv(List<Integer> serviceIds) {
        if (serviceIds == null || serviceIds.isEmpty()) {
            return null;
        }
        return serviceIds.stream()
                .filter(Objects::nonNull)
                .map(String::valueOf)
                .collect(Collectors.joining(","));
    }

    private FollowUpResponse toFollowUpPaymentResponse(Consultation c) {
        return FollowUpResponse.builder()
                .consultationId(c.getConsultationId())
                .appointmentId(c.getAppointment() != null
                        ? c.getAppointment().getAppointmentId() : null)
                .followUpAppointmentId(c.getFollowUpAppointmentId())
                .followUpDate(c.getFollowUpDate())
                .followUpNotes(c.getFollowUpNotes())
                .diagnosis(c.getDiagnosis())
                .doctorNotes(c.getDoctorNotes())
                .treatmentPlan(c.getTreatmentPlan())
                .consultationType(c.getConsultationType())
                .followUpStatus(c.getFollowUpStatus() != null
                        ? c.getFollowUpStatus().name() : null)
                .homeVisitLatitude(c.getHomeVisitLatitude())
                .homeVisitLongitude(c.getHomeVisitLongitude())
                .homeVisitServiceIds(c.getHomeVisitServiceIds())
                .build();
    }

    private String normalizeConsultationTypeForBooking(String consultationType) {
        return DoctorServiceHelper.normalizeConsultationType(consultationType);
    }

    private int resolveFollowUpPaymentSlotDuration(String doctorId, LocalDateTime followUpDate, String consultationType) {
        if (doctorId == null || followUpDate == null) {
            return 30;
        }

        int dayOfWeek = followUpDate.getDayOfWeek().getValue() % 7;
        return doctorScheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(doctorId, dayOfWeek)
                .stream()
                .filter(schedule -> sameBookingType(schedule.getConsultationType(), consultationType))
                .filter(schedule -> !followUpDate.toLocalTime().isBefore(schedule.getStartTime())
                        && followUpDate.toLocalTime().isBefore(schedule.getEndTime()))
                .findFirst()
                .map(DoctorSchedule::getSlotDuration)
                .filter(minutes -> minutes != null && minutes > 0)
                .orElse(30);
    }

    private boolean sameBookingType(String left, String right) {
        return normalizeConsultationTypeForBooking(left)
                .equalsIgnoreCase(normalizeConsultationTypeForBooking(right));
    }

    private BigDecimal resolveDoctorConsultationFee(Doctor doctor) {
        BigDecimal consultationFee = doctor.getConsultationFee();
        if (consultationFee == null || consultationFee.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Doctor consultation fee must be greater than zero.");
        }
        return consultationFee.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Trả về phí tự chọn bác sĩ theo cấu hình server (booking.manual-doctor-selection-fee).
     * Không dùng giá trị manualSelectionFee do client gửi lên nữa — trước đây tin thẳng
     * giá trị đó nên client có thể gửi 0 để né phí.
     */
    private BigDecimal resolveManualSelectionFee() {
        return manualDoctorSelectionFee.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal resolveAppointmentCheckoutAmount(
            Doctor doctor,
            String consultationType,
            Double visitLatitude,
            Double visitLongitude,
            List<Integer> homeVisitServiceIds
    ) {
        String normalizedType = normalizeConsultationTypeForBooking(consultationType);

        if (TYPE_HOME_VISIT.equalsIgnoreCase(normalizedType)) {
            HomeVisitEstimateResponse estimate = homeVisitLocationService.estimate(
                    doctor.getDoctorId(),
                    visitLatitude,
                    visitLongitude
            );

            if (!Boolean.TRUE.equals(estimate.getServiceable())) {
                throw new BadRequestException(estimate.getMessage());
            }

            // Home visit: phí khám tính x1.5 (consultationFee x1.5) so với Online,
            // cộng thêm phí di chuyển theo khoảng cách và dịch vụ phụ đã chọn.
            BigDecimal consultationFee = resolveDoctorConsultationFee(doctor)
                    .multiply(BigDecimal.valueOf(1.5));

            BigDecimal homeVisitTravelTotal = estimate.getTotalFee() != null
                    ? estimate.getTotalFee()
                    : BigDecimal.ZERO;

            BigDecimal selectedServicesTotal = calculateHomeVisitServicesTotal(homeVisitServiceIds);

            return consultationFee
                    .add(homeVisitTravelTotal)
                    .add(selectedServicesTotal)
                    .setScale(2, RoundingMode.HALF_UP);
        }

        return resolveDoctorConsultationFee(doctor);
    }

    private void checkDoctorSupportsConsultationType(Doctor doctor, String consultationType) {
        if (!DoctorServiceHelper.isConsultationTypeSupported(doctor, consultationType)) {
            throw new BadRequestException(
                    "Doctor does not support consultation type: " + consultationType
            );
        }
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

        runAfterCommit("doctor completed and paid pharmacy order notification", ()
                -> notificationService.sendWebSocketNotification(
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

    private void notifyDoctorAboutNewAppointmentAfterCommit(Appointment appointment) {
        User doctorUser = resolveDoctorUser(appointment, NotificationType.NEW_APPOINTMENT);
        if (doctorUser == null) {
            return;
        }

        String patientName = safeValue(appointment.getPatient().getFullName(), "Unknown patient");
        String appointmentTime = appointment.getAppointmentTime() != null
                ? appointment.getAppointmentTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                : "unknown time";
        String consultationType = safeValue(appointment.getConsultationType(), "consultation");
        Integer appointmentId = appointment.getAppointmentId();
        String actionUrl = "/appointments/" + appointmentId;

        runAfterCommit("new appointment notification appointmentId=" + appointmentId, () -> {
            notificationService.sendWebSocketNotification(
                    doctorUser,
                    NotificationType.NEW_APPOINTMENT,
                    "New appointment booked",
                    String.format(
                            "%s booked a %s appointment at %s.",
                            patientName,
                            consultationType,
                            appointmentTime
                    ),
                    appointmentId,
                    actionUrl
            );
            log.info("New appointment notification queued for doctorUserId={}, appointmentId={}",
                    doctorUser.getId(), appointmentId);
        });
    }

    private User resolveDoctorUser(Appointment appointment, NotificationType type) {
        if (appointment == null || appointment.getDoctor() == null) {
            log.warn("Cannot send {} notification: appointment or doctor is missing", type);
            return null;
        }

        User user = appointment.getDoctor().getUser();
        if (user == null || user.getId() == null || user.getId().isBlank()) {
            log.warn("Cannot send {} notification: doctorId={} is not mapped to a user",
                    type, appointment.getDoctor().getDoctorId());
            return null;
        }
        return user;
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

    private boolean isRetailDirectOrder(PharmacyOrder pharmacyOrder) {
        return pharmacyOrder != null
                && pharmacyOrder.getConsultationRequest() == null
                && pharmacyOrder.getPrescriptionHeader() == null;
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

    private InvoiceResponse toAuthorizedResponse(Invoice invoice) {
        assertInvoiceAccess(invoice);
        InvoiceResponse response = toResponse(invoice);
        User currentUser = getCurrentAuthenticatedUserOrNull();
        if (currentUser != null && hasRole(currentUser, ROLE_PATIENT)) {
            response.setPlatformFee(null);
            response.setDoctorEarning(null);
            response.setCommissionRate(null);
        }
        return response;
    }

    private void assertPatientHistoryAccess(String patientId) {
        User currentUser = getCurrentAuthenticatedUserOrNull();
        if (currentUser == null || hasRole(currentUser, ROLE_ADMIN)) {
            return;
        }
        if (hasRole(currentUser, ROLE_PATIENT) && patientId != null
                && patientId.equalsIgnoreCase(currentUser.getId())) {
            return;
        }
        throw new AccessDeniedException("Access denied: cannot view this patient payment history.");
    }

    private void assertAppointmentCheckoutAccess(String patientId) {
        User currentUser = getCurrentAuthenticatedUserOrNull();
        if (currentUser == null || hasRole(currentUser, ROLE_ADMIN)) {
            return;
        }
        if (hasRole(currentUser, ROLE_PATIENT) && patientId != null
                && patientId.equalsIgnoreCase(currentUser.getId())) {
            return;
        }
        throw new AccessDeniedException("Access denied: cannot pay for this appointment.");
    }

    private void assertInvoiceAccess(Invoice invoice) {
        if (invoice == null) {
            return;
        }
        if (invoice.getAppointment() != null) {
            assertInvoiceAccess(invoice.getAppointment());
            return;
        }
        if (invoice.getPharmacyOrder() != null) {
            User currentUser = getCurrentAuthenticatedUserOrNull();
            if (currentUser == null || hasRole(currentUser, ROLE_ADMIN)) {
                return;
            }
            String userId = currentUser.getId();
            PharmacyOrder order = invoice.getPharmacyOrder();
            if (hasRole(currentUser, ROLE_PATIENT)
                    && order.getPatient() != null
                    && order.getPatient().getPatientId() != null
                    && order.getPatient().getPatientId().equalsIgnoreCase(userId)) {
                return;
            }
            if (hasRole(currentUser, ROLE_DOCTOR)) {
                // Allow doctor if they are the one who prescribed
                if (order.getPrescriptionHeader() != null
                        && order.getPrescriptionHeader().getDoctor() != null
                        && order.getPrescriptionHeader().getDoctor().getDoctorId() != null
                        && order.getPrescriptionHeader().getDoctor().getDoctorId().equalsIgnoreCase(userId)) {
                    return;
                }
                // Also check via prescriptionHeader's source appointment doctor
                if (order.getPrescriptionHeader() != null
                        && order.getPrescriptionHeader().getAppointment() != null
                        && order.getPrescriptionHeader().getAppointment().getDoctor() != null
                        && order.getPrescriptionHeader().getAppointment().getDoctor().getDoctorId() != null
                        && order.getPrescriptionHeader().getAppointment().getDoctor().getDoctorId().equalsIgnoreCase(userId)) {
                    return;
                }
            }
            throw new AccessDeniedException("Access denied: cannot view this invoice.");
        }
    }

    private void assertInvoiceAccess(Appointment appointment) {
        User currentUser = getCurrentAuthenticatedUserOrNull();
        if (currentUser == null || hasRole(currentUser, ROLE_ADMIN)) {
            return;
        }
        String userId = currentUser.getId();
        if (hasRole(currentUser, ROLE_PATIENT)
                && appointment != null
                && appointment.getPatient() != null
                && appointment.getPatient().getPatientId() != null
                && appointment.getPatient().getPatientId().equalsIgnoreCase(userId)) {
            return;
        }
        if (hasRole(currentUser, ROLE_DOCTOR)
                && appointment != null
                && appointment.getDoctor() != null
                && appointment.getDoctor().getDoctorId() != null
                && appointment.getDoctor().getDoctorId().equalsIgnoreCase(userId)) {
            return;
        }
        throw new AccessDeniedException("Access denied: cannot view this invoice.");
    }

    private User getCurrentAuthenticatedUserOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || "anonymousUser".equals(authentication.getName())) {
            return null;
        }
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found."));
    }

    private boolean hasRole(User user, String role) {
        if (user == null || user.getRole() == null || user.getRole().getName() == null) {
            return false;
        }
        String normalized = user.getRole().getName().toUpperCase();
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring("ROLE_".length());
        }
        return role.equals(normalized);
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
                .pharmacyOrderId(invoice.getPharmacyOrder() != null
                        ? invoice.getPharmacyOrder().getOrderId() : null)
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

    private List<Integer> parseServiceIds(String csv) {
        if (csv == null || csv.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Integer::valueOf)
                .toList();
    }

    private BigDecimal calculateHomeVisitServicesTotal(List<Integer> serviceIds) {
        if (serviceIds == null || serviceIds.isEmpty()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        List<HomeVisitService> services = homeVisitServiceRepository.findAllById(serviceIds);

        return services.stream()
                .filter(service -> Boolean.TRUE.equals(service.getActive()))
                .map(HomeVisitService::getPrice)
                .filter(price -> price != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private void saveAppointmentHomeVisitServices(Appointment appointment, List<Integer> serviceIds) {
        if (serviceIds == null || serviceIds.isEmpty()) {
            return;
        }

        List<HomeVisitService> services = homeVisitServiceRepository.findAllById(serviceIds)
                .stream()
                .filter(service -> Boolean.TRUE.equals(service.getActive()))
                .toList();

        List<AppointmentHomeVisitService> snapshots = services.stream()
                .map(service -> AppointmentHomeVisitService.builder()
                .appointment(appointment)
                .serviceId(service.getServiceId())
                .serviceName(service.getServiceName())
                .price(service.getPrice())
                .build())
                .toList();

        appointmentHomeVisitServiceRepository.saveAll(snapshots);
    }
}
