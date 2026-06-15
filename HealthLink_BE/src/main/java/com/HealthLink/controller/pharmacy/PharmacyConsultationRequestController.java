package com.HealthLink.controller.pharmacy;

import com.HealthLink.dto.chat.ChatRoomDTO;
import com.HealthLink.dto.pharmacy.PharmacyConsultationOrderCreateRequest;
import com.HealthLink.dto.pharmacy.PharmacyConsultationRequestCreateRequest;
import com.HealthLink.dto.pharmacy.PharmacyConsultationRequestResponse;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.dto.pharmacy.PharmacyConsultationRequestStatusUpdateRequest;
import com.HealthLink.dto.prescription.PrescriptionResponse;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.chat.ChatService;
import com.HealthLink.service.pharmacy.PharmacyConsultationRequestService;
import com.HealthLink.service.pharmacy.PharmacyOrderService;
import com.HealthLink.utility.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pharmacy-requests")
@RequiredArgsConstructor
public class PharmacyConsultationRequestController {

    private final PharmacyConsultationRequestService pharmacyConsultationRequestService;
    private final PharmacyOrderService pharmacyOrderService;
    private final SecurityUtils securityUtils;
    private final UserRepository userRepository;
    private final ChatService chatService;

    @PostMapping
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PharmacyConsultationRequestResponse> createRequest(
            @Valid @RequestBody PharmacyConsultationRequestCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pharmacyConsultationRequestService.createRequest(request));
    }

    @GetMapping("/pharmacy/{pharmacyId}")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<List<PharmacyConsultationRequestResponse>> getRequestsByPharmacy(
            @PathVariable String pharmacyId,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal UserDetails userDetails) {
        securityUtils.verifyPharmacyOwnership(userDetails, pharmacyId);
        return ResponseEntity.ok(
                pharmacyConsultationRequestService.getRequestsByPharmacy(pharmacyId, status)
        );
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<List<PharmacyConsultationRequestResponse>> getRequestsByPatient(
            @PathVariable String patientId) {
        return ResponseEntity.ok(
                pharmacyConsultationRequestService.getRequestsByPatient(patientId)
        );
    }

    @GetMapping("/{requestId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PharmacyConsultationRequestResponse> getRequestById(
            @PathVariable Integer requestId) {
        return ResponseEntity.ok(pharmacyConsultationRequestService.getRequestById(requestId));
    }

    @GetMapping("/{requestId}/chat-room")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ChatRoomDTO> getChatRoom(@PathVariable Integer requestId) {
        PharmacyConsultationRequestResponse request = pharmacyConsultationRequestService
                .getRequestById(requestId);
        if (request.getChatRoomId() == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(chatService.getRoomById(request.getChatRoomId()));
    }

    @PatchMapping("/{requestId}/status")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<PharmacyConsultationRequestResponse> updateRequestStatus(
            @PathVariable Integer requestId,
            @Valid @RequestBody PharmacyConsultationRequestStatusUpdateRequest request) {
        return ResponseEntity.ok(
                pharmacyConsultationRequestService.updateRequestStatus(requestId, request)
        );
    }

    @GetMapping("/{requestId}/prescriptions")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<List<PrescriptionResponse>> getRequestPrescriptions(
            @PathVariable Integer requestId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String pharmacyId = resolveUserId(userDetails);
        return ResponseEntity.ok(
                pharmacyConsultationRequestService.getRequestPrescriptions(requestId, pharmacyId)
        );
    }

    @PostMapping("/{requestId}/order")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<PharmacyOrderResponse> createOrder(
            @PathVariable Integer requestId,
            @Valid @RequestBody PharmacyConsultationOrderCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String pharmacyId = resolveUserId(userDetails);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pharmacyOrderService.createOrderFromConsultationRequest(requestId, request, pharmacyId));
    }

    private String resolveUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User", "email", userDetails.getUsername()))
                .getId();
    }
}
