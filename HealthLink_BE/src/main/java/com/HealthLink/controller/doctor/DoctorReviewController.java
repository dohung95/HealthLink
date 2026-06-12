package com.HealthLink.controller.doctor;

import com.HealthLink.dto.review.*;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.review.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for doctor review operations.
 * Base URL: /api/doctor/reviews
 */
@RestController
@RequestMapping("/api/doctor/reviews")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('DOCTOR')")
public class DoctorReviewController {

    private final ReviewService reviewService;
    private final UserRepository userRepository;

    /**
     * Helper: get doctorId from JWT token
     * doctorId is same as userId
     */
    private String resolveDoctorId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User", "email", userDetails.getUsername()))
                .getId();
    }

    /**
     * GET /api/doctor/reviews
     * Get all reviews for the doctor (paginated)
     */
    @GetMapping
    public ResponseEntity<ReviewPageResponse> getMyReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveDoctorId(userDetails);
        ReviewPageResponse response = reviewService.getDoctorReviews(doctorId, page, size);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/doctor/reviews/stats
     * Get review statistics for the doctor
     */
    @GetMapping("/stats")
    public ResponseEntity<ReviewStatsDto> getMyStats(
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveDoctorId(userDetails);
        ReviewStatsDto stats = reviewService.getDoctorReviewStats(doctorId);
        return ResponseEntity.ok(stats);
    }

    /**
     * POST /api/doctor/reviews/{reviewId}/reply
     * Reply to a review
     */
    @PostMapping("/{reviewId}/reply")
    public ResponseEntity<ReviewResponseDto> replyToReview(
            @PathVariable Integer reviewId,
            @Valid @RequestBody ReviewReplyDto dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveDoctorId(userDetails);
        ReviewResponseDto review = reviewService.doctorReply(doctorId, reviewId, dto);
        return ResponseEntity.ok(review);
    }

    /**
     * GET /api/doctor/reviews/public/featured
     * Get featured reviews for homepage (no auth required)
     */
    @GetMapping("/public/featured")
    @PreAuthorize("permitAll()")
    public ResponseEntity<List<ReviewResponseDto>> getFeaturedReviews(
            @RequestParam(defaultValue = "10") int limit) {
        List<ReviewResponseDto> reviews = reviewService.getFeaturedReviews(Math.min(limit, 20));
        return ResponseEntity.ok(reviews);
    }

    /**
     * GET /api/doctor/reviews/public/{doctorId}
     * Get public visible reviews for any doctor (no auth required)
     * Used for doctor profile pages
     */
    @GetMapping("/public/{doctorId}")
    @PreAuthorize("permitAll()")
    public ResponseEntity<List<ReviewResponseDto>> getPublicReviews(
            @PathVariable String doctorId) {
        List<ReviewResponseDto> reviews = reviewService.getDoctorPublicReviews(doctorId);
        return ResponseEntity.ok(reviews);
    }
}
