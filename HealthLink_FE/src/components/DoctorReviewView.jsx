import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form } from 'react-bootstrap';
import { doctorService } from '../api/doctorApi';
import ReviewModal from './ReviewModal';
import './Css/DoctorReviewView.css';

const RatingStars = ({ rating }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} className={i <= rating ? 'text-warning' : 'text-muted'}>
        ★
      </span>
    );
  }
  return <span className="rating-stars">{stars}</span>;
};

const DoctorReviewView = ({ doctorId }) => {
  const [reviews, setReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 10;
  
  // Filter state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [filterActive, setFilterActive] = useState(false);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  const handleViewReview = (review) => {
    setSelectedReview(review);
    setShowModal(true);
  };

  useEffect(() => {
    if (!doctorId) return;
    fetchReviews();
  }, [doctorId]);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await doctorService.getDoctorReviews(doctorId);
      setReviews(data || []);
      setFilteredReviews(data || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  // Filter by date
  const handleDateFilter = () => {
    if (!selectedDate) {
      // Clear filter
      setFilteredReviews(reviews);
      setFilterActive(false);
      setCurrentPage(1);
      return;
    }

    const filterDate = new Date(selectedDate);
    const filtered = reviews.filter(review => {
      const reviewDate = new Date(review.reviewDate);
      return reviewDate.toDateString() === filterDate.toDateString();
    });

    setFilteredReviews(filtered);
    setFilterActive(true);
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  const clearFilter = () => {
    setSelectedDate('');
    setFilteredReviews(reviews);
    setFilterActive(false);
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalReviews = filteredReviews.length;
  const totalPages = Math.ceil(totalReviews / reviewsPerPage);
  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = filteredReviews.slice(indexOfFirstReview, indexOfLastReview);

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    items.push(
      <Button
        key="prev"
        variant="outline-secondary"
        size="sm"
        className="me-1"
        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
        disabled={currentPage === 1}
      >
        &laquo;
      </Button>
    );

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Button
          key={i}
          variant={currentPage === i ? 'primary' : 'outline-secondary'}
          size="sm"
          className="me-1"
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </Button>
      );
    }

    // Next button
    items.push(
      <Button
        key="next"
        variant="outline-secondary"
        size="sm"
        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
        disabled={currentPage === totalPages}
      >
        &raquo;
      </Button>
    );

    return items;
  };

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

  return (
    <>
      <div className="d-flex justify-content-between align-items-center p-3 pb-0 flex-wrap gap-2">
        <h6 className="mb-0 fw-semibold text-dark d-none d-md-block">Reviews List</h6>
        
        <div className="d-flex gap-2 ms-auto flex-wrap">
          {/* Date Filter */}
          <div className="position-relative">
            <Button 
              variant={selectedDate ? 'primary' : 'outline-primary'}
              onClick={() => setShowDatePicker(!showDatePicker)}
              size="sm"
              className={`filter-btn ${selectedDate ? 'filter-active' : ''}`}
              title="Filter by Date"
            >
              <i className="bi bi-calendar-check"></i>
              {selectedDate && (
                <span className="ms-2 d-none d-sm-inline">
                  {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </Button>
          
            {showDatePicker && (
              <>
                <div className="filter-backdrop d-md-none" onClick={() => setShowDatePicker(false)} />
                <div className="date-filter-dropdown position-absolute end-0 mt-2 shadow-lg" style={{ zIndex: 1000 }}>
                  <div className="date-filter-header">
                    <i className="bi bi-calendar-event me-2"></i>
                    <span>Select Date</span>
                  </div>
                  <div className="date-filter-body">
                    <Form.Control
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="date-input"
                    />
                  </div>
                  <div className="date-filter-footer">
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="flex-grow-1"
                      onClick={handleDateFilter}
                    >
                      <i className="bi bi-check2 me-1"></i>
                      Apply
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={() => {
                        clearFilter();
                        setShowDatePicker(false);
                      }}
                    >
                      <i className="bi bi-x-lg me-1"></i>
                      Clear
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Container fluid className="p-4">
        <div className="mx-auto" style={{ maxWidth: '1280px' }}>

          {filterActive && (
            <div className="alert alert-info d-flex justify-content-between align-items-center mb-3">
              <span>
                <i className="bi bi-funnel-fill me-2"></i>
                Showing reviews for: <strong>{new Date(selectedDate).toLocaleDateString()}</strong>
              </span>
              <Button variant="link" size="sm" onClick={clearFilter}>
                Clear Filter
              </Button>
            </div>
          )}

          <Card className="shadow-sm">
            <Card.Body className="p-0">
              {currentReviews.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
                  <p className="mt-3">No reviews found{filterActive ? ' for selected date' : ''}.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-borderless align-middle mb-0">
                    <thead className="table-header">
                      <tr>
                        <th scope="col" className="px-4 py-3">ID</th>
                        <th scope="col" className="px-4 py-3">Patient</th>
                        <th scope="col" className="px-4 py-3">Rating</th>
                        <th scope="col" className="px-4 py-3">Comment</th>
                        <th scope="col" className="px-4 py-3">Date</th>
                        <th scope="col" className="px-4 py-3 text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentReviews.map((review) => (
                        <tr key={review.reviewID} className="border-bottom hover-table-row">
                          <td className="px-4 py-4 fw-medium text-dark fw-bold" data-label="ID">#{review.reviewID}</td>
                          <td className="px-4 py-4 text-dark" data-label="Patient">{review.patient?.fullName || 'Anonymous'}</td>
                          <td className="px-4 py-4" data-label="Rating">
                            <RatingStars rating={review.rating} />
                            <span className="ms-2 text-muted small">({review.rating}/5)</span>
                          </td>
                          <td className="px-4 py-4" data-label="Comment" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {review.comment || 'No comment provided'}
                          </td>
                          <td className="px-4 py-4 text-muted" data-label="Date">
                            {new Date(review.reviewDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-4 py-4 text-end" data-label="Actions">
                            <button
                              className="btn btn-view d-flex align-items-center justify-content-center ms-auto"
                              onClick={() => handleViewReview(review)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
            
            {currentReviews.length > 0 && totalPages > 1 && (
              <Card.Footer className="d-flex justify-content-between align-items-center bg-light">
                <div className="d-flex align-items-center gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <i className="bi bi-chevron-left"></i> Previous
                  </Button>
                  <small className="text-muted mx-2">
                    Page <span className="text-dark fw-medium">{currentPage}</span> of{' '}
                    <span className="text-dark fw-medium">{totalPages}</span>
                  </small>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next <i className="bi bi-chevron-right"></i>
                  </Button>
                </div>
                <small className="text-muted">
                  Showing <span className="text-dark fw-medium">{indexOfFirstReview + 1}</span> to{' '}
                  <span className="text-dark fw-medium">{Math.min(indexOfLastReview, totalReviews)}</span> of{' '}
                  <span className="text-dark fw-medium">{totalReviews}</span> results
                </small>
              </Card.Footer>
            )}
          </Card>
        </div>
      </Container>
      
      <ReviewModal 
        show={showModal}
        onHide={() => setShowModal(false)}
        review={selectedReview}
      />
    </>
  );
};

export default DoctorReviewView;
