package com.HealthLink.controller.pharmacy;

import com.HealthLink.dto.pharmacy.CancelOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyConsultationOrderCreateRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.dto.pharmacy.PharmacyOrderRevisionRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderStatusRequest;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.pharmacy.PharmacyOrderService;
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

    @PatchMapping("/{orderId}/status")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<PharmacyOrderResponse> updateOrderStatus(
            @PathVariable Integer orderId,
            @Valid @RequestBody PharmacyOrderStatusRequest request) {

        PharmacyOrderResponse response = pharmacyOrderService.updateOrderStatus(orderId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/pharmacy/{pharmacyId}")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<List<PharmacyOrderResponse>> getOrdersByPharmacy(
            @PathVariable String pharmacyId,
            @RequestParam(required = false) String status) {

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

    private String resolveUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User", "email", userDetails.getUsername()))
                .getId();
    }
}
