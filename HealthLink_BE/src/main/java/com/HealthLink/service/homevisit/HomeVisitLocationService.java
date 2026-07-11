package com.HealthLink.service.homevisit;

import com.HealthLink.dto.geocoding.GeocodeResponse;
import com.HealthLink.dto.response.HomeVisitEstimateResponse;
import com.HealthLink.dto.response.HomeVisitGeocodeResponse;
import com.HealthLink.entity.Doctor;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.service.geocoding.GeocodingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@Slf4j
public class HomeVisitLocationService {

    private final DoctorRepository doctorRepository;
    private final GeocodingService geocodingService;

    @Value("${home-visit.base-fee:100}")
    private BigDecimal homeVisitBaseFee;

    @Value("${home-visit.free-distance-km:3}")
    private Double freeDistanceKm;

    @Value("${home-visit.travel-fee-per-km:5}")
    private BigDecimal travelFeePerKm;

    @Value("${home-visit.average-speed-kmh:25}")
    private double averageSpeedKmh;

    public HomeVisitLocationService(DoctorRepository doctorRepository, GeocodingService geocodingService) {
        this.doctorRepository = doctorRepository;
        this.geocodingService = geocodingService;
    }

    public GeocodeResponse geocode(String address) {
        return geocodingService.geocode(address);
    }

    public GeocodeResponse geocodeClinicAddressWithFallback(String address) {
        if (address == null || address.isBlank()) {
            throw new BusinessException("Clinic address is required");
        }

        return geocode(address);
    }

    public List<HomeVisitGeocodeResponse> geocodeByNominatim(String address) {
        if (address == null || address.isBlank()) {
            throw new BusinessException("Address is required");
        }

        return geocodingService.search(address, 5).stream()
                .map(result -> HomeVisitGeocodeResponse.builder()
                        .displayName(result.getFormattedAddress())
                        .latitude(result.getLatitude())
                        .longitude(result.getLongitude())
                        .build())
                .toList();
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
            GeocodeResponse geo = geocode(doctor.getClinicAddress());
            originLat = geo.getLatitude();
            originLng = geo.getLongitude();
            doctor.setLatitude(originLat);
            doctor.setLongitude(originLng);
            doctorRepository.save(doctor);
        }

        double distance = calculateStraightDistanceKm(originLat, originLng, visitLatitude, visitLongitude);
        double radiusKm = doctor.getHomeVisitRadiusKm() != null ? doctor.getHomeVisitRadiusKm() : 10.0;
        boolean serviceable = distance <= radiusKm;

        double roundedDistance = Math.round(distance * 10.0) / 10.0;
        int estimatedMinutes = (int) Math.ceil((distance / averageSpeedKmh) * 60);

        double extraKm = Math.max(0, roundedDistance - freeDistanceKm);
        double billedExtraKm = Math.ceil(extraKm);
        BigDecimal extraTravelFee = travelFeePerKm
                .multiply(BigDecimal.valueOf(billedExtraKm))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalFee = homeVisitBaseFee
                .add(extraTravelFee)
                .setScale(2, RoundingMode.HALF_UP);

        return HomeVisitEstimateResponse.builder()
                .distanceKm(roundedDistance)
                .estimatedTravelMinutes(estimatedMinutes)
                .homeVisitFee(homeVisitBaseFee)
                .travelFee(extraTravelFee)
                .totalFee(totalFee)
                .serviceable(serviceable)
                .message(serviceable
                        ? "This address is within our home visit service area."
                        : "This address is outside our home visit service area.")
                .build();
    }

    public double calculateStraightDistanceKm(double lat1, double lon1, double lat2, double lon2) {
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

}
