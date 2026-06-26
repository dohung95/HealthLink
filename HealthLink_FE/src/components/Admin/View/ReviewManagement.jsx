import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { adminReviewApi } from "../../../api/reviewApi";
import Toast from "./Toast";
import useToast from "../useToast";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";
import "../Css/ReviewManagement.css";

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

const renderStars = (rating) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <i
        key={i}
        className={`bi ${i <= rating ? 'bi-star-fill text-warning' : 'bi-star text-muted'}`}
      ></i>
    );
  }
  return stars;
};

export default function ReviewManagement() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reviews, setReviews] = useState([]);
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('reviewsViewMode') || 'table';
  });
  const [pagination, setPagination] = useState({
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    searchTerm: '',
    rating: '',
    visible: '',
    sortBy: 'newest'
  });

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch reviews from API
  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        size: pagination.size,
        sortBy: filters.sortBy,
      };

      if (filters.searchTerm) params.searchTerm = filters.searchTerm;
      if (filters.rating) params.rating = parseInt(filters.rating);
      if (filters.visible !== '') params.visible = filters.visible === 'true';

      const response = await adminReviewApi.getAll(params);

      setReviews(response.reviews || []);
      setPagination(prev => ({
        ...prev,
        totalElements: response.totalElements || 0,
        totalPages: response.totalPages || 0
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch reviews');
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [pagination.page, filters]);

  useEffect(() => {
    localStorage.setItem('reviewsViewMode', viewMode);
  }, [viewMode]);

  const handleSearch = (e) => {
    setFilters({ ...filters, searchTerm: e.target.value });
    setPagination({ ...pagination, page: 0 });
  };

  const handleRatingFilter = (e) => {
    setFilters({ ...filters, rating: e.target.value });
    setPagination({ ...pagination, page: 0 });
  };

  const handleVisibilityFilter = (e) => {
    setFilters({ ...filters, visible: e.target.value });
    setPagination({ ...pagination, page: 0 });
  };

  const handleSort = (e) => {
    setFilters({ ...filters, sortBy: e.target.value });
  };

  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
  };

  const handleViewReview = (review) => {
    setSelectedReview(review);
    setShowViewModal(true);
  };

  const handleToggleVisibility = async (review) => {
    try {
      await adminReviewApi.toggleVisibility(review.reviewId);
      showToast(
        review.visible ? 'Review hidden successfully' : 'Review unhidden successfully',
        'success'
      );
      fetchReviews();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to toggle visibility', 'error');
    }
  };

  const handleOpenReplyModal = (review) => {
    setSelectedReview(review);
    setReplyText(review.adminReply || '');
    setShowReplyModal(true);
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || replyText.trim().length < 5) {
      showToast('Reply must be at least 5 characters', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await adminReviewApi.adminReply(selectedReview.reviewId, { reply: replyText.trim() });
      showToast('Reply submitted successfully', 'success');
      setShowReplyModal(false);
      setSelectedReview(null);
      setReplyText('');
      fetchReviews();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit reply', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderReviewCard = (review) => (
    <div key={review.reviewId} className={`review-card ${!review.visible ? 'hidden-review' : ''}`}>
      <div className="review-card-header">
        <div className="review-patient-info">
          <div className="review-avatar">
            {review.patientAvatar ? (
              <img src={review.patientAvatar} alt="" />
            ) : (
              <i className="bi bi-person-circle"></i>
            )}
          </div>
          <div>
            <span className="patient-name">
              {review.anonymous ? 'Anonymous' : review.patientName}
            </span>
            <span className="review-date">{formatDate(review.reviewDate)}</span>
          </div>
        </div>
        <div className="review-rating">
          {renderStars(review.rating)}
        </div>
      </div>

      <div className="review-doctor-info">
        <i className="bi bi-person-badge me-1"></i>
        <span>Dr. {review.doctorName}</span>
        {review.specialtyName && <span className="text-muted"> - {review.specialtyName}</span>}
      </div>

      <div className="review-comment">
        <p>{review.comment}</p>
      </div>

      {!review.visible && (
        <div className="review-hidden-badge">
          <i className="bi bi-eye-slash me-1"></i>
          Hidden
        </div>
      )}

      {review.doctorReply && (
        <div className="review-reply doctor">
          <div className="reply-header">
            <i className="bi bi-reply-fill me-1"></i>
            <strong>Doctor's Reply</strong>
          </div>
          <p>{review.doctorReply}</p>
        </div>
      )}

      {review.adminReply && (
        <div className="review-reply admin">
          <div className="reply-header">
            <i className="bi bi-shield-check me-1"></i>
            <strong>HealthLink Response</strong>
          </div>
          <p>{review.adminReply}</p>
        </div>
      )}

      <div className="review-actions">
        <button className="btn btn-sm btn-outline-primary" onClick={() => handleViewReview(review)}>
          <i className="bi bi-eye me-1"></i>View
        </button>
        <button
          className={`btn btn-sm ${review.visible ? 'btn-outline-warning' : 'btn-outline-success'}`}
          onClick={() => handleToggleVisibility(review)}
        >
          <i className={`bi ${review.visible ? 'bi-eye-slash' : 'bi-eye'} me-1`}></i>
          {review.visible ? 'Hide' : 'Show'}
        </button>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => handleOpenReplyModal(review)}>
          <i className="bi bi-chat-dots me-1"></i>
          {review.adminReply ? 'Edit Reply' : 'Reply'}
        </button>
      </div>
    </div>
  );

  const renderReviewRow = (review) => (
    <tr key={review.reviewId} className={!review.visible ? 'table-secondary' : ''}>
      <td>
        <div className="d-flex align-items-center gap-2">
          <div className="review-avatar-sm">
            {review.patientAvatar ? (
              <img src={review.patientAvatar} alt="" />
            ) : (
              <i className="bi bi-person-circle"></i>
            )}
          </div>
          <div>
            <div className="fw-medium">{review.anonymous ? 'Anonymous' : review.patientName}</div>
            <small className="text-muted">{formatDate(review.reviewDate)}</small>
          </div>
        </div>
      </td>
      <td>
        <div className="fw-medium">Dr. {review.doctorName}</div>
        <small className="text-muted">{review.specialtyName}</small>
      </td>
      <td>
        <div className="d-flex align-items-center gap-1">
          {renderStars(review.rating)}
          <span className="ms-1">({review.rating})</span>
        </div>
      </td>
      <td>
        <div className="review-comment-cell" title={review.comment}>
          {review.comment.length > 80 ? review.comment.substring(0, 80) + '...' : review.comment}
        </div>
      </td>
      <td>
        {review.visible ? (
          <span className="badge bg-success">Visible</span>
        ) : (
          <span className="badge bg-secondary">Hidden</span>
        )}
      </td>
      <td>
        <div className="d-flex gap-1">
          {review.doctorReply && (
            <span className="badge bg-info" title="Has doctor reply">
              <i className="bi bi-chat-fill"></i>
            </span>
          )}
          {review.adminReply && (
            <span className="badge bg-primary" title="Has admin reply">
              <i className="bi bi-shield-check"></i>
            </span>
          )}
          {!review.doctorReply && !review.adminReply && (
            <span className="text-muted">-</span>
          )}
        </div>
      </td>
      <td>
        <div className="d-flex gap-1">
          <button className="btn btn-sm btn-outline-primary" onClick={() => handleViewReview(review)} title="View">
            <i className="bi bi-eye"></i>
          </button>
          <button
            className={`btn btn-sm ${review.visible ? 'btn-outline-warning' : 'btn-outline-success'}`}
            onClick={() => handleToggleVisibility(review)}
            title={review.visible ? 'Hide' : 'Show'}
          >
            <i className={`bi ${review.visible ? 'bi-eye-slash' : 'bi-eye'}`}></i>
          </button>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => handleOpenReplyModal(review)} title="Reply">
            <i className="bi bi-chat-dots"></i>
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <NavbarAdmin
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
    >
      <main className="admin-content p-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1">Review Management</h2>
            <p className="text-muted mb-0">Manage patient reviews and feedback</p>
          </div>
        </div>

        {/* Compact Filter Bar */}
        <div className="admin-filter-bar">
          <div className="filter-search">
            <i className="bi bi-search"></i>
            <input
              type="text"
              className="form-control"
              placeholder="Search reviews..."
              value={filters.searchTerm}
              onChange={handleSearch}
            />
          </div>
          <div className="filter-select">
            <select className="form-select" value={filters.rating} onChange={handleRatingFilter}>
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
          <div className="filter-select">
            <select className="form-select" value={filters.visible} onChange={handleVisibilityFilter}>
              <option value="">All Status</option>
              <option value="true">Visible</option>
              <option value="false">Hidden</option>
            </select>
          </div>
          <div className="filter-select">
            <select className="form-select" value={filters.sortBy} onChange={handleSort}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="rating-high">Highest</option>
              <option value="rating-low">Lowest</option>
            </select>
          </div>
          <div className="filter-actions">
            {(filters.searchTerm || filters.rating || filters.visible) && (
              <button
                className="btn btn-outline-secondary btn-clear-filter"
                onClick={() => {
                  setFilters({ searchTerm: '', rating: '', visible: '', sortBy: 'newest' });
                  setPagination({ ...pagination, page: 0 });
                }}
              >
                <i className="bi bi-x-circle"></i>
                Clear
              </button>
            )}
            <div className="view-toggle-group">
              <button
                className={`btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <i className="bi bi-grid-3x3-gap"></i>
              </button>
              <button
                className={`btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                <i className="bi bi-list"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Content */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" role="status"></div>
            <p className="mt-2 text-muted">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-chat-square-text display-4 text-muted"></i>
            <p className="mt-2 text-muted">No reviews found</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="reviews-grid">{reviews.map(renderReviewCard)}</div>
        ) : (
          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Status</th>
                    <th>Replies</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>{reviews.map(renderReviewRow)}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <nav className="mt-4">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${pagination.page === 0 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => handlePageChange(pagination.page - 1)}>
                  Previous
                </button>
              </li>
              {[...Array(pagination.totalPages)].map((_, index) => (
                <li key={index} className={`page-item ${index === pagination.page ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(index)}>
                    {index + 1}
                  </button>
                </li>
              ))}
              <li className={`page-item ${pagination.page >= pagination.totalPages - 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => handlePageChange(pagination.page + 1)}>
                  Next
                </button>
              </li>
            </ul>
          </nav>
        )}

        {/* View Modal */}
        {showViewModal && selectedReview && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Review Details</h5>
                  <button type="button" className="btn-close" onClick={() => setShowViewModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <h6 className="text-muted">Patient</h6>
                      <p className="mb-0 fw-medium">
                        {selectedReview.anonymous ? 'Anonymous' : selectedReview.patientName}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <h6 className="text-muted">Doctor</h6>
                      <p className="mb-0 fw-medium">
                        Dr. {selectedReview.doctorName}
                        {selectedReview.specialtyName && (
                          <span className="text-muted"> - {selectedReview.specialtyName}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <h6 className="text-muted">Rating</h6>
                      <div className="d-flex align-items-center gap-2">
                        {renderStars(selectedReview.rating)}
                        <span>({selectedReview.rating}/5)</span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <h6 className="text-muted">Date</h6>
                      <p className="mb-0">{formatDate(selectedReview.reviewDate)}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <h6 className="text-muted">Comment</h6>
                    <p className="mb-0">{selectedReview.comment}</p>
                  </div>
                  <div className="mb-4">
                    <h6 className="text-muted">Status</h6>
                    {selectedReview.visible ? (
                      <span className="badge bg-success">Visible</span>
                    ) : (
                      <span className="badge bg-secondary">Hidden</span>
                    )}
                  </div>
                  {selectedReview.doctorReply && (
                    <div className="mb-4 p-3 bg-light rounded">
                      <h6 className="text-primary">
                        <i className="bi bi-reply-fill me-1"></i>
                        Doctor's Reply
                      </h6>
                      <p className="mb-1">{selectedReview.doctorReply}</p>
                      <small className="text-muted">{formatDate(selectedReview.doctorReplyDate)}</small>
                    </div>
                  )}
                  {selectedReview.adminReply && (
                    <div className="mb-4 p-3 bg-primary bg-opacity-10 rounded">
                      <h6 className="text-primary">
                        <i className="bi bi-shield-check me-1"></i>
                        HealthLink Response
                      </h6>
                      <p className="mb-1">{selectedReview.adminReply}</p>
                      <small className="text-muted">{formatDate(selectedReview.adminReplyDate)}</small>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                    Close
                  </button>
                  <button
                    type="button"
                    className={`btn ${selectedReview.visible ? 'btn-warning' : 'btn-success'}`}
                    onClick={() => {
                      handleToggleVisibility(selectedReview);
                      setShowViewModal(false);
                    }}
                  >
                    <i className={`bi ${selectedReview.visible ? 'bi-eye-slash' : 'bi-eye'} me-1`}></i>
                    {selectedReview.visible ? 'Hide Review' : 'Show Review'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setShowViewModal(false);
                      handleOpenReplyModal(selectedReview);
                    }}
                  >
                    <i className="bi bi-chat-dots me-1"></i>
                    {selectedReview.adminReply ? 'Edit Reply' : 'Add Reply'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reply Modal */}
        {showReplyModal && selectedReview && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Reply as HealthLink</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowReplyModal(false)}
                    disabled={submitting}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-4 p-3 bg-light rounded">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <strong>{selectedReview.anonymous ? 'Anonymous' : selectedReview.patientName}</strong>
                      <div>{renderStars(selectedReview.rating)}</div>
                    </div>
                    <p className="mb-0 text-muted">{selectedReview.comment}</p>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Your Reply</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Write your response on behalf of HealthLink... (minimum 5 characters)"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      maxLength={1000}
                      disabled={submitting}
                    ></textarea>
                    <small className="text-muted">{replyText.length}/1000 characters</small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowReplyModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
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
                      'Submit Reply'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast.show && (
          <Toast message={toast.message} type={toast.type} onClose={hideToast} />
        )}
      </main>
    </NavbarAdmin>
  );
}
