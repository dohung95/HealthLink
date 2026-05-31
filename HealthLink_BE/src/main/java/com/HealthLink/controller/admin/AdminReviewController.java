package com.HealthLink.controller.admin;

import com.HealthLink.dto.review.*;
import com.HealthLink.service.review.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for admin review management.
 * Base URL: /api/admin/reviews
 */
@RestController
@RequestMapping("/api/admin/reviews")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class AdminReviewController {

    private final ReviewService reviewService;

    /**
     * GET /api/admin/reviews
     * Get all reviews with filters and pagination
     */
    @GetMapping
    public ResponseEntity<ReviewPageResponse> getAllReviews(
            @RequestParam(required = false) String searchTerm,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) Boolean visible,
            @RequestParam(defaultValue = "newest") String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        ReviewPageResponse response = reviewService.getAllReviews(searchTerm, rating, visible, sortBy, page, size);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/admin/reviews/{reviewId}
     * Get a single review by ID
     */
    @GetMapping("/{reviewId}")
    public ResponseEntity<ReviewResponseDto> getReview(@PathVariable Integer reviewId) {
        ReviewResponseDto review = reviewService.getReviewById(reviewId);
        return ResponseEntity.ok(review);
    }

    /**
     * PUT /api/admin/reviews/{reviewId}/toggle-visibility
     * Toggle review visibility (hide/unhide)
     */
    @PutMapping("/{reviewId}/toggle-visibility")
    public ResponseEntity<ReviewResponseDto> toggleVisibility(@PathVariable Integer reviewId) {
        ReviewResponseDto review = reviewService.toggleVisibility(reviewId);
        return ResponseEntity.ok(review);
    }

    /**
     * POST /api/admin/reviews/{reviewId}/admin-reply
     * Admin replies to a review (on behalf of HealthLink)
     */
    @PostMapping("/{reviewId}/admin-reply")
    public ResponseEntity<ReviewResponseDto> adminReply(
            @PathVariable Integer reviewId,
            @Valid @RequestBody ReviewReplyDto dto) {
        ReviewResponseDto review = reviewService.adminReply(reviewId, dto);
        return ResponseEntity.ok(review);
    }
}
