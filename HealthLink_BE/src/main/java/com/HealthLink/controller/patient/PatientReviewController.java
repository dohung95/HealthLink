package com.HealthLink.controller.patient;

import com.HealthLink.dto.review.*;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.review.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for patient review operations.
 * Base URL: /api/patient/reviews
 */
@RestController
@RequestMapping("/api/patient/reviews")
@RequiredArgsConstructor
@Slf4j
public class PatientReviewController {

    private final ReviewService reviewService;
    private final UserRepository userRepository;

    /**
     * Helper: get patientId from JWT token
     * patientId is same as userId
     */
    private String resolvePatientId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User", "email", userDetails.getUsername()))
                .getId();
    }

    /**
     * GET /api/patient/reviews/can-review/{appointmentId}
     * Check if patient can review an appointment
     */
    @GetMapping("/can-review/{appointmentId}")
    public ResponseEntity<Map<String, Boolean>> canReview(
            @PathVariable Integer appointmentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String patientId = resolvePatientId(userDetails);
        boolean canReview = reviewService.canReviewAppointment(patientId, appointmentId);
        return ResponseEntity.ok(Map.of("canReview", canReview));
    }

    /**
     * POST /api/patient/reviews
     * Create a new review
     */
    @PostMapping
    public ResponseEntity<ReviewResponseDto> createReview(
            @Valid @RequestBody ReviewCreateDto dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        String patientId = resolvePatientId(userDetails);
        ReviewResponseDto review = reviewService.createReview(patientId, dto);
        return ResponseEntity.ok(review);
    }

    /**
     * GET /api/patient/reviews/appointment/{appointmentId}
     * Get review by appointment ID
     */
    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<ReviewResponseDto> getReviewByAppointment(
            @PathVariable Integer appointmentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String patientId = resolvePatientId(userDetails);
        ReviewResponseDto review = reviewService.getReviewByAppointment(patientId, appointmentId);
        return ResponseEntity.ok(review);
    }

    /**
     * GET /api/patient/reviews
     * Get all reviews by patient
     */
    @GetMapping
    public ResponseEntity<List<ReviewResponseDto>> getMyReviews(
            @AuthenticationPrincipal UserDetails userDetails) {
        String patientId = resolvePatientId(userDetails);
        List<ReviewResponseDto> reviews = reviewService.getPatientReviews(patientId);
        return ResponseEntity.ok(reviews);
    }
}
