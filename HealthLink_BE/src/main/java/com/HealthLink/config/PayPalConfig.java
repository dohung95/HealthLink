package com.HealthLink.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.web.client.RestTemplate;

@Configuration
@ConfigurationProperties(prefix = "paypal")
@Getter
@Setter
public class PayPalConfig {

    /** PayPal OAuth2 client-id (từ application.properties: paypal.client-id) */
    private String clientId;

    /** PayPal OAuth2 client-secret (từ application.properties: paypal.client-secret) */
    private String clientSecret;

    /** URL gốc của PayPal, ví dụ https://api-m.sandbox.paypal.com */
    private String baseUrl;

    private MerchantCredentials healthlink = new MerchantCredentials();

    public String getClientId() {
        return hasText(healthlink.getClientId()) ? healthlink.getClientId() : clientId;
    }

    public String getClientSecret() {
        return hasText(healthlink.getClientSecret()) ? healthlink.getClientSecret() : clientSecret;
    }

    public String getBaseUrl() {
        return hasText(healthlink.getBaseUrl()) ? healthlink.getBaseUrl() : baseUrl;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    /**
     * Bean RestTemplate được dùng để gọi PayPal REST API.
     * Tách riêng bean này để tránh xung đột với các RestTemplate tùy biến trong tương lai.
     */
    @Bean("paypalRestTemplate")
    public RestTemplate paypalRestTemplate() {
        return new RestTemplate();
    }

    /**
     * Bean {@link ObjectMapper} dùng chung, có hỗ trợ Java Time.
     * Được {@link com.HealthLink.service.impl.payment.FinanceServiceImpl}
     * sử dụng để tuần tự hóa payload phản hồi của PayPal.
     */
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }
    @Getter
    @Setter
    public static class MerchantCredentials {
        private String clientId;
        private String clientSecret;
        private String baseUrl;
    }
}
