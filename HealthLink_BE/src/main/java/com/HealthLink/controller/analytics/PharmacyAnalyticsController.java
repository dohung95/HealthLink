package com.HealthLink.controller.analytics;

import com.HealthLink.dto.analytics.PharmacyDemandAnalyticsResponse;
import com.HealthLink.service.analytics.PharmacyAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.UserRepository;

@RestController
@RequestMapping("/api/account/pharmacy/analytics")
@RequiredArgsConstructor
public class PharmacyAnalyticsController {

    private final PharmacyAnalyticsService pharmacyAnalyticsService;
    private final UserRepository userRepository;

    private String resolveUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", userDetails.getUsername()))
                .getId();
    }

    @GetMapping("/demand")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<PharmacyDemandAnalyticsResponse> getDemandAnalytics(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "30d") String period,
            @RequestParam(defaultValue = "vi") String lang) {
        String pharmacyId = resolveUserId(userDetails);
        return ResponseEntity.ok(pharmacyAnalyticsService.getDemandAnalytics(pharmacyId, period, lang));
    }
}
