import React, { useState, useEffect } from 'react';
import { doctorService } from '../api/doctorApi';

export default function ReviewsView({ doctorId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!doctorId) return;
    
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await doctorService.getDoctorReviews(doctorId);
        if (mounted) setReviews(data || []);
      } catch (err) {
        console.error('Error fetching reviews:', err);
        if (mounted) setError('Failed to load reviews');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    fetchData();
    return () => { mounted = false; };
  }, [doctorId]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger m-4">{error}</div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <p>No reviews found.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="list-group">
        {reviews.map(r => (
          <div key={r.reviewID} className="list-group-item">
            <div className="d-flex justify-content-between align-items-start">
              <div className="flex-grow-1">
                <h6 className="mb-1 fw-bold">{r.patient?.fullName || 'Anonymous'}</h6>
                <p className="mb-2 text-muted small">
                  📅 {new Date(r.reviewDate).toLocaleDateString()}
                </p>
                <p className="mb-0">{r.comment || 'No comment provided.'}</p>
              </div>
              <div className="text-end ms-3">
                <div className="fw-bold text-warning" style={{ fontSize: '1.25rem' }}>
                  {r.rating} ⭐
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
