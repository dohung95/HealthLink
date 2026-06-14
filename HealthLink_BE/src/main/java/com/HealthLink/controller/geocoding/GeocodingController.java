package com.HealthLink.controller.geocoding;

import com.HealthLink.dto.geocoding.GeocodeRequest;
import com.HealthLink.dto.geocoding.GeocodeResponse;
import com.HealthLink.dto.geocoding.ReverseGeocodeRequest;
import com.HealthLink.service.geocoding.GeocodingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/geocoding")
@RequiredArgsConstructor
public class GeocodingController {
    private final GeocodingService geocodingService;

    @PostMapping("/geocode")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<GeocodeResponse> geocode(@Valid @RequestBody GeocodeRequest request) {
        return ResponseEntity.ok(geocodingService.geocode(request.getAddress()));
    }

    @PostMapping("/reverse")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<GeocodeResponse> reverse(@Valid @RequestBody ReverseGeocodeRequest request) {
        return ResponseEntity.ok(
                geocodingService.reverseGeocode(request.getLatitude(), request.getLongitude())
        );
    }
}
