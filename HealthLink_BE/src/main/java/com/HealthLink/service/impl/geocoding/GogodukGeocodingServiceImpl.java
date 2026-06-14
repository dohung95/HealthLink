package com.HealthLink.service.impl.geocoding;

import com.HealthLink.dto.geocoding.GeocodeResponse;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.service.geocoding.GeocodingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GogodukGeocodingServiceImpl implements GeocodingService {
    private static final String PROVIDER = "GOGODUK";
    private static final String BASE_URL = "https://api.gogoduk.com";

    @Value("${gogoduk.api-key:}")
    private String apiKey;

    private final RestTemplateBuilder restTemplateBuilder;

    @Override
    public GeocodeResponse geocode(String address) {
        log.debug("geocode called for address: {}", address);
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Gogoduk API key is not configured - geocode request blocked");
            throw new BadRequestException("Gogoduk API key is not configured");
        }

        Map<String, Object> suggestResponse = restTemplateBuilder.build().exchange(
                BASE_URL + "/v1/suggest?input={input}",
                HttpMethod.GET,
                new HttpEntity<>(buildHeaders()),
                Map.class,
                address
        ).getBody();

        String placeId = extractPlaceId(suggestResponse);
        Map<String, Object> resolveResponse = restTemplateBuilder.build().exchange(
                BASE_URL + "/v1/place/resolve?id={id}",
                HttpMethod.GET,
                new HttpEntity<>(buildHeaders()),
                Map.class,
                placeId
        ).getBody();

        return parseResolveResult(resolveResponse);
    }

    @Override
    public GeocodeResponse reverseGeocode(Double latitude, Double longitude) {
        log.debug("reverseGeocode called for lat={}, lng={}", latitude, longitude);
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Gogoduk API key is not configured - reverse geocode request blocked");
            throw new BadRequestException("Gogoduk API key is not configured");
        }

        Map<String, Object> response = restTemplateBuilder.build().exchange(
                BASE_URL + "/v1/reverse?point.lat={lat}&point.lon={lon}",
                HttpMethod.GET,
                new HttpEntity<>(buildHeaders()),
                Map.class,
                latitude,
                longitude
        ).getBody();

        return parseReverseResult(response);
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-API-Key", apiKey);
        return headers;
    }

    @SuppressWarnings("unchecked")
    private String extractPlaceId(Map<String, Object> response) {
        if (response == null || !response.containsKey("predictions")) {
            throw new BadRequestException("Unable to geocode delivery address");
        }
        List<Map<String, Object>> predictions = (List<Map<String, Object>>) response.get("predictions");
        if (predictions == null || predictions.isEmpty()) {
            throw new BadRequestException("Unable to geocode delivery address");
        }
        String placeId = (String) predictions.get(0).get("placeId");
        if (placeId == null || placeId.isBlank()) {
            throw new BadRequestException("Unable to geocode delivery address");
        }
        return placeId;
    }

    @SuppressWarnings("unchecked")
    private GeocodeResponse parseResolveResult(Map<String, Object> response) {
        if (response == null || !response.containsKey("result")) {
            throw new BadRequestException("Unable to geocode delivery address");
        }
        Map<String, Object> result = (Map<String, Object>) response.get("result");
        if (result == null) {
            throw new BadRequestException("Unable to geocode delivery address");
        }

        Number lat = (Number) result.get("lat");
        Number lon = (Number) result.get("lon");
        if (lat == null || lon == null) {
            throw new BadRequestException("Unable to geocode delivery address");
        }

        return GeocodeResponse.builder()
                .formattedAddress(String.valueOf(result.getOrDefault("address", "")))
                .latitude(lat.doubleValue())
                .longitude(lon.doubleValue())
                .provider(PROVIDER)
                .build();
    }

    @SuppressWarnings("unchecked")
    private GeocodeResponse parseReverseResult(Map<String, Object> response) {
        if (response == null || !response.containsKey("results")) {
            throw new BadRequestException("Unable to geocode delivery address");
        }
        List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
        if (results == null || results.isEmpty()) {
            throw new BadRequestException("Unable to geocode delivery address");
        }

        Map<String, Object> first = results.get(0);
        Number lat = (Number) first.get("lat");
        Number lon = (Number) first.get("lon");
        if (lat == null || lon == null) {
            throw new BadRequestException("Unable to geocode delivery address");
        }

        return GeocodeResponse.builder()
                .formattedAddress(String.valueOf(first.getOrDefault("address", "")))
                .latitude(lat.doubleValue())
                .longitude(lon.doubleValue())
                .provider(PROVIDER)
                .build();
    }
}
