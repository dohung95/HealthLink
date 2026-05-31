package com.HealthLink.repository.review;

import com.HealthLink.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Integer>, JpaSpecificationExecutor<Review> {

    /**
     * Check if a review already exists for an appointment
     */
    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM Review r WHERE r.appointment.appointmentId = :appointmentId")
    boolean existsByAppointmentId(@Param("appointmentId") Integer appointmentId);

    /**
     * Find review by appointment ID
     */
    @Query("SELECT r FROM Review r LEFT JOIN FETCH r.patient LEFT JOIN FETCH r.doctor LEFT JOIN FETCH r.appointment WHERE r.appointment.appointmentId = :appointmentId")
    Optional<Review> findByAppointmentId(@Param("appointmentId") Integer appointmentId);

    /**
     * Find all visible reviews for a doctor (for public display)
     */
    @Query("SELECT r FROM Review r LEFT JOIN FETCH r.patient LEFT JOIN FETCH r.doctor WHERE r.doctor.doctorId = :doctorId AND r.visible = true ORDER BY r.reviewDate DESC")
    List<Review> findVisibleByDoctorId(@Param("doctorId") String doctorId);

    /**
     * Find all reviews for a doctor (paginated, for doctor dashboard)
     */
    @Query(value = "SELECT r FROM Review r WHERE r.doctor.doctorId = :doctorId ORDER BY r.reviewDate DESC",
           countQuery = "SELECT COUNT(r) FROM Review r WHERE r.doctor.doctorId = :doctorId")
    Page<Review> findByDoctorId(@Param("doctorId") String doctorId, Pageable pageable);

    /**
     * Get average rating for a doctor
     */
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.doctor.doctorId = :doctorId AND r.visible = true")
    Double getAverageRatingByDoctorId(@Param("doctorId") String doctorId);

    /**
     * Get total review count for a doctor
     */
    @Query("SELECT COUNT(r) FROM Review r WHERE r.doctor.doctorId = :doctorId AND r.visible = true")
    Long getTotalReviewCountByDoctorId(@Param("doctorId") String doctorId);

    /**
     * Get rating distribution for a doctor (count for each rating 1-5)
     */
    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.doctor.doctorId = :doctorId AND r.visible = true GROUP BY r.rating")
    List<Object[]> getRatingDistributionByDoctorId(@Param("doctorId") String doctorId);

    /**
     * Count reviews that doctor has replied to
     */
    @Query("SELECT COUNT(r) FROM Review r WHERE r.doctor.doctorId = :doctorId AND r.doctorReply IS NOT NULL")
    Long countRepliedByDoctorId(@Param("doctorId") String doctorId);

    /**
     * Count reviews pending doctor reply
     */
    @Query("SELECT COUNT(r) FROM Review r WHERE r.doctor.doctorId = :doctorId AND r.doctorReply IS NULL")
    Long countPendingReplyByDoctorId(@Param("doctorId") String doctorId);

    /**
     * Find all reviews by patient
     */
    @Query("SELECT r FROM Review r LEFT JOIN FETCH r.patient LEFT JOIN FETCH r.doctor WHERE r.patient.patientId = :patientId ORDER BY r.reviewDate DESC")
    List<Review> findByPatientId(@Param("patientId") String patientId);

    /**
     * Admin: Search reviews - sorted by newest (default)
     * Note: comment field is TEXT type, cannot use LOWER() in SQL Server
     */
    @Query(value = "SELECT r FROM Review r " +
            "LEFT JOIN r.patient p " +
            "LEFT JOIN r.doctor d " +
            "WHERE (:searchTerm IS NULL OR :searchTerm = '' " +
            "   OR LOWER(p.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "   OR LOWER(d.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
            "AND (:rating IS NULL OR r.rating = :rating) " +
            "AND (:visible IS NULL OR r.visible = :visible) " +
            "ORDER BY r.reviewDate DESC",
           countQuery = "SELECT COUNT(r) FROM Review r " +
            "LEFT JOIN r.patient p " +
            "LEFT JOIN r.doctor d " +
            "WHERE (:searchTerm IS NULL OR :searchTerm = '' " +
            "   OR LOWER(p.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "   OR LOWER(d.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
            "AND (:rating IS NULL OR r.rating = :rating) " +
            "AND (:visible IS NULL OR r.visible = :visible)")
    Page<Review> searchReviewsNewest(
            @Param("searchTerm") String searchTerm,
            @Param("rating") Integer rating,
            @Param("visible") Boolean visible,
            Pageable pageable
    );

    /**
     * Admin: Search reviews - sorted by oldest
     */
    @Query(value = "SELECT r FROM Review r " +
            "LEFT JOIN r.patient p " +
            "LEFT JOIN r.doctor d " +
            "WHERE (:searchTerm IS NULL OR :searchTerm = '' " +
            "   OR LOWER(p.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "   OR LOWER(d.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
            "AND (:rating IS NULL OR r.rating = :rating) " +
            "AND (:visible IS NULL OR r.visible = :visible) " +
            "ORDER BY r.reviewDate ASC",
           countQuery = "SELECT COUNT(r) FROM Review r " +
            "LEFT JOIN r.patient p " +
            "LEFT JOIN r.doctor d " +
            "WHERE (:searchTerm IS NULL OR :searchTerm = '' " +
            "   OR LOWER(p.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "   OR LOWER(d.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
            "AND (:rating IS NULL OR r.rating = :rating) " +
            "AND (:visible IS NULL OR r.visible = :visible)")
    Page<Review> searchReviewsOldest(
            @Param("searchTerm") String searchTerm,
            @Param("rating") Integer rating,
            @Param("visible") Boolean visible,
            Pageable pageable
    );

    /**
     * Admin: Search reviews - sorted by rating high to low
     */
    @Query(value = "SELECT r FROM Review r " +
            "LEFT JOIN r.patient p " +
            "LEFT JOIN r.doctor d " +
            "WHERE (:searchTerm IS NULL OR :searchTerm = '' " +
            "   OR LOWER(p.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "   OR LOWER(d.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
            "AND (:rating IS NULL OR r.rating = :rating) " +
            "AND (:visible IS NULL OR r.visible = :visible) " +
            "ORDER BY r.rating DESC, r.reviewDate DESC",
           countQuery = "SELECT COUNT(r) FROM Review r " +
            "LEFT JOIN r.patient p " +
            "LEFT JOIN r.doctor d " +
            "WHERE (:searchTerm IS NULL OR :searchTerm = '' " +
            "   OR LOWER(p.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "   OR LOWER(d.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
            "AND (:rating IS NULL OR r.rating = :rating) " +
            "AND (:visible IS NULL OR r.visible = :visible)")
    Page<Review> searchReviewsRatingHigh(
            @Param("searchTerm") String searchTerm,
            @Param("rating") Integer rating,
            @Param("visible") Boolean visible,
            Pageable pageable
    );

    /**
     * Admin: Search reviews - sorted by rating low to high
     */
    @Query(value = "SELECT r FROM Review r " +
            "LEFT JOIN r.patient p " +
            "LEFT JOIN r.doctor d " +
            "WHERE (:searchTerm IS NULL OR :searchTerm = '' " +
            "   OR LOWER(p.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "   OR LOWER(d.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
            "AND (:rating IS NULL OR r.rating = :rating) " +
            "AND (:visible IS NULL OR r.visible = :visible) " +
            "ORDER BY r.rating ASC, r.reviewDate DESC",
           countQuery = "SELECT COUNT(r) FROM Review r " +
            "LEFT JOIN r.patient p " +
            "LEFT JOIN r.doctor d " +
            "WHERE (:searchTerm IS NULL OR :searchTerm = '' " +
            "   OR LOWER(p.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "   OR LOWER(d.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
            "AND (:rating IS NULL OR r.rating = :rating) " +
            "AND (:visible IS NULL OR r.visible = :visible)")
    Page<Review> searchReviewsRatingLow(
            @Param("searchTerm") String searchTerm,
            @Param("rating") Integer rating,
            @Param("visible") Boolean visible,
            Pageable pageable
    );
}
