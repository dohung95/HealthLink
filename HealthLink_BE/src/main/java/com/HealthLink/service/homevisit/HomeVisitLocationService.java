package com.HealthLink.service.homevisit;

import com.HealthLink.dto.response.HomeVisitEstimateResponse;
import com.HealthLink.dto.response.HomeVisitGeocodeResponse;
import com.HealthLink.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
public class HomeVisitLocationService {

    private final RestTemplate restTemplate;

    @Value("${home-visit.base-latitude}")
    private Double baseLatitude;

    @Value("${home-visit.base-longitude}")
    private Double baseLongitude;

    @Value("${home-visit.max-distance-km:15}")
    private Double maxDistanceKm;

    @Value("${home-visit.base-fee:300000}")
    private BigDecimal baseFee;

    @Value("${home-visit.free-distance-km:3}")
    private Double freeDistanceKm;

    @Value("${home-visit.travel-fee-per-km:12000}")
    private BigDecimal travelFeePerKm;

    @Value("${home-visit.average-speed-kmh:25}")
    private Double averageSpeedKmh;

    public HomeVisitLocationService(RestTemplateBuilder builder) {
        this.restTemplate = builder.build();
    }

    public List<HomeVisitGeocodeResponse> geocode(String address) {
        if (address == null || address.isBlank()) {
            throw new BusinessException("Address is required");
        }

        String encodedAddress = URLEncoder.encode(address, StandardCharsets.UTF_8);

        String url = "https://nominatim.openstreetmap.org/search"
                + "?q=" + encodedAddress
                + "&format=json"
                + "&limit=5"
                + "&countrycodes=vn"
                + "&addressdetails=1";

        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "HealthLink-EProject/1.0");

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                JsonNode.class
        );

        JsonNode body = response.getBody();

        List<HomeVisitGeocodeResponse> results = new ArrayList<>();

        if (body == null || !body.isArray()) {
            return results;
        }

        for (JsonNode item : body) {
            results.add(
                    HomeVisitGeocodeResponse.builder()
                            .displayName(item.path("display_name").asText())
                            .latitude(parseDouble(item.path("lat").asText()))
                            .longitude(parseDouble(item.path("lon").asText()))
                            .build()
            );
        }

        return results;
    }

    public HomeVisitEstimateResponse estimate(Double visitLatitude, Double visitLongitude) {
        if (visitLatitude == null || visitLongitude == null) {
            throw new BusinessException("Visit location is required");
        }

        RouteDistance routeDistance = getRouteDistanceFromOsrm(visitLatitude, visitLongitude);

        double distanceKm = routeDistance.distanceKm();
        int estimatedMinutes = routeDistance.durationMinutes();

        double roundedDistance = Math.round(distanceKm * 10.0) / 10.0;

        boolean serviceable = roundedDistance <= maxDistanceKm;

        double extraKm = Math.max(0, roundedDistance - freeDistanceKm);
        double billedExtraKm = Math.ceil(extraKm);

        BigDecimal extraTravelFee = travelFeePerKm
                .multiply(BigDecimal.valueOf(billedExtraKm))
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalFee = baseFee
                .add(extraTravelFee)
                .setScale(2, RoundingMode.HALF_UP);

        return HomeVisitEstimateResponse.builder()
                .distanceKm(roundedDistance)
                .estimatedTravelMinutes(estimatedMinutes)
                .homeVisitFee(baseFee)
                .travelFee(extraTravelFee)
                .totalFee(totalFee)
                .serviceable(serviceable)
                .message(serviceable
                        ? "This address is within our home visit service area."
                        : "This address is outside our home visit service area.")
                .build();
    }

    private RouteDistance getRouteDistanceFromOsrm(Double visitLatitude, Double visitLongitude) {
        try {
            String url = "https://router.project-osrm.org/route/v1/driving/"
                    + baseLongitude + "," + baseLatitude
                    + ";"
                    + visitLongitude + "," + visitLatitude
                    + "?overview=false";

            ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);

            JsonNode route = response.getBody()
                    .path("routes")
                    .path(0);

            if (route.isMissingNode()) {
                return getFallbackDistance(visitLatitude, visitLongitude);
            }

            double distanceMeters = route.path("distance").asDouble();
            double durationSeconds = route.path("duration").asDouble();

            return new RouteDistance(
                    distanceMeters / 1000.0,
                    (int) Math.ceil(durationSeconds / 60.0)
            );

        } catch (Exception e) {
            return getFallbackDistance(visitLatitude, visitLongitude);
        }
    }

    private RouteDistance getFallbackDistance(Double visitLatitude, Double visitLongitude) {
        double distanceKm = calculateStraightDistanceKm(
                baseLatitude,
                baseLongitude,
                visitLatitude,
                visitLongitude
        );

        int minutes = (int) Math.ceil((distanceKm / averageSpeedKmh) * 60);

        return new RouteDistance(distanceKm, minutes);
    }

    private double calculateStraightDistanceKm(
            double lat1,
            double lon1,
            double lat2,
            double lon2
    ) {
        final int earthRadiusKm = 6371;

        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2)
                * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return earthRadiusKm * c;
    }

    private Double parseDouble(String value) {
        try {
            return Double.parseDouble(value);
        } catch (Exception e) {
            return null;
        }
    }

    private record RouteDistance(Double distanceKm, Integer durationMinutes) {

    }
}
