package com.HealthLink.controller.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyInventoryImportResult;
import com.HealthLink.dto.pharmacy.PharmacyInventoryResponse;
import com.HealthLink.dto.pharmacy.PharmacyInventoryUpdateRequest;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.pharmacy.PharmacyInventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/pharmacy/inventory")
@RequiredArgsConstructor
public class PharmacyInventoryController {

    private final PharmacyInventoryService inventoryService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<Page<PharmacyInventoryResponse>> getInventory(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Boolean lowStock,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Boolean expiringSoon,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        String pharmacyId = resolveUserId(userDetails);
        return ResponseEntity.ok(
                inventoryService.getInventory(pharmacyId, query, lowStock, active, expiringSoon, page, size));
    }

    @GetMapping("/{inventoryId}")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<PharmacyInventoryResponse> getInventoryItem(
            @PathVariable Integer inventoryId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String pharmacyId = resolveUserId(userDetails);
        return ResponseEntity.ok(inventoryService.getInventoryItem(pharmacyId, inventoryId));
    }

    @PatchMapping("/{inventoryId}")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<PharmacyInventoryResponse> updateInventory(
            @PathVariable Integer inventoryId,
            @Valid @RequestBody PharmacyInventoryUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String pharmacyId = resolveUserId(userDetails);
        return ResponseEntity.ok(
                inventoryService.updateInventory(pharmacyId, inventoryId, request));
    }

    @PostMapping("/import")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<PharmacyInventoryImportResult> importCsv(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) {
        String pharmacyId = resolveUserId(userDetails);
        return ResponseEntity.ok(inventoryService.importCsv(pharmacyId, file));
    }

    @GetMapping("/template")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<byte[]> downloadTemplate(
            @AuthenticationPrincipal UserDetails userDetails) {
        String pharmacyId = resolveUserId(userDetails);
        byte[] template = inventoryService.generateCsvTemplate(pharmacyId);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDispositionFormData("attachment", "inventory-template.csv");
        return ResponseEntity.ok().headers(headers).body(template);
    }

    private String resolveUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User", "email", userDetails.getUsername()))
                .getId();
    }
}
