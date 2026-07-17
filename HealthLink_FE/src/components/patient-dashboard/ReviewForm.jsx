import React, { useState, useEffect } from 'react';
import { patientReviewApi } from '../../api/reviewApi';
import { toast } from 'sonner';
import './ReviewForm.css';

const ReviewForm = ({ isOpen, onClose, appointment, onReviewSubmitted }) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [anonymous, setAnonymous] = useState(false);
    const [loading, setLoading] = useState(false);
    const [existingReview, setExistingReview] = useState(null);
    const [checkingExisting, setCheckingExisting] = useState(true);

    useEffect(() => {
        if (isOpen && appointment) {
            checkExistingReview();
        }
    }, [isOpen, appointment]);

    const checkExistingReview = async () => {
        if (!appointment?.appointmentId) return;

        try {
            setCheckingExisting(true);
            const result = await patientReviewApi.canReview(appointment.appointmentId);

            if (!result.canReview) {
                // Try to get the existing review
                try {
                    const review = await patientReviewApi.getByAppointment(appointment.appointmentId);
                    setExistingReview(review);
                } catch (err) {
                    // No existing review found, but still can't review
                    setExistingReview(null);
                }
            } else {
                setExistingReview(null);
            }
        } catch (error) {
            console.error('Error checking review status:', error);
        } finally {
            setCheckingExisting(false);
        }
    };

    const resetForm = () => {
        setRating(0);
        setHoverRating(0);
        setComment('');
        setAnonymous(false);
        setExistingReview(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        if (comment.trim().length < 10) {
            toast.error('Comment must be at least 10 characters');
            return;
        }

        try {
            setLoading(true);

            const created = await patientReviewApi.create({
                appointmentId: appointment.appointmentId,
                rating,
                comment: comment.trim(),
                anonymous,
            });

            if (created?.visible === false) {
                toast.info('Your review has been submitted and is pending moderation before it appears publicly.');
            } else {
                toast.success('Review submitted successfully!');
            }
            resetForm();
            onReviewSubmitted?.();
            onClose();
        } catch (error) {
            const message = error.response?.data?.message || error.response?.data || 'Failed to submit review';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (currentRating, isInteractive = true) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <span
                    key={i}
                    className={`review-star ${i <= currentRating ? 'filled' : ''} ${isInteractive ? 'interactive' : ''}`}
                    onClick={isInteractive ? () => setRating(i) : undefined}
                    onMouseEnter={isInteractive ? () => setHoverRating(i) : undefined}
                    onMouseLeave={isInteractive ? () => setHoverRating(0) : undefined}
                >
                    <i className={`bi ${i <= currentRating ? 'bi-star-fill' : 'bi-star'}`}></i>
                </span>
            );
        }
        return stars;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (!isOpen) return null;

    return (
        <div className="review-modal-overlay" onClick={handleClose}>
            <div className="review-modal" onClick={(e) => e.stopPropagation()}>
                <div className="review-modal-header">
                    <h5 className="review-modal-title">
                        {existingReview ? 'Your Review' : 'Rate Your Experience'}
                    </h5>
                    <button className="review-modal-close" onClick={handleClose}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="review-modal-body">
                    {/* Doctor Info */}
                    <div className="review-doctor-info">
                        <div className="review-doctor-avatar">
                            {appointment?.doctorAvatar ? (
                                <img src={appointment.doctorAvatar} alt={appointment.doctorName} />
                            ) : (
                                <i className="bi bi-person-circle"></i>
                            )}
                        </div>
                        <div className="review-doctor-details">
                            <h6>{appointment?.doctorName || 'Doctor'}</h6>
                            <small className="text-muted">{appointment?.specialtyName || ''}</small>
                            <small className="text-muted d-block">
                                {formatDate(appointment?.appointmentTime)}
                            </small>
                        </div>
                    </div>

                    {checkingExisting ? (
                        <div className="text-center py-4">
                            <div className="spinner-border spinner-border-sm" role="status"></div>
                            <span className="ms-2">Loading...</span>
                        </div>
                    ) : existingReview ? (
                        // Show existing review
                        <div className="existing-review">
                            {existingReview.visible === false && (
                                <div className="alert alert-warning py-2 px-3 mb-3" style={{ fontSize: '0.85rem' }}>
                                    <i className="bi bi-hourglass-split me-1"></i>
                                    Your review is pending moderation and is not visible to others yet.
                                </div>
                            )}
                            <div className="review-rating-display mb-3">
                                {renderStars(existingReview.rating, false)}
                                <span className="rating-text ms-2">{existingReview.rating}/5</span>
                            </div>

                            <div className="review-comment-display">
                                <p>{existingReview.comment}</p>
                                <small className="text-muted">
                                    Reviewed on {formatDate(existingReview.reviewDate)}
                                    {existingReview.anonymous && ' (Anonymous)'}
                                </small>
                            </div>

                            {existingReview.doctorReply && (
                                <div className="review-reply mt-3">
                                    <div className="reply-header">
                                        <i className="bi bi-reply-fill me-1"></i>
                                        <strong>Doctor's Reply</strong>
                                        <small className="text-muted ms-2">
                                            {formatDate(existingReview.doctorReplyDate)}
                                        </small>
                                    </div>
                                    <p className="reply-content">{existingReview.doctorReply}</p>
                                </div>
                            )}

                            {existingReview.adminReply && (
                                <div className="review-reply admin-reply mt-3">
                                    <div className="reply-header">
                                        <i className="bi bi-shield-check me-1"></i>
                                        <strong>HealthLink Response</strong>
                                        <small className="text-muted ms-2">
                                            {formatDate(existingReview.adminReplyDate)}
                                        </small>
                                    </div>
                                    <p className="reply-content">{existingReview.adminReply}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Show review form
                        <form onSubmit={handleSubmit}>
                            {/* Rating Stars */}
                            <div className="review-rating-section">
                                <label className="form-label">Your Rating</label>
                                <div className="review-stars">
                                    {renderStars(hoverRating || rating, true)}
                                </div>
                                <small className="text-muted">
                                    {rating === 0 ? 'Click to rate' : `${rating} out of 5 stars`}
                                </small>
                            </div>

                            {/* Comment */}
                            <div className="review-comment-section">
                                <label className="form-label">Your Comment</label>
                                <textarea
                                    className="form-control"
                                    rows="4"
                                    placeholder="Share your experience with this doctor... (minimum 10 characters)"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    maxLength={2000}
                                ></textarea>
                                <small className="text-muted">
                                    {comment.length}/2000 characters
                                </small>
                            </div>

                            {/* Anonymous Option */}
                            <div className="review-anonymous-section">
                                <div className="form-check">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        id="anonymousReview"
                                        checked={anonymous}
                                        onChange={(e) => setAnonymous(e.target.checked)}
                                    />
                                    <label className="form-check-label" htmlFor="anonymousReview">
                                        Post anonymously
                                    </label>
                                </div>
                                <small className="text-muted">
                                    Your name will be hidden from the public review
                                </small>
                            </div>

                            {/* Submit Button */}
                            <div className="review-actions">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={handleClose}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading || rating === 0 || comment.trim().length < 10}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Review'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReviewForm;
