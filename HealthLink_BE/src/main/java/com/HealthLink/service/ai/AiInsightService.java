package com.HealthLink.service.ai;

import com.HealthLink.dto.analytics.PharmacyDemandAnalyticsResponse.DemandTrendPoint;
import com.HealthLink.dto.analytics.PharmacyDemandAnalyticsResponse.MedicineDemandItem;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AiInsightService {

    @Value("${openrouter.api-key}")
    private String apiKey;

    @Value("${openrouter.model}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

    public String generateInsights(List<MedicineDemandItem> topMedicines,
                                    List<DemandTrendPoint> trend,
                                    int totalOrders, BigDecimal totalRevenue,
                                    int days, String lang) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("OpenRouter API key not configured, using fallback summary");
            return fallbackSummary(topMedicines, trend, totalOrders, totalRevenue, days);
        }

        String prompt = buildPrompt(topMedicines, trend, totalOrders, totalRevenue, days, lang);
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(apiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("HTTP-Referer", "https://healthlink.app");

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model);
            body.put("messages", List.of(Map.of("role", "user", "content", prompt)));
            body.put("max_tokens", 200);

            String json = objectMapper.writeValueAsString(body);
            HttpEntity<String> request = new HttpEntity<>(json, headers);
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                    OPENROUTER_URL, request, JsonNode.class);

            JsonNode choices = response.getBody().path("choices");
            if (choices.isArray() && choices.size() > 0) {
                String text = choices.get(0).path("message").path("content").asText().trim();
                if (!text.isBlank()) return text;
            }
            log.warn("OpenRouter returned empty response, using fallback");
            return fallbackSummary(topMedicines, trend, totalOrders, totalRevenue, days);
        } catch (Exception e) {
            log.warn("OpenRouter API failed: {}", e.getMessage());
            return fallbackSummary(topMedicines, trend, totalOrders, totalRevenue, days);
        }
    }

    private String buildPrompt(List<MedicineDemandItem> topMedicines,
                                List<DemandTrendPoint> trend,
                                int totalOrders, BigDecimal totalRevenue,
                                int days, String lang) {
        String language = "vi".equals(lang) ? "Vietnamese" : "English";
        StringBuilder sb = new StringBuilder();
        sb.append("You are a pharmacy analyst. Analyze this data for the pharmacy owner.\n\n");
        sb.append("Period: last ").append(days).append(" days\n");
        sb.append("Total orders: ").append(totalOrders).append("\n");
        sb.append("Total revenue: $").append(totalRevenue).append("\n\n");
        sb.append("Top medicines:\n");
        for (int i = 0; i < Math.min(topMedicines.size(), 5); i++) {
            MedicineDemandItem item = topMedicines.get(i);
            sb.append("- ").append(item.getMedicineName())
              .append(": ").append(item.getSoldQuantity()).append(" sold, $")
              .append(item.getRevenue()).append("\n");
        }
        sb.append("\nDaily orders trend:\n");
        if (trend.size() >= 2) {
            DemandTrendPoint first = trend.get(0);
            DemandTrendPoint last = trend.get(trend.size() - 1);
            sb.append("Start: ").append(first.getDate()).append(" (").append(first.getOrderCount()).append(" orders)\n");
            sb.append("End: ").append(last.getDate()).append(" (").append(last.getOrderCount()).append(" orders)\n");
        }
        sb.append("\nRespond in ").append(language)
          .append(", max 3 sentences. Highlight trends and actionable insights.");
        return sb.toString();
    }

    private String fallbackSummary(List<MedicineDemandItem> top,
                                    List<DemandTrendPoint> trend,
                                    int totalOrders, BigDecimal totalRevenue, int days) {
        if (top.isEmpty()) {
            return "No sales data in the last " + days + " days.";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("In the last ").append(days).append(" days, you had ")
                .append(totalOrders).append(" orders totaling ")
                .append(totalRevenue).append(" USD. ");
        MedicineDemandItem top1 = top.get(0);
        sb.append("Best-selling: ").append(top1.getMedicineName())
                .append(" (").append(top1.getSoldQuantity()).append(" sold). ");
        if (trend.size() >= 2) {
            DemandTrendPoint first = trend.get(0);
            DemandTrendPoint last = trend.get(trend.size() - 1);
            if (last.getOrderCount() > first.getOrderCount()) {
                sb.append("Orders trending up.");
            } else if (last.getOrderCount() < first.getOrderCount()) {
                sb.append("Orders trending down.");
            }
        }
        if (top.size() >= 2) {
            MedicineDemandItem top2 = top.get(1);
            sb.append("Runner-up: ").append(top2.getMedicineName())
                    .append(" (").append(top2.getSoldQuantity()).append(" sold).");
        }
        return sb.toString();
    }
}
