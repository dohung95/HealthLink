package com.HealthLink.controller.consultation;

import com.HealthLink.dto.consultation.FollowUpRequest;
import com.HealthLink.dto.consultation.FollowUpResponse;
import com.HealthLink.service.consultation.ConsultationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/consultations")
@RequiredArgsConstructor
public class ConsultationController {

    private final ConsultationService consultationService;

    /**
     * PUT /api/consultations/{id}/follow-up
     * Cập nhật lịch tái khám vào buổi tư vấn.
     */
    @PutMapping("/{id}/follow-up")
    public ResponseEntity<FollowUpResponse> updateFollowUp(
            @PathVariable Integer id,
            @Valid @RequestBody FollowUpRequest request) {
        return ResponseEntity.ok(consultationService.updateFollowUp(id, request));
    }

    /**
     * GET /api/consultations/{id}/follow-up
     * Lấy thông tin tái khám của một buổi tư vấn.
     */
    @GetMapping("/{id}/follow-up")
    public ResponseEntity<FollowUpResponse> getFollowUp(@PathVariable Integer id) {
        return ResponseEntity.ok(consultationService.getFollowUp(id));
    }
}
