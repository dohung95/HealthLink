import React from 'react';
import { Modal, Button, Row, Col } from 'react-bootstrap';

const RatingStars = ({ rating }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} className={i <= rating ? 'text-warning' : 'text-muted'}>
        ★
      </span>
    );
  }
  return <>{stars}</>;
};

const ReviewModal = ({ show, onHide, review }) => {
  if (!review) return null;

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      centered 
      size="lg"
      backdrop={true}
      style={{ zIndex: 9999 }}
    >
      <Modal.Header closeButton className="border-0 pb-0" style={{ background: 'linear-gradient(135deg, #137fec 0%, #0d6ecc 100%)', color: 'white' }}>
        <Modal.Title className="fw-bold">
          <i className="bi bi-star-fill me-2"></i>
          Review Details
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="p-4" style={{ background: '#fafbfc' }}>
        <Row className="g-4">
          <Col md={6}>
            <div className="d-flex flex-column gap-2 p-3 bg-white rounded-3 shadow-sm">
              <p className="text-muted small mb-0 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Review ID</p>
              <p className="fw-bold text-dark mb-0" style={{ fontSize: '1.1rem', color: '#137fec' }}>#{review.reviewID}</p>
            </div>
          </Col>
          
          <Col md={6}>
            <div className="d-flex flex-column gap-2 p-3 bg-white rounded-3 shadow-sm">
              <p className="text-muted small mb-0 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Submitted Date</p>
              <p className="fw-semibold text-dark mb-0">
                {new Date(review.reviewDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </Col>
          
          <Col md={6}>
            <div className="d-flex flex-column gap-2 p-3 bg-white rounded-3 shadow-sm">
              <p className="text-muted small mb-0 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Patient</p>
              <p className="fw-semibold text-dark mb-0">
                {review.patient?.fullName || 'Anonymous'}
              </p>
            </div>
          </Col>
          
          <Col md={6}>
            <div className="d-flex flex-column gap-2 p-3 bg-white rounded-3 shadow-sm">
              <p className="text-muted small mb-0 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Rating Score</p>
              <div className="d-flex align-items-center gap-2">
                <div className="fs-4">
                  <RatingStars rating={review.rating} />
                </div>
                <span className="fw-bold" style={{ fontSize: '1.1rem', color: '#137fec' }}>({review.rating}.0)</span>
              </div>
            </div>
          </Col>
          
          <Col xs={12}>
            <div className="d-flex flex-column gap-2 p-3 bg-white rounded-3 shadow-sm">
              <p className="text-muted small mb-0 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Comment</p>
              <p className="text-dark mb-0" style={{ lineHeight: '1.8', fontSize: '0.95rem' }}>
                {review.comment || 'No comment provided'}
              </p>
            </div>
          </Col>
        </Row>
      </Modal.Body>
      
      <Modal.Footer className="border-0 pt-0" style={{ background: '#fafbfc' }}>
        <Button 
          variant="secondary" 
          onClick={onHide}
          style={{ 
            background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
            border: 'none',
            padding: '0.5rem 1.5rem',
            borderRadius: '6px'
          }}
        >
          <i className="bi bi-x-circle me-2"></i>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ReviewModal;
