package com.HealthLink.controller.pharmacy;

import com.HealthLink.dto.pharmacy.CancelOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyConsultationOrderCreateRequest;
import com.HealthLink.dto.pharmacy.PharmacyDeliveryQuoteRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.dto.pharmacy.PharmacyDeliveryContactChangeResponse;
import com.HealthLink.dto.pharmacy.PharmacyDeliveryContactChangeReviewRequest;
import com.HealthLink.dto.pharmacy.PharmacyDeliveryContactUpdateRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderRevisionRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderStatusRequest;
import com.HealthLink.dto.pharmacy.RetailOrderRequest;
import com.HealthLink.exception.UnauthorizedAccessException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.pharmacy.PharmacyOrderService;
import com.HealthLink.utility.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/pharmacy-orders")
@RequiredArgsConstructor
public class PharmacyOrderController {

    private final PharmacyOrderService pharmacyOrderService;
    private final SecurityUtils securityUtils;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PharmacyOrderResponse> createOrderFromPrescription(
            @Valid @RequestBody PharmacyOrderRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        String patientId = resolveUserId(userDetails);
        PharmacyOrderResponse response = pharmacyOrderService.createOrderFromPrescription(request, patientId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/retail")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PharmacyOrderResponse> createRetailOrder(
            @Valid @RequestBody RetailOrderRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        String patientId = resolveUserId(userDetails);
        PharmacyOrderResponse response = pharmacyOrderService.createRetailOrder(request, patientId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{orderId}/status")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<PharmacyOrderResponse> updateOrderStatus(
            @PathVariable Integer orderId,
            @Valid @RequestBody PharmacyOrderStatusRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        var pharmacy = securityUtils.verifyPharmacyOwnershipByUser(userDetails);
        var existing = pharmacyOrderService.getOrderById(orderId);
        if (!pharmacy.getPharmacyId().equals(existing.getPharmacyId())) {
            throw new UnauthorizedAccessException("Access denied: this order does not belong to your pharmacy");
        }
        PharmacyOrderResponse response = pharmacyOrderService.updateOrderStatus(orderId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/pharmacy/{pharmacyId}")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<List<PharmacyOrderResponse>> getOrdersByPharmacy(
            @PathVariable String pharmacyId,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal UserDetails userDetails) {

        securityUtils.verifyPharmacyOwnership(userDetails, pharmacyId);
        List<PharmacyOrderResponse> orders = pharmacyOrderService.getOrdersByPharmacy(pharmacyId, status);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<List<PharmacyOrderResponse>> getOrdersByPatient(
            @PathVariable String patientId,
            @RequestParam(required = false) String status) {

        List<PharmacyOrderResponse> orders = pharmacyOrderService.getOrdersByPatient(patientId, status);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/doctor/{doctorId}")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<List<PharmacyOrderResponse>> getOrdersByDoctor(
            @PathVariable String doctorId) {

        List<PharmacyOrderResponse> orders = pharmacyOrderService.getOrdersByDoctor(doctorId);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/{orderId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PharmacyOrderResponse> getOrderById(
            @PathVariable Integer orderId) {

        PharmacyOrderResponse order = pharmacyOrderService.getOrderById(orderId);
        return ResponseEntity.ok(order);
    }

    @PostMapping("/{orderId}/cancel")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PharmacyOrderResponse> cancelOrderByPatient(
            @PathVariable Integer orderId,
            @RequestBody CancelOrderRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        String patientId = resolveUserId(userDetails);
        PharmacyOrderResponse response = pharmacyOrderService.cancelOrderByPatient(orderId, request, patientId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{orderId}/request-revision")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PharmacyOrderResponse> requestOrderRevision(
            @PathVariable Integer orderId,
            @Valid @RequestBody PharmacyOrderRevisionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        String patientId = resolveUserId(userDetails);
        PharmacyOrderResponse response = pharmacyOrderService.requestOrderRevision(orderId, request, patientId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{orderId}/quote")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<PharmacyOrderResponse> updateOrderQuote(
            @PathVariable Integer orderId,
            @Valid @RequestBody PharmacyConsultationOrderCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        String pharmacyId = resolveUserId(userDetails);
        PharmacyOrderResponse response = pharmacyOrderService.updateOrderQuote(orderId, request, pharmacyId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{orderId}/delivery-contact")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PharmacyOrderResponse> updateDeliveryContact(
            @PathVariable Integer orderId,
            @Valid @RequestBody PharmacyDeliveryContactUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String patientId = resolveUserId(userDetails);
        return ResponseEntity.ok(
            pharmacyOrderService.updateDeliveryContact(orderId, request, patientId)
        );
    }

    @PostMapping("/{orderId}/delivery-contact-change-requests")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PharmacyDeliveryContactChangeResponse> requestDeliveryContactChange(
            @PathVariable Integer orderId,
            @Valid @RequestBody PharmacyDeliveryContactUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String patientId = resolveUserId(userDetails);
        return ResponseEntity.status(HttpStatus.CREATED).body(
            pharmacyOrderService.requestDeliveryContactChange(orderId, request, patientId)
        );
    }

    @PatchMapping("/delivery-contact-change-requests/{requestId}/status")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<PharmacyDeliveryContactChangeResponse> reviewDeliveryContactChange(
            @PathVariable Integer requestId,
            @Valid @RequestBody PharmacyDeliveryContactChangeReviewRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        var pharmacy = securityUtils.verifyPharmacyOwnershipByUser(userDetails);
        return ResponseEntity.ok(
            pharmacyOrderService.reviewDeliveryContactChange(requestId, request, pharmacy.getPharmacyId())
        );
    }

    @PatchMapping("/{orderId}/delivery-quote")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<PharmacyOrderResponse> submitDeliveryQuote(
            @PathVariable Integer orderId,
            @Valid @RequestBody PharmacyDeliveryQuoteRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        var pharmacy = securityUtils.verifyPharmacyOwnershipByUser(userDetails);
        return ResponseEntity.ok(
                pharmacyOrderService.submitDeliveryQuote(orderId, request, pharmacy.getPharmacyId())
        );
    }

    @PostMapping("/{orderId}/patient-confirm")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PharmacyOrderResponse> confirmOrderTotalByPatient(
            @PathVariable Integer orderId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String patientId = resolveUserId(userDetails);
        return ResponseEntity.ok(pharmacyOrderService.confirmOrderTotalByPatient(orderId, patientId));
    }

    private String resolveUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new com.HealthLink.exception.ResourceNotFoundException(
                        "User", "email", userDetails.getUsername()))
                .getId();
    }
}
