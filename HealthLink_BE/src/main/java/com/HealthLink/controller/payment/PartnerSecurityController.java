package com.HealthLink.controller.payment;

import com.HealthLink.dto.payment.PartnerPinStatusResponse;
import com.HealthLink.dto.payment.PartnerPinUpdateRequest;
import com.HealthLink.entity.User;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.payment.PartnerWithdrawalSecurityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payment/partner/security/pin")
@PreAuthorize("hasAnyRole('DOCTOR', 'PHARMACY')")
@RequiredArgsConstructor
public class PartnerSecurityController {
    private final PartnerWithdrawalSecurityService securityService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<PartnerPinStatusResponse> getStatus(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(securityService.getStatus(resolveUser(principal)));
    }

    @PostMapping("/request-otp")
    public ResponseEntity<Map<String, String>> requestOtp(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(Map.of("message", securityService.requestOtp(resolveUser(principal))));
    }

    @PutMapping
    public ResponseEntity<Void> setPin(@Valid @RequestBody PartnerPinUpdateRequest request,
                                       @AuthenticationPrincipal UserDetails principal) {
        securityService.setPin(resolveUser(principal), request);
        return ResponseEntity.noContent().build();
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", principal.getUsername()));
    }
}
