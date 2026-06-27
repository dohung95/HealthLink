package com.HealthLink.service.homevisit;

import com.HealthLink.dto.geocoding.GeocodeResponse;
import com.HealthLink.dto.response.HomeVisitEstimateResponse;
import com.HealthLink.dto.response.HomeVisitGeocodeResponse;
import com.HealthLink.entity.Doctor;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.service.geocoding.GeocodingService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class HomeVisitLocationService {

    private final RestTemplate restTemplate;
    private final DoctorRepository doctorRepository;
    private final GeocodingService geocodingService;

    @Value("${home-visit.base-fee:300000}")
    private BigDecimal baseFee;

    @Value("${home-visit.free-distance-km:3}")
    private Double freeDistanceKm;

    @Value("${home-visit.travel-fee-per-km:12000}")
    private BigDecimal travelFeePerKm;

    @Value("${home-visit.average-speed-kmh:25}")
    private Double averageSpeedKmh;

    @Value("${home-visit.max-distance-km:10}")
    private Double maxDistanceKm;

    public HomeVisitLocationService(RestTemplateBuilder builder,
                                    DoctorRepository doctorRepository,
                                    GeocodingService geocodingService) {
        this.restTemplate = builder.build();
        this.doctorRepository = doctorRepository;
        this.geocodingService = geocodingService;
    }

    public List<HomeVisitGeocodeResponse> searchAddressByNominatim(String address) {
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

    public GeocodeResponse geocodeClinicAddressWithFallback(String address) {
        try {
            return geocodingService.geocode(address);
        } catch (Exception e) {
            log.warn("Gogoduk geocode failed, falling back to Nominatim: {}", e.getMessage());
            List<HomeVisitGeocodeResponse> results = searchAddressByNominatim(address);
            if (results.isEmpty()) {
                throw new BusinessException("Cannot geocode address: " + address);
            }
            HomeVisitGeocodeResponse first = results.get(0);
            return GeocodeResponse.builder()
                    .latitude(first.getLatitude())
                    .longitude(first.getLongitude())
                    .provider("NOMINATIM")
                    .build();
        }
    }

    public HomeVisitEstimateResponse estimate(String doctorId, Double visitLatitude, Double visitLongitude) {
        if (visitLatitude == null || visitLongitude == null) {
            throw new BusinessException("Visit location is required");
        }

        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new BusinessException("Doctor not found"));

        Double originLat = doctor.getLatitude();
        Double originLng = doctor.getLongitude();
        if (originLat == null || originLng == null) {
            if (doctor.getClinicAddress() == null || doctor.getClinicAddress().isBlank()) {
                throw new BusinessException("Doctor has no clinic address");
            }
            GeocodeResponse geo = geocodeClinicAddressWithFallback(doctor.getClinicAddress());
            originLat = geo.getLatitude();
            originLng = geo.getLongitude();
            doctor.setLatitude(originLat);
            doctor.setLongitude(originLng);
            doctorRepository.save(doctor);
        }

        double straightDistance = calculateStraightDistanceKm(originLat, originLng, visitLatitude, visitLongitude);
        boolean serviceable = straightDistance <= maxDistanceKm;

        if (!serviceable) {
            return HomeVisitEstimateResponse.builder()
                    .distanceKm(0.0)
                    .estimatedTravelMinutes(0)
                    .homeVisitFee(baseFee)
                    .travelFee(BigDecimal.ZERO)
                    .totalFee(baseFee)
                    .serviceable(false)
                    .message("Outside service area")
                    .build();
        }

        RouteDistance route = getRouteDistanceFromOsrm(originLat, originLng, visitLatitude, visitLongitude);

        double roundedDistance = Math.round(route.distanceKm() * 10.0) / 10.0;

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
                .estimatedTravelMinutes(route.durationMinutes())
                .homeVisitFee(baseFee)
                .travelFee(extraTravelFee)
                .totalFee(totalFee)
                .serviceable(true)
                .message("Within service area")
                .build();
    }

    private RouteDistance getRouteDistanceFromOsrm(Double originLat, Double originLng,
                                                    Double visitLat, Double visitLng) {
        try {
            String url = "https://router.project-osrm.org/route/v1/driving/"
                    + originLng + "," + originLat
                    + ";"
                    + visitLng + "," + visitLat
                    + "?overview=false";

            ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);

            JsonNode route = response.getBody()
                    .path("routes")
                    .path(0);

            if (route.isMissingNode()) {
                return getFallbackDistance(originLat, originLng, visitLat, visitLng);
            }

            double distanceMeters = route.path("distance").asDouble();
            double durationSeconds = route.path("duration").asDouble();

            return new RouteDistance(
                    distanceMeters / 1000.0,
                    (int) Math.ceil(durationSeconds / 60.0)
            );

        } catch (Exception e) {
            return getFallbackDistance(originLat, originLng, visitLat, visitLng);
        }
    }

    private RouteDistance getFallbackDistance(Double originLat, Double originLng,
                                              Double visitLat, Double visitLng) {
        double distanceKm = calculateStraightDistanceKm(
                originLat,
                originLng,
                visitLat,
                visitLng
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
