package com.HealthLink.controller.consultation;

import com.HealthLink.dto.response.ConfirmResponse;
import com.HealthLink.dto.response.ProposalResponse;
import com.HealthLink.service.consultation.ConsultationProposalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class ConsultationProposalController {

    private final ConsultationProposalService proposalService;

    @PostMapping("/consultations/{id}/propose-home-visit")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ProposalResponse> proposeHomeVisit(@PathVariable Integer id) {
        ProposalResponse response = proposalService.propose(id);
        // Gửi notification SAU KHI propose() transaction đã commit,
        // để tránh race condition: appointment chưa commit nhưng patient
        // đã nhận notification và gọi API → "Appointment not found"
        proposalService.sendProposalNotifications(response.getAppointmentId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/home-visit/proposals/confirm")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ConfirmResponse> confirmProposal(@RequestBody Map<String, Integer> body) {
        Integer consultationId = body.get("consultationId");
        if (consultationId == null) {
            return ResponseEntity.badRequest().build();
        }
        ConfirmResponse response = proposalService.confirm(consultationId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/home-visit/proposals/reject")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<Map<String, String>> rejectProposal(@RequestBody Map<String, Integer> body) {
        Integer consultationId = body.get("consultationId");
        if (consultationId == null) {
            return ResponseEntity.badRequest().build();
        }
        proposalService.reject(consultationId);
        return ResponseEntity.ok(Map.of("message", "Proposal rejected"));
    }
}
