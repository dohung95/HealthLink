import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { prescriptionService } from '../api/prescriptionApi';
import { useAuth } from '../context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Css/PatientPrescriptionView.css';
// import Loading from './Loading';

const PatientPrescriptionView = () => {
  const navigate = useNavigate();
  const { currentUserId: userId } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  useEffect(() => {
    filterPrescriptions();
  }, [prescriptions, searchQuery]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);

      const data = await prescriptionService.getMyPrescriptions();
      console.log('Prescriptions from server:', data);
      console.log('User ID from context:', userId);

      setPrescriptions(data || []);
      if (data && data.length > 0) {
        setSelectedPrescription(data[0]);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
      setError('Failed to load prescriptions');
    } finally {
      //   setTimeout(() => {
      setLoading(false);
      //   }, 1000);
    }
  };

  const filterPrescriptions = () => {
    let filtered = [...prescriptions];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatDate(p.issueDate).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPrescriptions(filtered);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStatus = (issueDate) => {
    const daysSinceIssue = Math.floor((new Date() - new Date(issueDate)) / (1000 * 60 * 60 * 24));
    if (daysSinceIssue <= 7) return 'New';
    if (daysSinceIssue <= 30) return 'Used';
    return 'Expired';
  };

  const getStatusBadge = (status) => {
    let classes = '';
    if (status === 'New') {
      classes = 'badge-new';
    } else if (status === 'Used') {
      classes = 'badge-used';
    } else if (status === 'Expired') {
      classes = 'badge-expired';
    }

    return (
      <span className={`badge ${classes} px-2 py-1`}>{status}</span>
    );
  };

  if (error) {
    return (
      <div className="min-vh-100 d-flex justify-content-center align-items-center">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="Background_Doctors py-4">
      <div className="container" style={{ fontFamily: 'Inter, sans-serif' }}>
        {/* Page Heading */}
        <div className="mb-4 d-print-none">
          <h2 className="text-gray-900 fs-3 fw-bold mb-1">Your Prescriptions</h2>
          <p className="text-gray-500 small">Review all your prescribed medications.</p>
        </div>

        {loading ? (
          <div className="card border-0 shadow-sm bg-white rounded-4 animate__animated animate__fadeIn">
            <div className="card-body py-5 text-center text-muted">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <span>Loading prescriptions...</span>
            </div>
          </div>
        ) : (
          <div className="row g-4 h-100 animate__animated animate__fadeIn">
            {/* Left Column: Prescription List */}
            <div className="col-lg-4 d-flex flex-column bg-white-custom rounded-3 border border-custom d-print-none">
              <div className="p-4 border-bottom border-custom">
                {/* SearchBar */}
                <div className="input-group search-input-group">
                  <span className="input-group-text border-end-0">
                    <span className="material-symbols-outlined">search</span>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search by doctor name, date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Prescription List Items */}
              <div className="flex-grow-1 overflow-auto">
                {filteredPrescriptions.length === 0 ? (
                  <div className="p-4 text-center text-muted">
                    <p>No prescriptions found</p>
                  </div>
                ) : (
                  filteredPrescriptions.map((p) => (
                    <div
                      key={p.prescriptionHeaderID}
                      className={`d-flex gap-3 p-3 justify-content-between prescription-list-item ${selectedPrescription?.prescriptionHeaderID === p.prescriptionHeaderID ? 'list-item-active' : 'list-item-inactive'
                        }`}
                      onClick={() => setSelectedPrescription(p)}
                    >
                      <div className="d-flex align-items-start gap-3">
                        <div className="doctor-avatar" style={{
                          backgroundImage: `url(https://ui-avatars.com/api/?name=${p.doctorName || 'Doctor'}&background=137fec&color=fff)`
                        }}></div>
                        <div className="d-flex flex-column justify-content-center">
                          <p className="text-gray-900 fs-6 fw-medium mb-0">{p.doctorName || 'Dr. Unknown'}</p>
                          <p className="text-gray-500 small mb-0">Issued: {formatDate(p.issueDate)}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 d-flex align-items-center">
                        {getStatusBadge(getStatus(p.issueDate))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Prescription Details */}
            <div id="printable-prescription" className="col-lg-8 d-flex flex-column bg-white-custom rounded-3 border border-custom overflow-auto">
              {selectedPrescription ? (
                <div className="p-4 p-md-4">
                  {/* Print-only Clinic Header */}
                  <div className="d-none d-print-block text-center mb-4 border-bottom border-dark pb-3">
                    <h2 className="fw-bold mb-1" style={{ fontFamily: '"Times New Roman", serif', color: '#000' }}>HEALTHLINK</h2>
                    <p className="mb-0 small text-black">21 bis Hau Giang, Tan Son Nhat Ward, Ho Chi Minh City.</p>
                    <p className="mb-0 small text-black">Phone: +(002) 0174-8812-598 | Email: HealthLink@gmail.com</p>
                    <p className="mb-0 small text-black">Website: https://www.healthlink.com</p>
                    <h3 className="mt-4 mb-0 fw-bold text-decoration-underline" style={{ fontFamily: '"Times New Roman", serif', color: '#000' }}>MEDICAL PRESCRIPTION</h3>
                  </div>

                  {/* Header Section */}
                  <div className="pb-4 mb-4 border-bottom border-custom print-border-dark">
                    <div>
                      <p className="text-gray-900 fs-5 fw-bold mb-1">
                        Prescription from {selectedPrescription.doctorName || 'Dr. Unknown'}
                      </p>
                      <p className="text-gray-500 small mb-1">Specialty: {selectedPrescription.specialty || 'Not specified'}</p>
                      <p className="text-gray-500 small mb-0">Issued: {formatDate(selectedPrescription.issueDate)}</p>
                    </div>
                  </div>

                  {/* Medication List Table */}
                  <div className="mt-4">
                    <p className="text-gray-900 fs-6 fw-semibold mb-3">Medication Details</p>
                    <div className="table-responsive">
                      <table className="table table-borderless table-details w-100 text-start">
                        <thead className="bg-background-light rounded-top-3">
                          <tr>
                            <th className="p-3 small fw-semibold text-gray-600 rounded-start-lg">Medication Name</th>
                            <th className="p-3 small fw-semibold text-gray-600">Dosage</th>
                            <th className="p-3 small fw-semibold text-gray-600">Supply Days</th>
                            <th className="p-3 small fw-semibold text-gray-600 rounded-end-lg">Instructions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPrescription.medications && selectedPrescription.medications.length > 0 ? (
                            selectedPrescription.medications.map((med, index) => (
                              <tr key={index} className="border-bottom border-custom">
                                <td className="p-3 text-gray-800 fw-normal">{med.medicationName}</td>
                                <td className="p-3 text-gray-500">{med.dosage}</td>
                                <td className="p-3 text-gray-500">{med.totalSupplyDays} days</td>
                                <td className="p-3 text-gray-500">{med.instructions}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="p-3 text-center text-gray-500">
                                No medication information
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Doctor's Notes Section */}
                  {selectedPrescription.notes && (
                    <div className="mt-5">
                      <p className="text-gray-900 fs-6 fw-semibold mb-3">Doctor's Advice</p>
                      <div className="notes-box">
                        <p className="text-gray-600 small mb-0">{selectedPrescription.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Order / Refill CTA */}
                  <div className="mt-4 pt-3 border-top border-custom d-flex gap-2 d-print-none">
                    <button
                      className="btn btn-success px-4"
                      onClick={() => navigate('/patient-dashboard/pharmacy', { state: { autoSelectPrescriptionId: selectedPrescription.prescriptionHeaderID } })}
                    >
                      <i className="bi bi-cart-plus me-2"></i>Order from pharmacy
                    </button>
                    {getStatus(selectedPrescription.issueDate) !== 'Expired' && (
                      <button
                        className="btn btn-outline-success px-4"
                        onClick={async () => {
                          try {
                            const newRx = await prescriptionService.requestRefill(selectedPrescription.prescriptionHeaderID);
                            toast.success('Refill prescription created');
                            await fetchPrescriptions();
                            setSelectedPrescription(newRx);
                          } catch (err) {
                            toast.error(err.response?.data?.message || 'Unable to refill prescription');
                          }
                        }}
                      >
                        <i className="bi bi-arrow-repeat me-2"></i>Refill
                      </button>
                    )}
                    <button
                      className="btn btn-outline-primary px-4"
                      onClick={() => window.print()}
                    >
                      <i className="bi bi-printer me-2"></i>Print Prescription
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 d-flex justify-content-center align-items-center flex-grow-1">
                  <div className="text-center text-muted">
                    <span className="material-symbols-outlined" style={{ fontSize: '4rem', opacity: 0.3 }}>
                      description
                    </span>
                    <p className="mt-3">Select a prescription to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientPrescriptionView;
