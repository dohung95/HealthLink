package com.HealthLink.controller.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyRecommendationResponse;
import com.HealthLink.dto.pharmacy.RetailPharmacyAvailabilityRequest;
import com.HealthLink.dto.pharmacy.RetailPharmacyRecommendationResponse;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.pharmacy.PharmacyRecommendationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/account/pharmacy/public/recommendations")
@RequiredArgsConstructor
public class PharmacyRecommendationController {

    private final PharmacyRecommendationService recommendationService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<List<PharmacyRecommendationResponse>> getRecommendations(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) Boolean deliveryOnly,
            @RequestParam(required = false) Integer prescriptionHeaderId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String patientId = resolveUserId(userDetails);
        return ResponseEntity.ok(
                recommendationService.getRecommendations(lat, lng, deliveryOnly,
                        prescriptionHeaderId, patientId));
    }

    @PostMapping("/cart")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<List<RetailPharmacyRecommendationResponse>> getRetailRecommendations(
            @Valid @RequestBody RetailPharmacyAvailabilityRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String patientId = resolveUserId(userDetails);
        return ResponseEntity.ok(recommendationService.getRetailRecommendations(request, patientId));
    }

    private String resolveUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User", "email", userDetails.getUsername()))
                .getId();
    }
}
