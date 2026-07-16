package com.HealthLink.integration.paypal;

import com.HealthLink.config.PayPalConfig;
import com.HealthLink.entity.Settlement;
import com.HealthLink.exception.PayPalIntegrationException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class PayPalPayoutClient {

    private final PayPalConfig payPalConfig;
    @Qualifier("paypalRestTemplate")
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public PayPalPayoutResult createPayout(Settlement settlement) {
        String amount = settlement.getNetAmount().setScale(2, RoundingMode.HALF_UP).toPlainString();
        Map<String, Object> item = Map.of(
                "recipient_type", "EMAIL",
                "amount", Map.of("value", amount, "currency", "USD"),
                "receiver", settlement.getPaypalEmail(),
                "note", "HealthLink Partner Payout - " + settlement.getSettlementNumber(),
                "sender_item_id", settlement.getSettlementNumber());
        Map<String, Object> payload = Map.of(
                "sender_batch_header", Map.of("sender_batch_id", settlement.getSettlementNumber(),
                        "email_subject", "You have received a payout from HealthLink"),
                "items", List.of(item));
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken());
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<Map> response = restTemplate.exchange(
                    payPalConfig.getBaseUrl() + "/v1/payments/payouts", HttpMethod.POST,
                    new HttpEntity<>(objectMapper.writeValueAsString(payload), headers), Map.class);
            return payoutResult(response.getBody());
        } catch (PayPalIntegrationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new PayPalIntegrationException("Unable to submit PayPal payout: " + ex.getMessage(), ex);
        }
    }

    public PayPalPayoutResult getPayoutBatch(String payoutBatchId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken());
            ResponseEntity<Map> response = restTemplate.exchange(
                    payPalConfig.getBaseUrl() + "/v1/payments/payouts/" + payoutBatchId,
                    HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            return payoutResult(response.getBody());
        } catch (PayPalIntegrationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new PayPalIntegrationException("Unable to retrieve PayPal payout batch: " + ex.getMessage(), ex);
        }
    }

    @SuppressWarnings("unchecked")
    private PayPalPayoutResult payoutResult(Map<String, Object> body) {
        if (body == null) {
            return PayPalPayoutResult.builder().status("UNKNOWN")
                    .message("PayPal returned an empty response").build();
        }
        Object headerValue = body.get("batch_header");
        if (!(headerValue instanceof Map<?, ?> header)) {
            return PayPalPayoutResult.builder().status("UNKNOWN")
                    .message("PayPal response did not include a payout batch header").build();
        }
        Object status = header.get("batch_status");
        Object batchId = header.get("payout_batch_id");
        return PayPalPayoutResult.builder()
                .status(status == null ? "UNKNOWN" : status.toString())
                .payoutBatchId(batchId == null ? null : batchId.toString())
                .message(status == null ? "PayPal payout status was not supplied" : null)
                .build();
    }

    @SuppressWarnings("unchecked")
    private String accessToken() {
        String credentials = payPalConfig.getClientId() + ":" + payPalConfig.getClientSecret();
        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth(Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8)));
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");
        ResponseEntity<Map> response = restTemplate.exchange(payPalConfig.getBaseUrl() + "/v1/oauth2/token",
                HttpMethod.POST, new HttpEntity<>(form, headers), Map.class);
        Map<String, Object> body = response.getBody();
        if (body == null || body.get("access_token") == null) {
            throw new PayPalIntegrationException("Failed to receive access token from PayPal.");
        }
        return body.get("access_token").toString();
    }
}
