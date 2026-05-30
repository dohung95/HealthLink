package com.HealthLink.service.review;

import com.HealthLink.dto.review.*;
import com.HealthLink.entity.*;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.repository.review.ReviewRepository;
import com.HealthLink.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final NotificationService notificationService;

    // =========================================================================
    // PATIENT METHODS
    // =========================================================================

    /**
     * Check if a patient can review an appointment
     * Requirements: appointment is completed and not yet reviewed
     */
    @Transactional(readOnly = true)
    public boolean canReviewAppointment(String patientId, Integer appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null);
        if (appointment == null) {
            return false;
        }

        // Check if appointment belongs to patient
        if (!appointment.getPatient().getPatientId().equals(patientId)) {
            return false;
        }

        // Check if appointment is completed
        if (!"Completed".equalsIgnoreCase(appointment.getStatus())) {
            return false;
        }

        // Check if not already reviewed
        return !reviewRepository.existsByAppointmentId(appointmentId);
    }

    /**
     * Create a new review for an appointment
     */
    public ReviewResponseDto createReview(String patientId, ReviewCreateDto dto) {
        // Validate appointment
        Appointment appointment = appointmentRepository.findById(dto.getAppointmentId())
                .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));

        // Verify ownership
        if (!appointment.getPatient().getPatientId().equals(patientId)) {
            throw new SecurityException("Access denied: not your appointment");
        }

        // Check appointment status
        if (!"Completed".equalsIgnoreCase(appointment.getStatus())) {
            throw new IllegalStateException("Can only review completed appointments");
        }

        // Check if already reviewed
        if (reviewRepository.existsByAppointmentId(dto.getAppointmentId())) {
            throw new IllegalStateException("Appointment has already been reviewed");
        }

        // Create review
        Review review = Review.builder()
                .patient(appointment.getPatient())
                .doctor(appointment.getDoctor())
                .appointment(appointment)
                .rating(dto.getRating())
                .comment(dto.getComment())
                .anonymous(dto.isAnonymous())
                .reviewDate(LocalDateTime.now())
                .visible(true)
                .helpfulCount(0)
                .build();

        review = reviewRepository.save(review);
        log.info("Review created: id={}, appointmentId={}, doctorId={}",
                review.getReviewId(), dto.getAppointmentId(), appointment.getDoctor().getDoctorId());

        // Update doctor's average rating
        updateDoctorRating(appointment.getDoctor().getDoctorId());

        // Send notification to doctor
        sendNewReviewNotification(review);

        return mapToResponseDto(review);
    }

    /**
     * Get review by appointment ID (for patient)
     */
    @Transactional(readOnly = true)
    public ReviewResponseDto getReviewByAppointment(String patientId, Integer appointmentId) {
        Review review = reviewRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found"));

        // Verify ownership
        if (!review.getPatient().getPatientId().equals(patientId)) {
            throw new SecurityException("Access denied: not your review");
        }

        return mapToResponseDto(review);
    }

    /**
     * Get all reviews by patient
     */
    @Transactional(readOnly = true)
    public List<ReviewResponseDto> getPatientReviews(String patientId) {
        return reviewRepository.findByPatientId(patientId)
                .stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // DOCTOR METHODS
    // =========================================================================

    /**
     * Get all reviews for a doctor (paginated)
     */
    @Transactional(readOnly = true)
    public ReviewPageResponse getDoctorReviews(String doctorId, int page, int size) {
        // Sort is handled in the query itself to avoid SQL Server duplicate column issue
        Pageable pageable = PageRequest.of(page, size);
        Page<Review> reviewPage = reviewRepository.findByDoctorId(doctorId, pageable);

        return ReviewPageResponse.builder()
                .reviews(reviewPage.getContent().stream()
                        .map(this::mapToResponseDto)
                        .collect(Collectors.toList()))
                .currentPage(reviewPage.getNumber())
                .totalPages(reviewPage.getTotalPages())
                .totalElements(reviewPage.getTotalElements())
                .pageSize(reviewPage.getSize())
                .hasNext(reviewPage.hasNext())
                .hasPrevious(reviewPage.hasPrevious())
                .build();
    }

    /**
     * Get visible reviews for a doctor (public view)
     */
    @Transactional(readOnly = true)
    public List<ReviewResponseDto> getDoctorPublicReviews(String doctorId) {
        return reviewRepository.findVisibleByDoctorId(doctorId)
                .stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    /**
     * Get review statistics for a doctor
     */
    @Transactional(readOnly = true)
    public ReviewStatsDto getDoctorReviewStats(String doctorId) {
        Double avgRating = reviewRepository.getAverageRatingByDoctorId(doctorId);
        Long totalReviews = reviewRepository.getTotalReviewCountByDoctorId(doctorId);
        Long totalReplied = reviewRepository.countRepliedByDoctorId(doctorId);
        Long totalPendingReply = reviewRepository.countPendingReplyByDoctorId(doctorId);

        // Get rating distribution
        List<Object[]> distribution = reviewRepository.getRatingDistributionByDoctorId(doctorId);
        Map<Integer, Long> ratingDistribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            ratingDistribution.put(i, 0L);
        }
        for (Object[] row : distribution) {
            Integer rating = (Integer) row[0];
            Long count = (Long) row[1];
            ratingDistribution.put(rating, count);
        }

        return ReviewStatsDto.builder()
                .averageRating(avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0)
                .totalReviews(totalReviews != null ? totalReviews.intValue() : 0)
                .ratingDistribution(ratingDistribution)
                .totalReplied(totalReplied != null ? totalReplied.intValue() : 0)
                .totalPendingReply(totalPendingReply != null ? totalPendingReply.intValue() : 0)
                .build();
    }

    /**
     * Doctor replies to a review
     */
    public ReviewResponseDto doctorReply(String doctorId, Integer reviewId, ReviewReplyDto dto) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found"));

        // Verify ownership
        if (!review.getDoctor().getDoctorId().equals(doctorId)) {
            throw new SecurityException("Access denied: not your review");
        }

        // Update reply
        review.setDoctorReply(dto.getReply());
        review.setDoctorReplyDate(LocalDateTime.now());
        review = reviewRepository.save(review);

        log.info("Doctor replied to review: reviewId={}, doctorId={}", reviewId, doctorId);

        // Send notification to patient
        sendReplyNotification(review, "Doctor");

        return mapToResponseDto(review);
    }

    // =========================================================================
    // ADMIN METHODS
    // =========================================================================

    /**
     * Get all reviews with filters (admin)
     */
    @Transactional(readOnly = true)
    public ReviewPageResponse getAllReviews(String searchTerm, Integer rating, Boolean visible,
                                            String sortBy, int page, int size) {
        // Sort is handled in query to avoid SQL Server duplicate column issue
        Pageable pageable = PageRequest.of(page, size);

        Page<Review> reviewPage;
        if ("oldest".equals(sortBy)) {
            reviewPage = reviewRepository.searchReviewsOldest(searchTerm, rating, visible, pageable);
        } else if ("rating-high".equals(sortBy)) {
            reviewPage = reviewRepository.searchReviewsRatingHigh(searchTerm, rating, visible, pageable);
        } else if ("rating-low".equals(sortBy)) {
            reviewPage = reviewRepository.searchReviewsRatingLow(searchTerm, rating, visible, pageable);
        } else {
            // Default: newest
            reviewPage = reviewRepository.searchReviewsNewest(searchTerm, rating, visible, pageable);
        }

        return ReviewPageResponse.builder()
                .reviews(reviewPage.getContent().stream()
                        .map(this::mapToResponseDto)
                        .collect(Collectors.toList()))
                .currentPage(reviewPage.getNumber())
                .totalPages(reviewPage.getTotalPages())
                .totalElements(reviewPage.getTotalElements())
                .pageSize(reviewPage.getSize())
                .hasNext(reviewPage.hasNext())
                .hasPrevious(reviewPage.hasPrevious())
                .build();
    }

    /**
     * Toggle review visibility (admin)
     */
    public ReviewResponseDto toggleVisibility(Integer reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found"));

        review.setVisible(!review.isVisible());
        review = reviewRepository.save(review);

        log.info("Review visibility toggled: reviewId={}, visible={}", reviewId, review.isVisible());

        // Update doctor's average rating (hidden reviews shouldn't count)
        updateDoctorRating(review.getDoctor().getDoctorId());

        return mapToResponseDto(review);
    }

    /**
     * Admin replies to a review
     */
    public ReviewResponseDto adminReply(Integer reviewId, ReviewReplyDto dto) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found"));

        review.setAdminReply(dto.getReply());
        review.setAdminReplyDate(LocalDateTime.now());
        review = reviewRepository.save(review);

        log.info("Admin replied to review: reviewId={}", reviewId);

        // Send notification to patient
        sendReplyNotification(review, "HealthLink");

        return mapToResponseDto(review);
    }

    /**
     * Get a single review by ID (admin)
     */
    @Transactional(readOnly = true)
    public ReviewResponseDto getReviewById(Integer reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found"));
        return mapToResponseDto(review);
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private void updateDoctorRating(String doctorId) {
        try {
            Doctor doctor = doctorRepository.findById(doctorId).orElse(null);
            if (doctor != null) {
                Double avgRating = reviewRepository.getAverageRatingByDoctorId(doctorId);
                Long totalReviews = reviewRepository.getTotalReviewCountByDoctorId(doctorId);

                doctor.setAverageRating(avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0);
                doctor.setTotalReviews(totalReviews != null ? totalReviews.intValue() : 0);
                doctorRepository.save(doctor);

                log.info("Doctor rating updated: doctorId={}, avgRating={}, totalReviews={}",
                        doctorId, doctor.getAverageRating(), doctor.getTotalReviews());
            }
        } catch (Exception e) {
            log.error("Failed to update doctor rating: doctorId={}", doctorId, e);
        }
    }

    private void sendNewReviewNotification(Review review) {
        try {
            Doctor doctor = review.getDoctor();
            User doctorUser = doctor.getUser();

            String patientName = review.isAnonymous() ? "Anonymous Patient" : review.getPatient().getFullName();
            String title = "New Review Received";
            String message = String.format("%s rated you %d stars", patientName, review.getRating());

            notificationService.sendWebSocketNotification(
                    doctorUser,
                    NotificationType.NEW_REVIEW,
                    title,
                    message,
                    review.getReviewId(),
                    "/doctor/reviews"
            );
        } catch (Exception e) {
            log.error("Failed to send new review notification: reviewId={}", review.getReviewId(), e);
        }
    }

    private void sendReplyNotification(Review review, String replier) {
        try {
            Patient patient = review.getPatient();
            User patientUser = patient.getUser();

            String title = "Review Reply Received";
            String message = String.format("%s replied to your review for Dr. %s",
                    replier, review.getDoctor().getFullName());

            notificationService.sendMobilePushNotification(
                    patientUser,
                    NotificationType.REVIEW_REPLY,
                    title,
                    message,
                    NotificationPriority.NORMAL,
                    review.getReviewId(),
                    "/appointments"
            );
        } catch (Exception e) {
            log.error("Failed to send reply notification: reviewId={}", review.getReviewId(), e);
        }
    }

    private ReviewResponseDto mapToResponseDto(Review review) {
        ReviewResponseDto.ReviewResponseDtoBuilder builder = ReviewResponseDto.builder()
                .reviewId(review.getReviewId())
                .appointmentId(review.getAppointment() != null ? review.getAppointment().getAppointmentId() : null)
                .anonymous(review.isAnonymous())
                .rating(review.getRating())
                .comment(review.getComment())
                .reviewDate(review.getReviewDate())
                .visible(review.isVisible())
                .helpfulCount(review.getHelpfulCount())
                .doctorReply(review.getDoctorReply())
                .doctorReplyDate(review.getDoctorReplyDate())
                .adminReply(review.getAdminReply())
                .adminReplyDate(review.getAdminReplyDate());

        // Patient info (hidden if anonymous for public views)
        Patient patient = review.getPatient();
        if (patient != null) {
            builder.patientId(patient.getPatientId())
                    .patientName(review.isAnonymous() ? "Anonymous" : patient.getFullName())
                    .patientAvatar(review.isAnonymous() ? null : patient.getAvatarUrl());
        }

        // Doctor info
        Doctor doctor = review.getDoctor();
        if (doctor != null) {
            builder.doctorId(doctor.getDoctorId())
                    .doctorName(doctor.getFullName())
                    .doctorAvatar(doctor.getAvatarUrl())
                    .specialtyName(doctor.getSpecialty());
        }

        return builder.build();
    }
}
