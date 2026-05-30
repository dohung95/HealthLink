import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import pharmacyApi from '../../api/pharmacyApi';

export default function PharmacyConsultationsPage() {
  const { currentUserId, initiateCall } = useAuth();
  const { openChatWith } = useChat();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const loadRequests = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const data = await pharmacyApi.getConsultationRequestsByPatient(currentUserId);
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Unable to load consultation requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [currentUserId]);

  const status = selected ? selected.status || '' : '';
  const canCommunicate = status && !['PENDING', 'CANCELLED'].includes(status.toUpperCase());

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center mb-4">
        <button className="btn btn-outline-secondary me-3" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <h4 className="mb-0">My Pharmacy Consultations</h4>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted">Loading consultations...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-chat-square-text" style={{ fontSize: '3rem', color: '#ccc' }} />
          <h5 className="mt-3">No consultation requests</h5>
          <p className="text-muted">
            You have not submitted any pharmacy consultation requests yet.
          </p>
        </div>
      ) : (
        <div className="row">
          <div className="col-md-5">
            <div className="list-group">
              {requests.map((req) => (
                <button
                  key={req.requestId}
                  className={`list-group-item list-group-item-action ${selected?.requestId === req.requestId ? 'active' : ''}`}
                  onClick={() => setSelected(req)}
                  type="button"
                >
                  <div className="d-flex w-100 justify-content-between">
                    <h6 className="mb-1">{req.pharmacyName}</h6>
                    <small>{new Date(req.createdAt).toLocaleDateString()}</small>
                  </div>
                  <p className="mb-1 text-truncate">{req.description || req.symptoms || 'No description'}</p>
                  <small className={`badge bg-${req.status === 'CANCELLED' ? 'danger' : req.status === 'IN_REVIEW' ? 'info' : req.status === 'PRESCRIPTION_CREATED' ? 'success' : 'secondary'}`}>
                    {req.status}
                  </small>
                </button>
              ))}
            </div>
          </div>

          <div className="col-md-7">
            {selected ? (
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">{selected.pharmacyName}</h5>
                  <span className={`badge bg-${selected.status === 'CANCELLED' ? 'danger' : selected.status === 'IN_REVIEW' ? 'info' : selected.status === 'PRESCRIPTION_CREATED' ? 'success' : 'secondary'} mb-3`}>
                    {selected.status}
                  </span>

                  <div className="mb-3">
                    <strong>Symptoms:</strong>
                    <p className="mb-1">{selected.symptoms || 'N/A'}</p>
                  </div>

                  <div className="mb-3">
                    <strong>Description:</strong>
                    <p className="mb-1">{selected.description || 'N/A'}</p>
                  </div>

                  {selected.allergies && (
                    <div className="mb-3">
                      <strong>Allergies:</strong>
                      <p className="mb-1 text-danger">{selected.allergies}</p>
                    </div>
                  )}

                  {selected.preferredDeliveryType && (
                    <div className="mb-3">
                      <strong>Preferred Delivery:</strong>
                      <p className="mb-1">{selected.preferredDeliveryType}</p>
                    </div>
                  )}

                  {selected.pharmacyNotes && (
                    <div className="mb-3">
                      <strong>Pharmacy Notes:</strong>
                      <p className="mb-1">{selected.pharmacyNotes}</p>
                    </div>
                  )}

                  {selected.patientFollowUpNotes && (
                    <div className="mb-3">
                      <strong>Your Notes:</strong>
                      <p className="mb-1">{selected.patientFollowUpNotes}</p>
                    </div>
                  )}

                  {canCommunicate && (
                    <div className="d-flex gap-2 mt-3">
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => openChatWith({ uid: selected.patientId, displayName: selected.patientName })}
                      >
                        <i className="bi bi-chat-dots-fill me-1"></i> Chat with Pharmacy
                      </button>
                      <button
                        className="btn btn-outline-success"
                        onClick={() => {
                          const roomId = Array.from({ length: 45 }, () =>
                            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
                          ).join('');
                          initiateCall(selected.pharmacyId, roomId, selected.pharmacyName, 'Patient');
                        }}
                      >
                        <i className="bi bi-camera-video-fill me-1"></i> Video Call
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-hand-index-thumb" style={{ fontSize: '2rem' }} />
                <p className="mt-2">Select a consultation request to view details.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
