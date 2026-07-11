package com.HealthLink.service.impl.geocoding;

import com.HealthLink.dto.geocoding.GeocodeResponse;
import com.HealthLink.exception.GeocodingProviderUnavailableException;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class NominatimGeocodingClient {
    private static final String PROVIDER = "NOMINATIM";
    private static final String SEARCH_URL = "https://nominatim.openstreetmap.org/search";
    private static final String REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

    private final RestTemplateBuilder restTemplateBuilder;

    public Optional<GeocodeResponse> forward(String address) {
        return search(address, 1).stream().findFirst();
    }

    public List<GeocodeResponse> search(String address, int limit) {
        String url = UriComponentsBuilder.fromHttpUrl(SEARCH_URL)
                .queryParam("q", address)
                .queryParam("format", "json")
                .queryParam("limit", Math.max(1, limit))
                .queryParam("countrycodes", "vn")
                .queryParam("addressdetails", 1)
                .build()
                .encode()
                .toUriString();

        try {
            ResponseEntity<JsonNode> response = restTemplateBuilder.build().exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers()), JsonNode.class);
            JsonNode body = response.getBody();
            List<GeocodeResponse> results = new ArrayList<>();
            if (body == null || !body.isArray()) {
                return results;
            }
            for (JsonNode item : body) {
                GeocodeResponse result = toResponse(item);
                if (result != null) {
                    results.add(result);
                }
            }
            return results;
        } catch (RestClientException ex) {
            throw new GeocodingProviderUnavailableException("Address verification is temporarily unavailable");
        }
    }

    public Optional<GeocodeResponse> reverse(Double latitude, Double longitude) {
        String url = UriComponentsBuilder.fromHttpUrl(REVERSE_URL)
                .queryParam("lat", latitude)
                .queryParam("lon", longitude)
                .queryParam("format", "json")
                .queryParam("zoom", 18)
                .build()
                .encode()
                .toUriString();
        try {
            ResponseEntity<JsonNode> response = restTemplateBuilder.build().exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers()), JsonNode.class);
            return Optional.ofNullable(toResponse(response.getBody()));
        } catch (RestClientException ex) {
            throw new GeocodingProviderUnavailableException("Address verification is temporarily unavailable");
        }
    }

    private HttpHeaders headers() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "HealthLink-EProject/1.0");
        return headers;
    }

    private GeocodeResponse toResponse(JsonNode item) {
        if (item == null || item.isMissingNode()) {
            return null;
        }
        Double latitude = asDouble(item.path("lat"));
        Double longitude = asDouble(item.path("lon"));
        if (latitude == null || longitude == null) {
            return null;
        }
        String address = item.path("display_name").asText("");
        return GeocodeResponse.builder()
                .formattedAddress(address)
                .latitude(latitude)
                .longitude(longitude)
                .provider(PROVIDER)
                .build();
    }

    private Double asDouble(JsonNode value) {
        try {
            if (value == null || value.isMissingNode() || value.asText().isBlank()) {
                return null;
            }
            double coordinate = Double.parseDouble(value.asText());
            return Double.isFinite(coordinate) ? coordinate : null;
        } catch (RuntimeException ignored) {
            return null;
        }
    }
}
