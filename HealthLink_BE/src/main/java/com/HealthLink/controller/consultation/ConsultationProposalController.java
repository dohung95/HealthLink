package com.HealthLink.controller.consultation;

import com.HealthLink.dto.response.ConfirmResponse;
import com.HealthLink.dto.response.ProposalResponse;
import com.HealthLink.service.consultation.ConsultationProposalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class ConsultationProposalController {

    private final ConsultationProposalService proposalService;

    @PostMapping("/consultations/{id}/propose-home-visit")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ProposalResponse> proposeHomeVisit(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserDetails userDetails) {
        ProposalResponse response = proposalService.propose(id, userDetails);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/home-visit/proposals/confirm")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ConfirmResponse> confirmProposal(
            @RequestBody Map<String, Integer> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        Integer consultationId = body.get("consultationId");
        if (consultationId == null) {
            return ResponseEntity.badRequest().build();
        }
        ConfirmResponse response = proposalService.confirm(consultationId, userDetails);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/home-visit/proposals/reject")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<Map<String, String>> rejectProposal(
            @RequestBody Map<String, Integer> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        Integer consultationId = body.get("consultationId");
        if (consultationId == null) {
            return ResponseEntity.badRequest().build();
        }
        proposalService.reject(consultationId, userDetails);
        return ResponseEntity.ok(Map.of("message", "Proposal rejected"));
    }

    @GetMapping("/home-visit/proposals/pending")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ProposalResponse> getPendingProposal(
            @AuthenticationPrincipal UserDetails userDetails) {
        return proposalService.getPendingProposal(userDetails)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
