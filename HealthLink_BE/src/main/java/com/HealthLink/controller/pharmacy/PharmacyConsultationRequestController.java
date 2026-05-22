package com.HealthLink.controller.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyConsultationRequestCreateRequest;
import com.HealthLink.dto.pharmacy.PharmacyConsultationRequestResponse;
import com.HealthLink.dto.pharmacy.PharmacyConsultationRequestStatusUpdateRequest;
import com.HealthLink.dto.pharmacy.PharmacyPrescriptionCreationResponse;
import com.HealthLink.dto.pharmacy.PharmacyPrescriptionRequest;
import com.HealthLink.service.pharmacy.PharmacyConsultationRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pharmacy-requests")
@RequiredArgsConstructor
public class PharmacyConsultationRequestController {

    private final PharmacyConsultationRequestService pharmacyConsultationRequestService;

    @PostMapping
    public ResponseEntity<PharmacyConsultationRequestResponse> createRequest(
            @Valid @RequestBody PharmacyConsultationRequestCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pharmacyConsultationRequestService.createRequest(request));
    }

    @GetMapping("/pharmacy/{pharmacyId}")
    public ResponseEntity<List<PharmacyConsultationRequestResponse>> getRequestsByPharmacy(
            @PathVariable String pharmacyId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(
                pharmacyConsultationRequestService.getRequestsByPharmacy(pharmacyId, status)
        );
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<PharmacyConsultationRequestResponse>> getRequestsByPatient(
            @PathVariable String patientId) {
        return ResponseEntity.ok(
                pharmacyConsultationRequestService.getRequestsByPatient(patientId)
        );
    }

    @GetMapping("/{requestId}")
    public ResponseEntity<PharmacyConsultationRequestResponse> getRequestById(
            @PathVariable Integer requestId) {
        return ResponseEntity.ok(pharmacyConsultationRequestService.getRequestById(requestId));
    }

    @PatchMapping("/{requestId}/status")
    public ResponseEntity<PharmacyConsultationRequestResponse> updateRequestStatus(
            @PathVariable Integer requestId,
            @Valid @RequestBody PharmacyConsultationRequestStatusUpdateRequest request) {
        return ResponseEntity.ok(
                pharmacyConsultationRequestService.updateRequestStatus(requestId, request)
        );
    }

    @PostMapping("/{requestId}/prescription")
    public ResponseEntity<PharmacyPrescriptionCreationResponse> createPrescription(
            @PathVariable Integer requestId,
            @Valid @RequestBody PharmacyPrescriptionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pharmacyConsultationRequestService.createPrescription(requestId, request));
    }
}
