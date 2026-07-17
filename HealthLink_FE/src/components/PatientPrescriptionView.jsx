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

  // Custom styles for printing
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        .print-row {
          display: block !important;
          width: 100% !important;
          clear: both !important;
          margin-bottom: 1rem !important;
        }
        .print-col-4 {
          display: block !important;
          float: left !important;
          width: 33.33333333% !important;
          padding-left: 0.5rem !important;
          padding-right: 0.5rem !important;
        }
        .print-p-2 {
          padding: 0.5rem !important;
        }
        .print-mb-1 {
          margin-bottom: 0.25rem !important;
        }
        .mt-print-0 {
          margin-top: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
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

  const stripHtml = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const removeVietnameseTones = (str) => {
    if (!str) return '';
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str;
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
                <div className="p-4 p-md-4 position-relative">
                  {/* Watermark (Print only) */}
                  <div className="prescription-watermark d-none d-print-block">HEALTHLINK</div>

                  {/* Print-only Clinic Header (Classic & Elegant) */}
                  <div className="d-none d-print-block mb-4">
                    <div className="text-center pb-3" style={{ borderBottom: '2px solid #111827' }}>
                      <h1 className="fw-bolder mb-1" style={{ color: '#111827', letterSpacing: '2px', fontSize: '2.5rem' }}>HEALTHLINK</h1>
                      <p className="mb-1 text-dark" style={{ fontSize: '1rem' }}>21 bis Hau Giang, Tan Son Nhat Ward, Ho Chi Minh City</p>
                      <p className="mb-1 text-dark" style={{ fontSize: '0.9rem' }}>Phone: +(002) 0174-8812-598 | Email: contact@healthlink.com</p>
                    </div>
                    <div className="mt-4 text-center">
                      <h3 className="fw-bold text-dark" style={{ letterSpacing: '1.5px', textDecoration: 'underline' }}>MEDICAL PRESCRIPTION</h3>
                      <p className="text-muted mt-1">RX-{selectedPrescription.prescriptionHeaderID?.toString().padStart(4, '0')}</p>
                    </div>
                  </div>

                  {/* Header Section */}
                  <div className="pb-4 mb-4 border-bottom border-custom print-border-dark d-flex justify-content-between align-items-start flex-wrap gap-3">
                    <div>
                      <p className="text-gray-900 fs-5 fw-bold mb-1">
                        Consultation Report & Prescription
                      </p>
                      <p className="text-gray-500 small mb-1">Doctor: {selectedPrescription.doctorName || 'Dr. Unknown'} ({selectedPrescription.specialty || 'General'})</p>
                      <p className="text-gray-500 small mb-1">Diagnosis: {stripHtml(selectedPrescription.diagnosis) || 'Not specified'}</p>
                      <p className="text-gray-500 small mb-0">Date: {formatDate(selectedPrescription.issueDate)}</p>
                    </div>
                    {selectedPrescription.paymentStatus && (
                      <div className="text-end">
                        <span className={`badge ${selectedPrescription.paymentStatus === 'PAID' ? 'bg-success' : 'bg-warning'} px-3 py-2 rounded-pill`}>
                          Payment: {selectedPrescription.paymentStatus}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Patient Info, Vitals, and Clinical Notes - Compact Row for Print */}
                  <div className="mb-4 row g-3 print-row">
                    <div className="col-12 col-md-6 print-col-4">
                      <p className="text-gray-900 fs-6 fw-semibold mb-2 print-mb-1"><i className="bi bi-person-badge me-2"></i>Patient Information</p>
                      <div className="bg-light p-3 print-p-2 rounded-3 h-100">
                        <p className="small mb-1"><strong>Name:</strong> {selectedPrescription.patientName}</p>
                        <p className="small mb-1"><strong>Age:</strong> {selectedPrescription.patientAge || 'N/A'} | <strong>Gender:</strong> {selectedPrescription.patientGender || 'N/A'}</p>
                        <p className="small mb-1"><strong>Phone:</strong> {selectedPrescription.patientPhone || 'N/A'}</p>
                        <p className="small mb-0"><strong>Address:</strong> {selectedPrescription.patientAddress || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="col-12 col-md-6 print-col-4">
                      <p className="text-gray-900 fs-6 fw-semibold mb-2 print-mb-1"><i className="bi bi-heart-pulse me-2"></i>Vital Signs</p>
                      <div className="bg-light p-3 print-p-2 rounded-3 h-100">
                        <div className="row g-1">
                          <div className="col-6"><p className="small mb-0"><strong>BP:</strong> {selectedPrescription.bloodPressureSystolic ? `${selectedPrescription.bloodPressureSystolic}/${selectedPrescription.bloodPressureDiastolic}` : 'N/A'} mmHg</p></div>
                          <div className="col-6"><p className="small mb-0"><strong>Heart Rate:</strong> {selectedPrescription.heartRate || 'N/A'} bpm</p></div>
                          <div className="col-6"><p className="small mb-0"><strong>Temp:</strong> {selectedPrescription.temperature || 'N/A'} °C</p></div>
                          <div className="col-6"><p className="small mb-0"><strong>SpO2:</strong> {selectedPrescription.spO2 || 'N/A'} %</p></div>
                          <div className="col-6"><p className="small mb-0"><strong>Weight:</strong> {selectedPrescription.patientWeight || 'N/A'} kg</p></div>
                          <div className="col-6"><p className="small mb-0"><strong>Height:</strong> {selectedPrescription.patientHeight || 'N/A'} cm</p></div>
                        </div>
                      </div>
                    </div>
                    
                    {(selectedPrescription.symptoms || selectedPrescription.medicalHistory) && (
                      <div className="col-12 col-md-12 print-col-4 mt-md-4 mt-print-0">
                        <p className="text-gray-900 fs-6 fw-semibold mb-2 print-mb-1"><i className="bi bi-clipboard2-pulse me-2"></i>Clinical Notes</p>
                        <div className="border border-custom rounded-3 p-3 print-p-2 h-100">
                          {selectedPrescription.symptoms && (
                            <div className="mb-2">
                              <strong className="small d-block text-gray-700">Symptoms:</strong>
                              <span className="small text-muted">{selectedPrescription.symptoms}</span>
                            </div>
                          )}
                          {selectedPrescription.medicalHistory && (
                            <div>
                              <strong className="small d-block text-gray-700">Medical History:</strong>
                              <span className="small text-muted">{selectedPrescription.medicalHistory}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
                            <th className="p-3 small fw-semibold text-gray-600">Instructions</th>
                            <th className="p-3 small fw-semibold text-gray-600 rounded-end-lg">Notes</th>
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
                                <td className="p-3 text-gray-500 fst-italic">{med.notes}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="p-3 text-center text-gray-500">
                                No medication information
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Doctor's Notes Section */}
                  <div className="mt-5 row g-4">
                    <div className="col-md-6">
                      <p className="text-gray-900 fs-6 fw-semibold mb-3"><i className="bi bi-journal-medical me-2"></i>Treatment & Advice</p>
                      <div className="notes-box h-100">
                        {selectedPrescription.treatment && (
                          <div className="mb-3">
                            <strong className="small d-block mb-1">Treatment Plan:</strong>
                            <p className="text-gray-600 small mb-0">{stripHtml(selectedPrescription.treatment)}</p>
                          </div>
                        )}
                        {selectedPrescription.notes && (
                          <div>
                            <strong className="small d-block mb-1">General Advice:</strong>
                            <p className="text-gray-600 small mb-0">{stripHtml(selectedPrescription.notes)}</p>
                          </div>
                        )}
                        {!selectedPrescription.treatment && !selectedPrescription.notes && (
                          <p className="text-gray-400 small fst-italic mb-0">No specific advice recorded.</p>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <p className="text-gray-900 fs-6 fw-semibold mb-3"><i className="bi bi-calendar-check me-2"></i>Follow-up Information</p>
                      <div className="notes-box h-100 bg-light">
                        {selectedPrescription.followUpDate ? (
                          <>
                            <p className="small mb-2"><strong>Next Visit:</strong> {formatDate(selectedPrescription.followUpDate)}</p>
                            {selectedPrescription.followUpNotes && (
                              <p className="small text-muted mb-0"><strong>Notes:</strong> {selectedPrescription.followUpNotes}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-400 small fst-italic mb-0">No follow-up scheduled.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Attachments */}
                  {selectedPrescription.attachments && selectedPrescription.attachments.length > 0 && (
                    <div className="mt-4">
                      <p className="text-gray-900 fs-6 fw-semibold mb-3"><i className="bi bi-paperclip me-2"></i>Attachments & Documents</p>
                      <ul className="list-group">
                        {selectedPrescription.attachments.map((doc, index) => (
                          <li key={index} className="list-group-item d-flex justify-content-between align-items-center bg-light border-0 mb-2 rounded-3">
                            <div>
                              <i className="bi bi-file-earmark-medical text-primary me-2"></i>
                              <span className="small text-gray-800">{doc}</span>
                            </div>
                            <button className="btn btn-sm btn-outline-primary rounded-pill px-3">
                              <i className="bi bi-download me-1"></i> Download
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Doctor Signature (Print only) */}
                  <div className="d-none d-print-flex justify-content-end mt-5 pt-4 position-relative">
                    {/* Authorized Stamp */}
                    <div className="clinic-stamp">AUTHORIZED</div>

                    <div className="text-center" style={{ width: '300px' }}>
                      <p className="mb-2 text-dark fw-bold">Doctor's Signature</p>
                      <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{
                          fontFamily: '"Sacramento", "Dancing Script", "Great Vibes", "Brush Script MT", "Lucida Handwriting", cursive',
                          fontSize: '2.5rem',
                          color: '#0f172a',
                          whiteSpace: 'nowrap'
                        }}>
                          {removeVietnameseTones(selectedPrescription.doctorName || 'Dr. Unknown')}
                        </span>
                      </div>
                      <p className="text-dark small mt-1 mb-0">{selectedPrescription.specialty || 'General Practitioner'}</p>
                    </div>
                  </div>

                  {/* System Footer (Print only) */}
                  <div className="d-none d-print-block mt-5 pt-3 text-center border-top border-dark border-opacity-25">
                    <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                      Generated securely by HealthLink System | Timestamp: {new Date().toLocaleString()}
                    </p>
                  </div>

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
