package com.HealthLink.controller.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.dto.pharmacy.PharmacyOrderStatusRequest;
import com.HealthLink.service.pharmacy.PharmacyOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST API – Pharmacy Order Management
 *
 * POST   /api/pharmacy-orders/transfer              → Bác sĩ chuyển đơn thuốc
 * GET    /api/pharmacy-orders/pharmacy/{pharmacyId} → Danh sách đơn hàng cho dược sĩ
 * PATCH  /api/pharmacy-orders/{orderId}/status      → Dược sĩ cập nhật trạng thái
 * GET    /api/pharmacy-orders/patient/{patientId}   → Bệnh nhân theo dõi đơn thuốc
 * GET    /api/pharmacy-orders/{orderId}             → Chi tiết một đơn hàng
 */
@RestController
@RequestMapping("/api/pharmacy-orders")
@RequiredArgsConstructor
public class PharmacyOrderController {

    private final PharmacyOrderService pharmacyOrderService;

    // ── Task 2.1 & 2.3: Bác sĩ chuyển đơn thuốc ────────────────────────────
    @PostMapping("/transfer")
    public ResponseEntity<PharmacyOrderResponse> transferPrescription(
            @Valid @RequestBody PharmacyOrderRequest request) {

        PharmacyOrderResponse response = pharmacyOrderService.transferPrescription(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── Task 2.2: Dược sĩ cập nhật trạng thái ───────────────────────────────
    @PatchMapping("/{orderId}/status")
    public ResponseEntity<PharmacyOrderResponse> updateOrderStatus(
            @PathVariable Integer orderId,
            @Valid @RequestBody PharmacyOrderStatusRequest request) {

        PharmacyOrderResponse response = pharmacyOrderService.updateOrderStatus(orderId, request);
        return ResponseEntity.ok(response);
    }

    // ── Danh sách đơn hàng theo pharmacy (dược sĩ xem) ──────────────────────
    @GetMapping("/pharmacy/{pharmacyId}")
    public ResponseEntity<List<PharmacyOrderResponse>> getOrdersByPharmacy(
            @PathVariable String pharmacyId,
            @RequestParam(required = false) String status) {

        List<PharmacyOrderResponse> orders = pharmacyOrderService.getOrdersByPharmacy(pharmacyId, status);
        return ResponseEntity.ok(orders);
    }

    // ── Danh sách đơn hàng theo patient (bệnh nhân theo dõi) ─────────────────
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<PharmacyOrderResponse>> getOrdersByPatient(
            @PathVariable String patientId) {

        List<PharmacyOrderResponse> orders = pharmacyOrderService.getOrdersByPatient(patientId);
        return ResponseEntity.ok(orders);
    }

    // ── Chi tiết một đơn hàng ────────────────────────────────────────────────
    @GetMapping("/{orderId}")
    public ResponseEntity<PharmacyOrderResponse> getOrderById(
            @PathVariable Integer orderId) {

        PharmacyOrderResponse order = pharmacyOrderService.getOrderById(orderId);
        return ResponseEntity.ok(order);
    }
}
