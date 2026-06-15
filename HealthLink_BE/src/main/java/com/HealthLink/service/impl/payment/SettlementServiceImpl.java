package com.HealthLink.service.impl.payment;

import com.HealthLink.config.PayPalConfig;
import com.HealthLink.dto.payment.SettlementRequest;
import com.HealthLink.dto.payment.SettlementResponse;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.Settlement;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.PayPalIntegrationException;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.payment.PaymentSettlementRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.service.notification.NotificationService;
import com.HealthLink.service.payment.SettlementService;
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
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Cài đặt của {@link SettlementService}.
 *
 * <p>Quy trình rút tiền về PayPal cá nhân của đối tác:
 * <ol>
 *   <li>Kiểm tra pendingSettlement ≥ $10.00 và amount ≤ pendingSettlement</li>
 *   <li>Xác thực paypalEmail khớp với hồ sơ đã đăng ký</li>
 *   <li>Tạo Settlement PENDING → gọi PayPal Payouts API</li>
 *   <li>Thành công → COMPLETED + trừ pendingSettlement; Thất bại → FAILED + ghi notes</li>
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SettlementServiceImpl implements SettlementService {

    // ── Hằng trạng thái ───────────────────────────────────────────────────────
    private static final String STATUS_PENDING    = "PENDING";
    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String STATUS_COMPLETED  = "COMPLETED";
    private static final String STATUS_FAILED     = "FAILED";

    private static final String RECIPIENT_DOCTOR   = "DOCTOR";
    private static final String RECIPIENT_PHARMACY = "PHARMACY";
    private static final String METHOD_PAYPAL      = "PAYPAL";

    /** Số dư tối thiểu để rút ($10.00 theo yêu cầu task) */
    private static final BigDecimal MIN_REMAINING_BALANCE = new BigDecimal("10.00");

    // ── Phụ thuộc ─────────────────────────────────────────────────────────────
    private final PayPalConfig       payPalConfig;

    @Qualifier("paypalRestTemplate")
    private final RestTemplate       restTemplate;

    private final ObjectMapper       objectMapper;
    private final PaymentSettlementRepository  settlementRepository;
    private final DoctorRepository      doctorRepository;
    private final PharmacyRepository    pharmacyRepository;
    private final NotificationService   notificationService;

    // ========================================================================
    // Rút tiền – Bác sĩ
    // ========================================================================

    @Override
    @Transactional
    public SettlementResponse withdrawDoctorEarnings(String doctorId, SettlementRequest request) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new BadRequestException("Doctor not found with ID: " + doctorId));

        // Kiểm tra điều kiện số dư
        BigDecimal pending = doctor.getPendingSettlement() != null
                ? doctor.getPendingSettlement() : BigDecimal.ZERO;
        validateWithdrawal(pending, request.getAmount(), request.getPaypalEmail(), doctor.getPaypalEmail());

        // Khởi tạo Settlement
        Settlement settlement = buildSettlement(
                RECIPIENT_DOCTOR, doctorId, doctor.getFullName(),
                request.getAmount(), request.getPaypalEmail(), request.getNotes()
        );
        settlementRepository.save(settlement);

        // Gọi PayPal Payouts
        return executePayPalPayout(settlement, request.getAmount(), request.getPaypalEmail(),
                doctor.getFullName(), () -> {
                    // Callback thành công: trừ pendingSettlement
                    BigDecimal updatedBalance = pending.subtract(request.getAmount());
                    doctor.setPendingSettlement(updatedBalance);
                    doctorRepository.save(doctor);
                    notifyDoctorWalletWithdrawal(doctor, request.getAmount(), updatedBalance);
                });
    }

    // ========================================================================
    // Rút tiền – Nhà thuốc
    // ========================================================================

    @Override
    @Transactional
    public SettlementResponse withdrawPharmacyEarnings(String pharmacyId, SettlementRequest request) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new BadRequestException("Pharmacy not found with ID: " + pharmacyId));

        // Kiểm tra điều kiện số dư
        BigDecimal pending = pharmacy.getPendingSettlement() != null
                ? pharmacy.getPendingSettlement() : BigDecimal.ZERO;
        validateWithdrawal(pending, request.getAmount(), request.getPaypalEmail(), pharmacy.getPaypalEmail());

        // Khởi tạo Settlement
        Settlement settlement = buildSettlement(
                RECIPIENT_PHARMACY, pharmacyId, pharmacy.getName(),
                request.getAmount(), request.getPaypalEmail(), request.getNotes()
        );
        settlementRepository.save(settlement);

        // Gọi PayPal Payouts
        return executePayPalPayout(settlement, request.getAmount(), request.getPaypalEmail(),
                pharmacy.getName(), () -> {
                    // Callback thành công: trừ pendingSettlement
                    pharmacy.setPendingSettlement(pending.subtract(request.getAmount()));
                    pharmacyRepository.save(pharmacy);
                });
    }

    // ========================================================================
    // Lịch sử rút tiền
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<SettlementResponse> getSettlementHistory(String recipientId) {
        return settlementRepository.findByRecipientIdOrderByCreatedAtDesc(recipientId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ========================================================================
    // Private helpers
    // ========================================================================

    /**
     * Kiểm tra điều kiện hợp lệ trước khi rút tiền:
     * 1. Số dư phải ≥ MIN_WITHDRAWAL ($10.00)
     * 2. Số tiền rút phải ≤ số dư hiện tại
     * 3. paypalEmail phải khớp với email đã đăng ký
     */
    private void validateWithdrawal(BigDecimal pendingBalance, BigDecimal requestAmount,
                                    String requestedEmail, String registeredEmail) {
        if (requestAmount.compareTo(pendingBalance) > 0) {
            throw new BadRequestException(
                    String.format("Requested amount $%.2f exceeds available balance $%.2f.",
                            requestAmount, pendingBalance));
        }

        BigDecimal remainingBalance = pendingBalance.subtract(requestAmount);
        if (remainingBalance.compareTo(MIN_REMAINING_BALANCE) <= 0) {
            throw new BadRequestException(
                    String.format("Remaining balance after withdrawal must be greater than $%.2f. " +
                                    "Current balance: $%.2f, requested: $%.2f, remaining: $%.2f.",
                            MIN_REMAINING_BALANCE, pendingBalance, requestAmount, remainingBalance));
        }

        if (registeredEmail == null || !registeredEmail.equalsIgnoreCase(requestedEmail)) {
            throw new BadRequestException(
                    "PayPal email does not match the registered PayPal email on file. " +
                    "Please update your profile or use the correct email.");
        }
    }

    /**
     * Xây dựng đối tượng Settlement ban đầu với trạng thái PENDING.
     */
    private Settlement buildSettlement(String recipientType, String recipientId,
                                       String recipientName, BigDecimal netAmount,
                                       String paypalEmail, String notes) {
        String settlementNumber = generateSettlementNumber();
        return Settlement.builder()
                .settlementNumber(settlementNumber)
                .recipientType(recipientType)
                .recipientId(recipientId)
                .recipientName(recipientName)
                .grossAmount(netAmount)     // Đây là số tiền đối tác yêu cầu rút
                .commissionAmount(BigDecimal.ZERO)
                .netAmount(netAmount)       // Số tiền thực chuyển = số tiền yêu cầu
                .status(STATUS_PENDING)
                .paymentMethod(METHOD_PAYPAL)
                .paypalEmail(paypalEmail)
                .periodStart(LocalDateTime.now())
                .periodEnd(LocalDateTime.now())
                .notes(notes)
                .build();
    }

    /**
     * Thực thi chuyển tiền qua PayPal Payouts API.
     * Cập nhật trạng thái Settlement và gọi callback khi thành công.
     *
     * @param onSuccess Runnable được gọi khi payout thành công (trừ số dư đối tác)
     */
    @SuppressWarnings("unchecked")
    private SettlementResponse executePayPalPayout(
            Settlement settlement, BigDecimal amount, String paypalEmail,
            String recipientName, Runnable onSuccess) {

        String accessToken = getPayPalAccessToken();
        String amountStr = amount.setScale(2, RoundingMode.HALF_UP).toPlainString();

        // Xây dựng payload PayPal Payouts API v1
        Map<String, Object> senderItem = Map.of(
                "recipient_type", "EMAIL",
                "amount", Map.of("value", amountStr, "currency", "USD"),
                "receiver", paypalEmail,
                "note", "HealthLink Partner Payout – " + settlement.getSettlementNumber(),
                "sender_item_id", settlement.getSettlementNumber()
        );
        Map<String, Object> payload = Map.of(
                "sender_batch_header", Map.of(
                        "sender_batch_id", settlement.getSettlementNumber(),
                        "email_subject", "You have received a payout from HealthLink",
                        "email_message", String.format(
                                "Dear %s, your earnings of $%s USD have been sent to your PayPal account.",
                                recipientName, amountStr)
                ),
                "items", List.of(senderItem)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            String body = objectMapper.writeValueAsString(payload);
            HttpEntity<String> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    payPalConfig.getBaseUrl() + "/v1/payments/payouts",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null) {
                throw new PayPalIntegrationException(
                        "PayPal returned an empty response when creating the payout.");
            }

            // PayPal Payouts trả về batch_header với batch_status
            Map<String, Object> batchHeader = (Map<String, Object>) responseBody.get("batch_header");
            String batchStatus = batchHeader != null ? (String) batchHeader.get("batch_status") : null;
            String payoutBatchId = batchHeader != null ? (String) batchHeader.get("payout_batch_id") : null;

            log.info("PayPal Payout submitted: batchId={}, status={} for settlement {}",
                    payoutBatchId, batchStatus, settlement.getSettlementNumber());

            // Nếu PayPal tiếp nhận thành công (PENDING / SUCCESS)
            if (batchStatus != null && !batchStatus.equalsIgnoreCase("DENIED")) {
                // Cập nhật Settlement thành COMPLETED
                settlement.setStatus(STATUS_COMPLETED);
                settlement.setCompletedAt(LocalDateTime.now());
                settlement.setProcessedAt(LocalDateTime.now());
                settlement.setNotes("PayPal Payout BatchId: " + payoutBatchId);
                settlementRepository.save(settlement);

                // Gọi callback trừ số dư đối tác
                onSuccess.run();

                log.info("Settlement {} COMPLETED – amount=${} → {}",
                        settlement.getSettlementNumber(), amountStr, paypalEmail);

            } else {
                // PayPal từ chối → FAILED
                String failReason = "PayPal payout denied. BatchStatus: " + batchStatus;
                settlement.setStatus(STATUS_FAILED);
                settlement.setNotes(failReason);
                settlementRepository.save(settlement);
                throw new PayPalIntegrationException(failReason);
            }

        } catch (PayPalIntegrationException | BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            // Ghi nhận lỗi vào Settlement
            settlement.setStatus(STATUS_FAILED);
            settlement.setNotes("Payout failed: " + ex.getMessage());
            settlementRepository.save(settlement);
            log.error("PayPal Payout failed for settlement {}: {}",
                    settlement.getSettlementNumber(), ex.getMessage(), ex);
            throw new PayPalIntegrationException(
                    "Error occurred while processing PayPal payout: " + ex.getMessage(), ex);
        }

        return toResponse(settlementRepository.findById(settlement.getSettlementId())
                .orElse(settlement));
    }

    /**
     * Lấy PayPal OAuth2 access token (client_credentials grant).
     * Tái sử dụng logic từ FinanceServiceImpl.
     */
    @SuppressWarnings("unchecked")
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
            throw new PayPalIntegrationException(
                    "Error authenticating with PayPal: " + ex.getMessage(), ex);
        }
    }

    private String generateSettlementNumber() {
        return "STL-" + LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss-SSSSSS"));
    }

    /** Ánh xạ Settlement → SettlementResponse. */
    private void notifyDoctorWalletWithdrawal(Doctor doctor, BigDecimal amount, BigDecimal balance) {
        if (doctor == null || doctor.getUser() == null) {
            return;
        }

        try {
            BigDecimal delta = amount != null ? amount.negate() : BigDecimal.ZERO;
            String metadata = String.format(
                    "{\"delta\":\"%s\",\"balance\":\"%s\"}",
                    delta.toPlainString(),
                    balance != null ? balance.toPlainString() : "0"
            );

            notificationService.sendWebSocketNotification(
                    doctor.getUser(),
                    NotificationType.WALLET_BALANCE_CHANGED,
                    "Wallet balance updated",
                    String.format("Your withdrawal of $%.2f has been completed.", amount),
                    null,
                    "/profile-doctor?tab=wallet",
                    metadata
            );
        } catch (Exception ex) {
            log.warn("Failed to send wallet withdrawal notification for doctor {}: {}",
                    doctor.getDoctorId(), ex.getMessage());
        }
    }

    private SettlementResponse toResponse(Settlement s) {
        return SettlementResponse.builder()
                .settlementId(s.getSettlementId())
                .settlementNumber(s.getSettlementNumber())
                .recipientType(s.getRecipientType())
                .recipientId(s.getRecipientId())
                .recipientName(s.getRecipientName())
                .grossAmount(s.getGrossAmount())
                .commissionAmount(s.getCommissionAmount())
                .netAmount(s.getNetAmount())
                .status(s.getStatus())
                .paymentMethod(s.getPaymentMethod())
                .paypalEmail(s.getPaypalEmail())
                .periodStart(s.getPeriodStart())
                .periodEnd(s.getPeriodEnd())
                .processedAt(s.getProcessedAt())
                .completedAt(s.getCompletedAt())
                .notes(s.getNotes())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
