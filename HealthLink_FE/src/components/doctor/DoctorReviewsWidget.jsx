import React, { useEffect, useState } from 'react';
import { doctorReviewApi } from '../../api/reviewApi';
import DoctorEmptyState from './DoctorEmptyState';
import DoctorErrorState from './DoctorErrorState';
import DoctorSkeleton from './DoctorSkeleton';

export default function DoctorReviewsWidget({ doctorId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await doctorReviewApi.getAll(0, 3);
        if (mounted) setReviews(data.reviews || []);
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || 'Failed to load reviews');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [doctorId]);

  if (loading) return <DoctorSkeleton />;
  if (error) return <DoctorErrorState message={error} />;
  if (!reviews.length) return <DoctorEmptyState title="No reviews yet" icon="reviews" />;

  return (
    <div className="doctor-reviews-widget">
      <h3>Recent Reviews</h3>
      {reviews.slice(0, 3).map(review => (
        <div key={review.reviewId} className="review-card">
          <div className="review-header">
            <span className="patient-name">{review.anonymous ? 'Anonymous Patient' : review.patientName}</span>
            <span className="rating">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
          </div>
          <p className="review-comment">{review.comment}</p>
        </div>
      ))}
    </div>
  );
}
