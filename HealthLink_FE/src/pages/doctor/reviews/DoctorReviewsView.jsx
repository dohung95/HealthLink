import React, { useEffect, useState } from 'react';
import { doctorReviewApi } from '@api/reviewApi';
import { toast } from 'sonner';
import '@components/doctor/Css/DoctorReviewsView.css';

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const renderStars = (rating, size = 'normal') => {
    const stars = [];
    const sizeClass = size === 'small' ? 'small' : '';
    for (let i = 1; i <= 5; i++) {
        stars.push(
            <i
                key={i}
                className={`bi ${i <= rating ? 'bi-star-fill text-warning' : 'bi-star text-muted'} ${sizeClass}`}
            ></i>
        );
    }
    return stars;
};

export default function DoctorReviewsView() {
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [pagination, setPagination] = useState({
        totalPages: 1,
        totalElements: 0,
        hasNext: false,
        hasPrevious: false,
    });
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [selectedReview, setSelectedReview] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, [page]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [reviewsData, statsData] = await Promise.all([
                doctorReviewApi.getAll(page, 10),
                doctorReviewApi.getStats(),
            ]);

            setReviews(reviewsData.reviews || []);
            setPagination({
                totalPages: reviewsData.totalPages || 1,
                totalElements: reviewsData.totalElements || 0,
                hasNext: reviewsData.hasNext || false,
                hasPrevious: reviewsData.hasPrevious || false,
            });
            setStats(statsData);
        } catch (error) {
            console.error('Error loading reviews:', error);
            toast.error('Failed to load reviews');
        } finally {
            setLoading(false);
        }
    };

    const handleReplyClick = (review) => {
        setSelectedReview(review);
        setReplyText(review.doctorReply || '');
        setShowReplyModal(true);
    };

    const handleSubmitReply = async () => {
        if (!replyText.trim() || replyText.trim().length < 5) {
            toast.error('Reply must be at least 5 characters');
            return;
        }

        setSubmitting(true);
        try {
            await doctorReviewApi.reply(selectedReview.reviewId, { reply: replyText.trim() });
            toast.success('Reply submitted successfully');
            setShowReplyModal(false);
            setSelectedReview(null);
            setReplyText('');
            loadData();
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to submit reply';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const getRatingBarWidth = (rating) => {
        if (!stats || stats.totalReviews === 0) return 0;
        const count = stats.ratingDistribution?.[rating] || 0;
        return (count / stats.totalReviews) * 100;
    };

    return (
        <div className="doctor-reviews-container">
            {/* Header */}
            <div className="reviews-header">
                <div>
                    <h3 className="reviews-title">Patient Reviews</h3>
                </div>
            </div>

            {loading && !stats ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="mt-2 text-muted">Loading reviews...</p>
                </div>
            ) : (
                <>
                    {/* Stats Cards - Compact horizontal layout */}
                    {stats && (
                        <div className="reviews-stats-grid">
                            {/* Overall Rating Card */}
                            <div className="stats-card overall-rating">
                                <div className="stats-rating-display">
                                    <span className="rating-number">
                                        {stats.averageRating?.toFixed(1) || '0.0'}
                                    </span>
                                    <div className="rating-stars">
                                        {renderStars(Math.round(stats.averageRating || 0))}
                                    </div>
                                    <span className="rating-count">
                                        {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
                                    </span>
                                </div>
                            </div>

                            {/* Rating Distribution Card */}
                            <div className="stats-card rating-distribution">
                                <h6 className="stats-card-title">Rating Distribution</h6>
                                <div className="distribution-bars">
                                    {[5, 4, 3, 2, 1].map((rating) => (
                                        <div key={rating} className="distribution-row">
                                            <span className="distribution-label">{rating}</span>
                                            <i className="bi bi-star-fill distribution-star"></i>
                                            <div className="distribution-bar-container">
                                                <div
                                                    className="distribution-bar"
                                                    style={{ width: `${getRatingBarWidth(rating)}%` }}
                                                ></div>
                                            </div>
                                            <span className="distribution-count">
                                                {stats.ratingDistribution?.[rating] || 0}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Response Stats Card */}
                            <div className="stats-card response-stats">
                                <h6 className="stats-card-title">Response Status</h6>
                                <div className="response-stats-grid">
                                    <div className="response-stat">
                                        <span className="stat-value text-success">{stats.totalReplied || 0}</span>
                                        <span className="stat-label">Replied</span>
                                    </div>
                                    <div className="response-stat">
                                        <span className="stat-value text-warning">{stats.totalPendingReply || 0}</span>
                                        <span className="stat-label">Pending</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reviews List */}
                    <div className="reviews-list-section">
                        <h5 className="section-title">
                            <i className="bi bi-chat-square-quote"></i>
                            All Reviews
                        </h5>

                        {reviews.length === 0 ? (
                            <div className="no-reviews">
                                <i className="bi bi-chat-square-text"></i>
                                <p>No reviews yet</p>
                                <small className="text-muted">
                                    Reviews from your patients will appear here
                                </small>
                            </div>
                        ) : (
                            <div className="reviews-list">
                                {reviews.map((review) => (
                                    <div key={review.reviewId} className="review-card">
                                        <div className="review-header">
                                            <div className="reviewer-info">
                                                <div className="reviewer-avatar">
                                                    {review.patientAvatar ? (
                                                        <img src={review.patientAvatar} alt="" />
                                                    ) : (
                                                        <i className="bi bi-person"></i>
                                                    )}
                                                </div>
                                                <div className="reviewer-details">
                                                    <span className="reviewer-name">
                                                        {review.anonymous ? 'Anonymous Patient' : review.patientName}
                                                    </span>
                                                    <span className="review-date">{formatDate(review.reviewDate)}</span>
                                                </div>
                                            </div>
                                            <div className="review-rating">
                                                {renderStars(review.rating)}
                                            </div>
                                        </div>

                                        <div className="review-content">
                                            <p>{review.comment}</p>
                                        </div>

                                        {/* Doctor Reply */}
                                        {review.doctorReply && (
                                            <div className="review-reply doctor-reply">
                                                <div className="reply-header">
                                                    <i className="bi bi-reply-fill"></i>
                                                    <strong>Your Reply</strong>
                                                    <span className="reply-date">{formatDate(review.doctorReplyDate)}</span>
                                                </div>
                                                <p>{review.doctorReply}</p>
                                            </div>
                                        )}

                                        {/* Admin Reply */}
                                        {review.adminReply && (
                                            <div className="review-reply admin-reply">
                                                <div className="reply-header">
                                                    <i className="bi bi-shield-check"></i>
                                                    <strong>HealthLink Response</strong>
                                                    <span className="reply-date">{formatDate(review.adminReplyDate)}</span>
                                                </div>
                                                <p>{review.adminReply}</p>
                                            </div>
                                        )}

                                        {/* Reply Button */}
                                        <div className="review-actions">
                                            <button
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() => handleReplyClick(review)}
                                            >
                                                <i className="bi bi-reply me-1"></i>
                                                {review.doctorReply ? 'Edit Reply' : 'Reply'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="reviews-pagination">
                                <button
                                    className="btn btn-outline-secondary btn-sm"
                                    disabled={!pagination.hasPrevious}
                                    onClick={() => setPage((p) => p - 1)}
                                >
                                    <i className="bi bi-chevron-left me-1"></i>
                                    Previous
                                </button>
                                <span className="pagination-info">
                                    Page {page + 1} of {pagination.totalPages}
                                </span>
                                <button
                                    className="btn btn-outline-secondary btn-sm"
                                    disabled={!pagination.hasNext}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Next
                                    <i className="bi bi-chevron-right ms-1"></i>
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Reply Modal */}
            {showReplyModal && selectedReview && (
                <div className="reply-modal-overlay" onClick={() => setShowReplyModal(false)}>
                    <div className="reply-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="reply-modal-header">
                            <h5>
                                <i className="bi bi-reply-fill me-2 text-primary"></i>
                                Reply to Review
                            </h5>
                            <button className="btn-close" onClick={() => setShowReplyModal(false)}></button>
                        </div>
                        <div className="reply-modal-body">
                            {/* Original Review */}
                            <div className="original-review">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <strong style={{ fontSize: '0.875rem' }}>
                                        {selectedReview.anonymous ? 'Anonymous Patient' : selectedReview.patientName}
                                    </strong>
                                    <div>{renderStars(selectedReview.rating, 'small')}</div>
                                </div>
                                <p>{selectedReview.comment}</p>
                            </div>

                            {/* Reply Input */}
                            <div className="reply-input">
                                <label className="form-label">Your Reply</label>
                                <textarea
                                    className="form-control"
                                    rows="4"
                                    placeholder="Write your reply here... (minimum 5 characters)"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    maxLength={1000}
                                ></textarea>
                                <small className="text-muted">{replyText.length}/1000 characters</small>
                            </div>
                        </div>
                        <div className="reply-modal-footer">
                            <button
                                className="btn btn-outline-secondary"
                                onClick={() => setShowReplyModal(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSubmitReply}
                                disabled={submitting || replyText.trim().length < 5}
                            >
                                {submitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-send me-1"></i>
                                        Submit Reply
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
