package com.HealthLink.controller.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyWorkItemResponse;
import com.HealthLink.service.pharmacy.PharmacyWorkItemService;
import com.HealthLink.utility.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/pharmacy-work-items")
@RequiredArgsConstructor
public class PharmacyWorkItemController {

    private final PharmacyWorkItemService pharmacyWorkItemService;
    private final SecurityUtils securityUtils;

    @GetMapping("/pharmacy/{pharmacyId}")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<List<PharmacyWorkItemResponse>> getWorkItemsByPharmacy(
            @PathVariable String pharmacyId,
            @AuthenticationPrincipal UserDetails userDetails) {
        securityUtils.verifyPharmacyOwnership(userDetails, pharmacyId);
        List<PharmacyWorkItemResponse> items = pharmacyWorkItemService.getWorkItemsByPharmacy(pharmacyId);
        return ResponseEntity.ok(items);
    }
}
