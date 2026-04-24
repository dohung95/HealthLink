import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const API_BASE_URL = 'https://localhost:7267';

export default function PrescriptionViewer({ patientId }) {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (patientId) {
            fetchPrescriptions();
        }
    }, [patientId]);

    const fetchPrescriptions = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/adminmedicalrecords/patient/${patientId}/prescriptions`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load prescriptions');
            }

            const data = await response.json();
            setPrescriptions(data);
        } catch (err) {
            console.error('Error fetching prescriptions:', err);
            setPrescriptions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleViewPrescription = (prescription) => {
        setSelectedPrescription(prescription);
        setShowModal(true);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="admin-card mb-4" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{
                    background: 'linear-gradient(135deg, #9774e9ae 0%, #ccb6f1a0 100%)',
                    color: 'white',
                    borderRadius: '8px 8px 0 0',
                    padding: '16px 20px',
                    borderBottom: 'none'
                }}>
                    <h5 className="mb-0 d-flex align-items-center" style={{ fontWeight: '600' }}>
                        <i className="bi bi-prescription2 me-2"></i>
                        Prescriptions
                        {prescriptions.length > 0 && (
                            <span className="badge bg-white text-purple ms-2" style={{ fontSize: '12px', color: '#8b5cf6' }}>
                                {prescriptions.length}
                            </span>
                        )}
                    </h5>
                </div>
                <div className="card-body" style={{ flex: 1, overflowY: 'auto', maxHeight: '600px', padding: '20px' }}>
                    {prescriptions.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {prescriptions.map((prescription) => (
                                <div
                                    key={prescription.prescriptionHeaderID}
                                    className="prescription-card"
                                    style={{
                                        background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf9 100%)',
                                        border: '1px solid #99f6e4',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onClick={() => handleViewPrescription(prescription)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.15)';
                                        e.currentTarget.style.borderColor = '#a989f6ff';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = '#99f6e4';
                                    }}
                                >
                                    {/* Status Indicator Bar */}
                                    <div style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: '4px',
                                        background: '#c3aef4ff'
                                    }}></div>

                                    <div className="d-flex align-items-start gap-3" style={{ paddingLeft: '8px' }}>
                                        {/* Icon */}
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #9575dfff 0%, #a182d5ff 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontSize: '20px',
                                            flexShrink: 0,
                                            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                                        }}>
                                            <i className="bi bi-prescription2"></i>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-grow-1">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div>
                                                    <h6 className="mb-1" style={{ color: '#0f172a', fontWeight: '600', fontSize: '14px' }}>
                                                        <i className="bi bi-calendar3 me-1" style={{ color: '#8b5cf6' }}></i>
                                                        {formatDate(prescription.issueDate)}
                                                    </h6>
                                                    <p className="mb-0" style={{ fontSize: '13px', color: '#64748b' }}>
                                                        <i className="bi bi-person-badge me-1" style={{ color: '#8b5cf6' }}></i>
                                                        Dr. {prescription.doctorName}
                                                    </p>
                                                </div>
                                                <span className="badge" style={{
                                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    padding: '4px 10px',
                                                    fontWeight: '600'
                                                }}>
                                                    {prescription.medications.length} Medication{prescription.medications.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            <div className="d-flex flex-wrap gap-2 mt-2">
                                                <span style={{
                                                    fontSize: '12px',
                                                    padding: '4px 10px',
                                                    background: 'rgba(139, 92, 246, 0.1)',
                                                    color: '#7c3aed',
                                                    borderRadius: '6px',
                                                    fontWeight: '500'
                                                }}>
                                                    <i className="bi bi-hospital me-1"></i>
                                                    {prescription.specialty || 'General Practice'}
                                                </span>
                                            </div>

                                            <p className="mb-0 mt-2" style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                <i className="bi bi-cursor me-1"></i>
                                                Click to view prescription details
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted py-5">
                            <i className="bi bi-prescription2" style={{ fontSize: '48px', color: '#d1d5db' }}></i>
                            <p className="mt-3">No prescriptions found</p>
                            <p className="text-muted small">This patient has no prescription records</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Prescription Detail Modal */}
            {showModal && selectedPrescription && (
                <div className="modal show d-block admin-modal-backdrop" tabIndex="-1">
                    <div className="modal-dialog modal-lg modal-dialog-scrollable">
                        <div className="modal-content" style={{ border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                            <div className="modal-header admin-modal-header" style={{
                                background: 'linear-gradient(135deg, #c8b5f5ff 0%, #9f74e8ff 100%)',
                                color: 'white',
                                borderBottom: 'none'
                            }}>
                                <h5 className="modal-title">
                                    <i className="bi bi-prescription2 me-2"></i>
                                    Prescription Details
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setShowModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body admin-modal-body" style={{ backgroundColor: 'var(--admin-bg)' }}>
                                {/* Prescription Overview */}
                                <div className="admin-card mb-3">
                                    <div className="card-body">
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="admin-info-row">
                                                    <strong>Prescription ID:</strong>
                                                    <span>#{selectedPrescription.prescriptionHeaderID}</span>
                                                </div>
                                                <div className="admin-info-row">
                                                    <strong>Issue Date:</strong>
                                                    <span>{formatDate(selectedPrescription.issueDate)}</span>
                                                </div>
                                                <div className="admin-info-row">
                                                    <strong>Appointment ID:</strong>
                                                    <span>#{selectedPrescription.appointmentID}</span>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="admin-info-row">
                                                    <strong>Doctor:</strong>
                                                    <span>Dr. {selectedPrescription.doctorName}</span>
                                                </div>
                                                <div className="admin-info-row">
                                                    <strong>Specialty:</strong>
                                                    <span>{selectedPrescription.specialty || 'General Practice'}</span>
                                                </div>
                                                <div className="admin-info-row">
                                                    <strong>Total Medications:</strong>
                                                    <span className="badge bg-purple">{selectedPrescription.medications.length}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Medications Table */}
                                <div className="admin-card">
                                    <div className="card-body">
                                        <h6 className="mb-3">
                                            <i className="bi bi-capsule me-2 text-purple"></i>
                                            Prescribed Medications
                                        </h6>
                                        <div className="table-responsive">
                                            <table className="table table-hover">
                                                <thead style={{ backgroundColor: '#faf5ff' }}>
                                                    <tr>
                                                        <th style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed' }}>#</th>
                                                        <th style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed',minWidth:"140px"  }}>Medication Name</th>
                                                        <th style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed', minWidth:"140px" }}>Dosage - Quantity</th>
                                                        <th style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed', textAlign:"center" }}>Instructions</th>
                                                        <th style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed',minWidth:"140px"  }}>Supply Days</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedPrescription.medications.map((med, index) => (
                                                        <tr key={med.prescriptionItemID}>
                                                            <td style={{ fontSize: '13px' }}>{index + 1}</td>
                                                            <td style={{ fontSize: '13px', fontWeight: '600' }}>
                                                                <i className="bi bi-capsule-pill me-1 text-purple"></i>
                                                                {med.medicationName}
                                                            </td>
                                                            <td style={{ fontSize: '13px' }}>
                                                                <span className="badge" style={{
                                                                    background: 'rgba(139, 92, 246, 0.1)',
                                                                    color: '#7c3aed',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    {med.dosage}
                                                                </span>
                                                            </td>
                                                            <td style={{ fontSize: '13px' }}>{med.instructions}</td>
                                                            <td style={{ fontSize: '13px' }}>
                                                                <span className="badge bg-info">{med.totalSupplyDays} days</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="admin-modal-footer">
                                <button
                                    type="button"
                                    className="admin-btn-modal secondary"
                                    onClick={() => setShowModal(false)}
                                >
                                    <i className="bi bi-x-circle"></i>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
