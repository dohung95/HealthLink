package com.HealthLink.controller.payment;

import com.HealthLink.entity.RefundRequest;
import com.HealthLink.entity.Payment;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.payment.RefundRequestRepository;
import com.HealthLink.repository.payment.PaymentRepository;
import com.HealthLink.service.payment.FinanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin/refund-requests")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class RefundRequestController {
    private final RefundRequestRepository refundRequestRepository;
    private final PaymentRepository paymentRepository;
    private final FinanceService financeService;

    @GetMapping
    public ResponseEntity<List<RefundRequest>> getPending() {
        return ResponseEntity.ok(
                refundRequestRepository.findByStatusOrderByCreatedAtAsc("PENDING"));
    }

    @PostMapping("/{id}/approve")
    @Transactional
    public ResponseEntity<String> approve(@PathVariable Integer id,
                                          @AuthenticationPrincipal UserDetails admin) {
        RefundRequest req = refundRequestRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("RefundRequest not found: " + id));
        if (!"PENDING".equals(req.getStatus()))
            throw new BadRequestException("Already " + req.getStatus());
        Payment payment = paymentRepository.findById(Integer.parseInt(req.getPaymentId())).orElse(null);
        if (payment != null)
            financeService.processRefund(payment.getPaymentId(), "Admin: " + req.getReason());
        req.setStatus("APPROVED");
        req.setReviewedBy(admin.getUsername());
        req.setReviewedAt(LocalDateTime.now());
        refundRequestRepository.save(req);
        return ResponseEntity.ok("Approved");
    }

    @PostMapping("/{id}/reject")
    @Transactional
    public ResponseEntity<String> reject(@PathVariable Integer id,
                                         @AuthenticationPrincipal UserDetails admin) {
        RefundRequest req = refundRequestRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("RefundRequest not found: " + id));
        if (!"PENDING".equals(req.getStatus()))
            throw new BadRequestException("Already " + req.getStatus());
        req.setStatus("REJECTED");
        req.setReviewedBy(admin.getUsername());
        req.setReviewedAt(LocalDateTime.now());
        refundRequestRepository.save(req);
        return ResponseEntity.ok("Rejected");
    }
}
