package com.HealthLink.controller.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyWorkItemResponse;
import com.HealthLink.service.pharmacy.PharmacyWorkItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    @GetMapping("/pharmacy/{pharmacyId}")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<List<PharmacyWorkItemResponse>> getWorkItemsByPharmacy(
            @PathVariable String pharmacyId) {
        List<PharmacyWorkItemResponse> items = pharmacyWorkItemService.getWorkItemsByPharmacy(pharmacyId);
        return ResponseEntity.ok(items);
    }
}
