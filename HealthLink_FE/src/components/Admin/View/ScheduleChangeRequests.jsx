import React, { useEffect, useState } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { scheduleApi } from "../../../api/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";

export default function ScheduleChangeRequests() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await scheduleApi.getScheduleChangeRequests();
      setRequests(data || []);
    } catch (err) {
      console.error('Error loading schedule change requests:', err);
      showToast({ title: 'Error', message: err.response?.data?.message || 'Unable to load schedule requests', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    if (!window.confirm('Approve this schedule change request?')) return;
    try {
      setProcessingRequestId(requestId);
      await scheduleApi.approveScheduleChangeRequest(requestId);
      showToast({ title: 'Approved', message: 'Schedule change request has been approved.', type: 'success' });
      fetchRequests();
    } catch (err) {
      console.error('Error approving schedule change request:', err);
      showToast({ title: 'Error', message: err.response?.data?.message || 'Approve action failed', type: 'error' });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleReject = async (requestId) => {
    const adminReason = window.prompt('Enter a reason for rejection:', '');
    if (adminReason === null) return;
    if (!adminReason.trim()) {
      showToast({ title: 'Invalid', message: 'Rejection reason is required to reject a request.', type: 'warning' });
      return;
    }

    try {
      setProcessingRequestId(requestId);
      await scheduleApi.rejectScheduleChangeRequest(requestId, adminReason.trim());
      showToast({ title: 'Rejected', message: 'Schedule change request has been rejected.', type: 'success' });
      fetchRequests();
    } catch (err) {
      console.error('Error rejecting schedule change request:', err);
      showToast({ title: 'Error', message: err.response?.data?.message || 'Reject action failed', type: 'error' });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString();
  };

  const getStatusBadgeClass = (status) => {
    switch ((status || '').toString().toUpperCase()) {
      case 'APPROVED':
        return 'badge bg-success';
      case 'REJECTED':
        return 'badge bg-danger';
      case 'PENDING':
      default:
        return 'badge bg-warning text-dark';
    }
  };

  return (
    <NavbarAdmin sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}>
      <Toast title={toast.title} message={toast.message} type={toast.type} show={toast.show} onClose={hideToast} />

      <div className="admin-content">
        <div className="container-fluid py-3">
          <div className="compliance-page-header mb-3">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <div className="compliance-page-icon">
                  <i className="bi bi-arrow-repeat"></i>
                </div>
                <div>
                  <h2 className="compliance-page-title">Schedule Change Requests</h2>
                  <p className="compliance-page-subtitle mb-0">Review doctor requests for appointment schedule changes.</p>
                </div>
              </div>
              <button className="btn btn-outline-primary btn-sm" onClick={fetchRequests} type="button" disabled={loading}>
                Refresh
              </button>
            </div>
          </div>

          <div className="card border rounded-4 p-4">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status" style={{ width: '2rem', height: '2rem' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center text-muted py-5">No schedule change requests found.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Request ID</th>
                      <th scope="col">Doctor / Patient</th>
                      <th scope="col">Appointment</th>
                      <th scope="col">Reason</th>
                      <th scope="col">Status</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => (
                      <tr key={request.requestId}>
                        <td>#{request.requestId}</td>
                        <td>
                          <div className="fw-semibold">{request.doctorName}</div>
                          <div className="text-muted small">{request.patientName}</div>
                        </td>
                        <td>
                          <div>{formatDateTime(request.appointmentTime)}</div>
                          <div className="text-muted small">#{request.appointmentId}</div>
                        </td>
                        <td className="text-break" style={{ maxWidth: '220px' }}>
                          {request.reason}
                        </td>
                        <td>
                          <span className={getStatusBadgeClass(request.status)}>{request.status}</span>
                          {request.adminReason && <div className="text-muted small mt-1">{request.adminReason}</div>}
                        </td>
                        <td>
                          {request.status === 'PENDING' ? (
                            <div className="d-flex gap-2 flex-wrap">
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleApprove(request.requestId)}
                                disabled={processingRequestId === request.requestId}
                                type="button"
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleReject(request.requestId)}
                                disabled={processingRequestId === request.requestId}
                                type="button"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted small">No action required</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </NavbarAdmin>
  );
}
