import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import prescriptionApi from '../api/prescriptionApi';
import './Css/PrescriptionDetailModal.css';

function PrescriptionDetailModal({ show, onHide, prescriptionId }) {
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show && prescriptionId) {
      loadPrescriptionDetail();
    }
  }, [show, prescriptionId]);

  const loadPrescriptionDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await prescriptionApi.getPrescriptionById(prescriptionId);
      setPrescription(data);
    } catch (err) {
      console.error('Error loading prescription:', err);
      setError('Failed to load prescription details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const calculateEndDate = (issueDate, supplyDays) => {
    const date = new Date(issueDate);
    date.setDate(date.getDate() + supplyDays);
    return date;
  };

  const calculateRemainingDays = (issueDate, supplyDays) => {
    const endDate = calculateEndDate(issueDate, supplyDays);
    const today = new Date();
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="lg" 
      centered
      backdrop={true}
      keyboard={true}
      className="prescription-detail-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <span className="material-symbols-outlined">description</span>
          Prescription Details
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-danger">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        {!loading && !error && prescription && (
          <div className="prescription-detail-content">
            {/* Header Info */}
            <div className="prescription-header-info">
              <div className="info-row">
                <span className="info-label">Prescription ID:</span>
                <span className="info-value">#{prescription.prescriptionHeaderID}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Issue Date:</span>
                <span className="info-value">{formatDate(prescription.issueDate)}</span>
              </div>
              {prescription.medications && prescription.medications.length > 0 && (
                <div className="info-row">
                  <span className="info-label">Valid Until:</span>
                  <span className="info-value">
                    {formatDate(calculateEndDate(prescription.issueDate, Math.max(...prescription.medications.map(m => m.totalSupplyDays))))}
                  </span>
                </div>
              )}
              {prescription.doctorName && (
                <div className="info-row">
                  <span className="info-label">Prescribed by:</span>
                  <span className="info-value">
                    {prescription.doctorName}
                    {prescription.specialty && ` (${prescription.specialty})`}
                  </span>
                </div>
              )}
            </div>

            {/* Medications List */}
            <div className="medications-section">
              <h6 className="section-title">
                <span className="material-symbols-outlined">medication</span>
                Medications ({prescription.medications?.length || 0})
              </h6>
              
              {prescription.medications && prescription.medications.length > 0 ? (
                <div className="medications-list">
                  {prescription.medications.map((med, index) => {
                    const remainingDays = calculateRemainingDays(prescription.issueDate, med.totalSupplyDays);
                    const isActive = remainingDays > 0;

                    return (
                      <div key={med.prescriptionItemID || index} className={`medication-card-compact ${!isActive ? 'expired' : ''}`}>
                        <div className="medication-header-compact">
                          <div className="medication-name-compact">
                            <span className="material-symbols-outlined">pill</span>
                            <h6>{med.medicationName}</h6>
                            <span className={`status-badge-small ${isActive ? 'active' : 'expired'}`}>
                              {isActive ? 'Active' : 'Expired'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="medication-details-compact">
                          <div className="detail-row">
                            <span className="detail-label-compact">
                              <span className="material-symbols-outlined">vaccines</span>
                              Dosage:
                            </span>
                            <span className="detail-value-compact">{med.dosage}</span>
                          </div>
                          
                          <div className="detail-row">
                            <span className="detail-label-compact">
                              <span className="material-symbols-outlined">sticky_note_2</span>
                              Instructions:
                            </span>
                            <span className="detail-value-compact">{med.instructions}</span>
                          </div>
                          
                          <div className="detail-row-inline">
                            <div className="detail-inline-item">
                              <span className="material-symbols-outlined">calendar_month</span>
                              <span className="detail-value-compact">{med.totalSupplyDays} days</span>
                            </div>
                            
                            {isActive && (
                              <div className="detail-inline-item remaining">
                                <span className="material-symbols-outlined">schedule</span>
                                <span className="detail-value-compact highlight">{remainingDays} day(s) left</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-medications">
                  <span className="material-symbols-outlined">inbox</span>
                  <p>No medications in this prescription</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}

export default PrescriptionDetailModal;
