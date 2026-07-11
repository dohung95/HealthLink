package com.HealthLink.service.impl.geocoding;

import com.HealthLink.dto.geocoding.GeocodeResponse;
import com.HealthLink.exception.GeocodingProviderUnavailableException;
import com.HealthLink.exception.GeocodingResultNotFoundException;
import com.HealthLink.service.geocoding.GeocodingService;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeoapifyGeocodingServiceImpl implements GeocodingService {
    private static final String PROVIDER = "GEOAPIFY";
    private static final String SEARCH_URL = "https://api.geoapify.com/v1/geocode/search";
    private static final String REVERSE_URL = "https://api.geoapify.com/v1/geocode/reverse";

    @Value("${geoapify.api-key:}")
    private String apiKey;

    private final RestTemplateBuilder restTemplateBuilder;
    private final NominatimGeocodingClient nominatimGeocodingClient;

    @Override
    public GeocodeResponse geocode(String address) {
        return search(address, 1).stream()
                .findFirst()
                .orElseThrow(() -> new GeocodingResultNotFoundException("Unable to find the delivery address"));
    }

    @Override
    public List<GeocodeResponse> search(String address, int limit) {
        try {
            List<GeocodeResponse> results = searchWithGeoapify(address, limit);
            if (!results.isEmpty()) {
                return results;
            }
        } catch (GeocodingProviderUnavailableException ex) {
            log.warn("Geoapify forward geocoding unavailable; using fallback");
        }

        try {
            return nominatimGeocodingClient.search(address, limit);
        } catch (GeocodingProviderUnavailableException ex) {
            throw new GeocodingProviderUnavailableException("Address verification is temporarily unavailable");
        }
    }

    @Override
    public GeocodeResponse reverseGeocode(Double latitude, Double longitude) {
        try {
            GeocodeResponse result = reverseWithGeoapify(latitude, longitude);
            if (result != null) {
                return result;
            }
        } catch (GeocodingProviderUnavailableException ex) {
            log.warn("Geoapify reverse geocoding unavailable; using fallback");
        }

        return nominatimGeocodingClient.reverse(latitude, longitude)
                .orElseThrow(() -> new GeocodingResultNotFoundException("Unable to find the delivery address"));
    }

    private List<GeocodeResponse> searchWithGeoapify(String address, int limit) {
        requireApiKey();
        URI uri = UriComponentsBuilder.fromHttpUrl(SEARCH_URL)
                .queryParam("text", address)
                .queryParam("filter", "countrycode:vn")
                .queryParam("lang", "vi")
                .queryParam("limit", Math.max(1, limit))
                .queryParam("format", "json")
                .queryParam("apiKey", apiKey)
                .build()
                .encode(StandardCharsets.UTF_8)
                .toUri();
        return parseResults(exchange(uri));
    }

    private GeocodeResponse reverseWithGeoapify(Double latitude, Double longitude) {
        requireApiKey();
        URI uri = UriComponentsBuilder.fromHttpUrl(REVERSE_URL)
                .queryParam("lat", latitude)
                .queryParam("lon", longitude)
                .queryParam("lang", "vi")
                .queryParam("limit", 1)
                .queryParam("format", "json")
                .queryParam("apiKey", apiKey)
                .build()
                .encode(StandardCharsets.UTF_8)
                .toUri();
        return parseResults(exchange(uri)).stream().findFirst().orElse(null);
    }

    private Map<String, Object> exchange(URI uri) {
        try {
            Map<String, Object> response = restTemplateBuilder.build()
                    .exchange(uri, HttpMethod.GET, HttpEntity.EMPTY, Map.class)
                    .getBody();
            if (response == null) {
                throw new GeocodingProviderUnavailableException("Address verification is temporarily unavailable");
            }
            return response;
        } catch (RestClientException ex) {
            throw new GeocodingProviderUnavailableException("Address verification is temporarily unavailable");
        }
    }

    @SuppressWarnings("unchecked")
    private List<GeocodeResponse> parseResults(Map<String, Object> response) {
        Object rawResults = response.get("results");
        if (!(rawResults instanceof List<?> items)) {
            throw new GeocodingProviderUnavailableException("Address verification is temporarily unavailable");
        }
        List<GeocodeResponse> results = new ArrayList<>();
        for (Object item : items) {
            if (!(item instanceof Map<?, ?> rawItem)) {
                continue;
            }
            Double latitude = asDouble(rawItem.get("lat"));
            Double longitude = asDouble(rawItem.get("lon"));
            if (latitude == null || longitude == null) {
                continue;
            }
            Object formattedValue = rawItem.get("formatted");
            String formatted = formattedValue == null ? "" : String.valueOf(formattedValue).trim();
            if (formatted.isBlank()) {
                continue;
            }
            results.add(GeocodeResponse.builder()
                    .formattedAddress(formatted)
                    .latitude(latitude)
                    .longitude(longitude)
                    .provider(PROVIDER)
                    .build());
        }
        return results;
    }

    private void requireApiKey() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new GeocodingProviderUnavailableException("Address verification is temporarily unavailable");
        }
    }

    private Double asDouble(Object value) {
        try {
            double coordinate = value instanceof Number number
                    ? number.doubleValue()
                    : Double.parseDouble(String.valueOf(value));
            return Double.isFinite(coordinate) ? coordinate : null;
        } catch (RuntimeException ex) {
            return null;
        }
    }
}
