import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import pharmacyApi from '../../api/pharmacyApi';
import { paymentApi } from '../../api/paymentApi';

const TABS = [
  { label: 'Pharmacies', icon: 'bi-shop', path: '' },
  { label: 'Requests', icon: 'bi-chat-square-text', path: '/requests' },
  { label: 'Orders', icon: 'bi-box-seam', path: '/orders' },
];

function getActiveTab(location) {
  const p = location.pathname.replace(/\/+$/, '');
  if (p.endsWith('/requests')) return '/requests';
  if (p.includes('/orders/')) return '/orders';
  if (p.endsWith('/orders')) return '/orders';
  return '';
}

export default function PatientPharmacyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();
  const activeTab = getActiveTab(location);
  const isOrderDetail = location.pathname.includes('/orders/') && location.pathname.match(/\/orders\/([^/]+)$/);
  const orderId = isOrderDetail ? location.pathname.match(/\/orders\/([^/]+)$/)[1] : null;

  if (orderId) {
    return <OrderDetailView orderId={orderId} userId={userId} navigate={navigate} />;
  }

  return (
    <div className="patient-pharmacy-page">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h3 className="mb-0">Pharmacy</h3>
      </div>

      <ul className="nav nav-tabs mb-4">
        {TABS.map((t) => (
          <li className="nav-item" key={t.path}>
            <Link
              className={`nav-link ${activeTab === t.path ? 'active' : ''}`}
              to={`/patient-dashboard/pharmacy${t.path}`}
            >
              <i className={`bi ${t.icon} me-2`}></i>{t.label}
            </Link>
          </li>
        ))}
      </ul>

      {activeTab === '/requests' ? (
        <RequestsView userId={userId} />
      ) : activeTab === '/orders' ? (
        <OrdersView userId={userId} navigate={navigate} />
      ) : (
        <PharmacyListView userId={userId} navigate={navigate} />
      )}
    </div>
  );
}

function PharmacyListView({ userId, navigate }) {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [requestForm, setRequestForm] = useState({
    symptoms: '',
    description: '',
    allergies: '',
    additionalNotes: '',
    preferredDeliveryType: 'Delivery',
    prescriptionHeaderIds: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);

  const loadPharmacies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pharmacyApi.getPublicPharmacies({ deliveryOnly: deliveryOnly || undefined });
      setPharmacies(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Unable to load pharmacies.');
    } finally {
      setLoading(false);
    }
  }, [deliveryOnly]);

  useEffect(() => { loadPharmacies(); }, [loadPharmacies]);

  const filtered = pharmacies.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) || (p.address || '').toLowerCase().includes(q);
  });

  const openRequestModal = async (pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setRequestForm({ symptoms: '', description: '', allergies: '', additionalNotes: '', preferredDeliveryType: 'Delivery', prescriptionHeaderIds: [] });
    try {
      const mod = await import('../../api/prescriptionApi');
      const data = await mod.prescriptionService.getMyPrescriptions();
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch { setPrescriptions([]); }
    setShowRequestModal(true);
  };

  const submitRequest = async () => {
    if (!requestForm.symptoms.trim()) {
      toast.error('Please describe your symptoms.');
      return;
    }
    setSubmitting(true);
    try {
      await pharmacyApi.createConsultationRequest({
        pharmacyId: selectedPharmacy.pharmacyId,
        symptoms: requestForm.symptoms,
        description: requestForm.description,
        allergies: requestForm.allergies,
        additionalNotes: requestForm.additionalNotes,
        preferredDeliveryType: requestForm.preferredDeliveryType,
        prescriptionHeaderIds: requestForm.prescriptionHeaderIds.length > 0 ? requestForm.prescriptionHeaderIds : undefined,
      });
      toast.success('Consultation request sent!');
      setShowRequestModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap gap-3 mb-3 align-items-center">
        <div className="input-group" style={{ maxWidth: '320px' }}>
          <span className="input-group-text"><i className="bi bi-search"></i></span>
          <input
            type="text" className="form-control" placeholder="Search by name or address..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="form-check form-switch">
          <input className="form-check-input" type="checkbox" id="deliveryOnly"
            checked={deliveryOnly} onChange={(e) => setDeliveryOnly(e.target.checked)} />
          <label className="form-check-label" htmlFor="deliveryOnly">Delivery only</label>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted">Loading pharmacies...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-shop" style={{ fontSize: '3rem' }}></i>
          <p className="mt-2">No pharmacies found.</p>
        </div>
      ) : (
        <div className="row g-3">
          {filtered.map((p) => (
            <div className="col-md-6 col-lg-4" key={p.pharmacyId}>
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-start gap-3 mb-2">
                    <div className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                      style={{ width: 48, height: 48, minWidth: 48 }}>
                      <i className="bi bi-shop fs-4 text-success"></i>
                    </div>
                    <div className="min-width-0">
                      <h6 className="mb-1">{p.name}</h6>
                      <p className="small text-muted mb-0">{p.address}</p>
                    </div>
                  </div>
                  <div className="small text-muted mb-2">
                    {p.averageRating != null && (
                      <span className="me-3"><i className="bi bi-star-fill text-warning me-1"></i>{p.averageRating.toFixed(1)} ({p.totalReviews || 0})</span>
                    )}
                    {p.deliveryAvailable && (
                      <span className="me-3"><i className="bi bi-truck text-info me-1"></i>{p.deliveryFee ? `$${p.deliveryFee}` : 'Free'}</span>
                    )}
                    {p.openTime && (
                      <span><i className="bi bi-clock me-1"></i>{p.openTime.substring(0, 5)} - {p.closeTime?.substring(0, 5)}</span>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => openRequestModal(p)}>
                      <i className="bi bi-chat-square-text me-1"></i>Consult
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showRequestModal && selectedPharmacy && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={() => setShowRequestModal(false)}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Consult {selectedPharmacy.name}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowRequestModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Symptoms <span className="text-danger">*</span></label>
                    <textarea className="form-control" rows="2" placeholder="Describe your symptoms..."
                      value={requestForm.symptoms}
                      onChange={(e) => setRequestForm({ ...requestForm, symptoms: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea className="form-control" rows="2" placeholder="Additional details..."
                      value={requestForm.description}
                      onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Allergies</label>
                    <input type="text" className="form-control" placeholder="List any allergies..."
                      value={requestForm.allergies}
                      onChange={(e) => setRequestForm({ ...requestForm, allergies: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Preferred Delivery</label>
                    <select className="form-select"
                      value={requestForm.preferredDeliveryType}
                      onChange={(e) => setRequestForm({ ...requestForm, preferredDeliveryType: e.target.value })}>
                      <option value="Delivery">Delivery</option>
                      <option value="Pickup">Pickup</option>
                    </select>
                  </div>
                  {prescriptions.length > 0 && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Link Prescriptions (optional)</label>
                      {prescriptions.map((rx) => (
                        <div className="form-check" key={rx.prescriptionHeaderID}>
                          <input className="form-check-input" type="checkbox"
                            checked={requestForm.prescriptionHeaderIds.includes(rx.prescriptionHeaderID)}
                            onChange={(e) => {
                              const ids = e.target.checked
                                ? [...requestForm.prescriptionHeaderIds, rx.prescriptionHeaderID]
                                : requestForm.prescriptionHeaderIds.filter((id) => id !== rx.prescriptionHeaderID);
                              setRequestForm({ ...requestForm, prescriptionHeaderIds: ids });
                            }} />
                          <label className="form-check-label">
                            {rx.doctorName} — {new Date(rx.issueDate).toLocaleDateString()}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>Cancel</button>
                  <button className="btn btn-primary" disabled={submitting} onClick={submitRequest}>
                    {submitting ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function RequestsView({ userId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    pharmacyApi.getConsultationRequestsByPatient(userId)
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Unable to load requests.'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="bi bi-chat-square-text" style={{ fontSize: '3rem' }}></i>
        <p className="mt-2">No consultation requests yet.</p>
      </div>
    );
  }

  return (
    <div className="list-group">
      {requests.map((req) => (
        <div key={req.requestId} className="list-group-item list-group-item-action">
          <div className="d-flex w-100 justify-content-between">
            <h6 className="mb-1">{req.pharmacyName || 'Pharmacy'}</h6>
            <small className="text-muted">{new Date(req.createdAt).toLocaleDateString()}</small>
          </div>
          <p className="mb-1 small">{req.symptoms || req.description || 'No description'}</p>
          <div className="d-flex gap-2 align-items-center">
            <span className={`badge ${req.status === 'CANCELLED' ? 'bg-danger' : req.status === 'ORDER_CREATED' ? 'bg-success' : req.status === 'IN_REVIEW' ? 'bg-info' : 'bg-secondary'}`}>
              {req.status}
            </span>
            {req.pharmacyOrderId && (
              <Link to={`/patient-dashboard/pharmacy/orders/${req.pharmacyOrderId}`} className="small">
                <i className="bi bi-box-seam me-1"></i>View Order
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OrdersView({ userId, navigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    pharmacyApi.getOrdersByPatient(userId)
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Unable to load orders.'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="bi bi-box-seam" style={{ fontSize: '3rem' }}></i>
        <p className="mt-2">No pharmacy orders yet.</p>
      </div>
    );
  }

  const statusBadge = (s) => {
    const map = { PENDING: 'warning', CONFIRMED: 'info', PREPARING: 'primary', READY: 'primary', SHIPPING: 'info', DELIVERED: 'success', COMPLETED: 'success', CANCELLED: 'danger', REFUNDED: 'secondary' };
    return `bg-${map[s] || 'secondary'}`;
  };

  return (
    <div className="list-group">
      {orders.map((o) => (
        <div key={o.orderId} className="list-group-item list-group-item-action"
          onClick={() => navigate(`/patient-dashboard/pharmacy/orders/${o.orderId}`)}
          style={{ cursor: 'pointer' }}>
          <div className="d-flex w-100 justify-content-between align-items-start">
            <div>
              <h6 className="mb-1">{o.orderNumber || `Order #${o.orderId?.substring(0, 8)}`}</h6>
              <p className="mb-1 small text-muted">{o.pharmacyName || 'Pharmacy'}</p>
            </div>
            <div className="text-end">
              <span className={`badge ${statusBadge(o.status)} me-1`}>{o.status}</span>
              {o.paymentStatus && (
                <span className={`badge ${o.paymentStatus === 'PAID' ? 'bg-success' : 'bg-warning'}`}>{o.paymentStatus}</span>
              )}
            </div>
          </div>
          {o.totalAmount != null && (
            <small className="fw-bold">${Number(o.totalAmount).toFixed(2)}</small>
          )}
        </div>
      ))}
    </div>
  );
}

function OrderDetailView({ orderId, userId, navigate }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    pharmacyApi.getOrderById(orderId)
      .then((data) => setOrder(data))
      .catch(() => toast.error('Unable to load order.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await pharmacyApi.cancelOrder(order.orderId, { cancelReason: 'Patient requested cancellation' });
      toast.success('Order cancelled.');
      const data = await pharmacyApi.getOrderById(orderId);
      setOrder(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  const handlePayPal = async () => {
    try {
      const createRes = await paymentApi.createPharmacyOrderPayPalOrder(order.orderId);
      if (!createRes?.approvalUrl) {
        toast.error('Failed to initiate payment.');
        return;
      }
      const popup = window.open('', '_blank', 'width=600,height=700');
      if (popup) {
        popup.document.write(`<html><body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#f5f5f5"><p>Redirecting to PayPal...</p></body></html>`);
        popup.location.href = createRes.approvalUrl;
        const timer = setInterval(async () => {
          if (popup.closed) {
            clearInterval(timer);
            try {
              const data = await pharmacyApi.getOrderById(orderId);
              setOrder(data);
              if (data.paymentStatus === 'PAID') {
                toast.success('Payment successful!');
              }
            } catch { }
          }
        }, 1500);
      } else {
        window.location.href = createRes.approvalUrl;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initiation failed.');
    }
  };

  const statusBadge = (s) => {
    const map = { PENDING: 'warning', CONFIRMED: 'info', PREPARING: 'primary', READY: 'primary', SHIPPING: 'info', DELIVERED: 'success', COMPLETED: 'success', CANCELLED: 'danger', REFUNDED: 'secondary' };
    return map[s] || 'secondary';
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="bi bi-box-seam" style={{ fontSize: '3rem' }}></i>
        <p className="mt-2">Order not found.</p>
        <button className="btn btn-outline-primary" onClick={() => navigate('/patient-dashboard/pharmacy/orders')}>Back to Orders</button>
      </div>
    );
  }

  const needsPayment = order.paymentStatus !== 'PAID' && !['CANCELLED', 'REFUNDED'].includes(order.status);
  const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);

  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/patient-dashboard/pharmacy/orders')}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <h4 className="mb-0">Order {order.orderNumber || `#${orderId?.substring(0, 8)}`}</h4>
        <span className={`badge bg-${statusBadge(order.status)}`}>{order.status}</span>
        {order.paymentStatus && (
          <span className={`badge ${order.paymentStatus === 'PAID' ? 'bg-success' : 'bg-warning'}`}>{order.paymentStatus}</span>
        )}
      </div>

      <div className="row g-4">
        <div className="col-md-8">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h6 className="card-title fw-semibold mb-3">Order Details</h6>
              <table className="table table-sm">
                <tbody>
                  <tr><td className="text-muted">Pharmacy</td><td className="fw-medium">{order.pharmacyName || 'N/A'}</td></tr>
                  <tr><td className="text-muted">Total Amount</td><td className="fw-bold">${Number(order.totalAmount || 0).toFixed(2)}</td></tr>
                  <tr><td className="text-muted">Delivery Type</td><td>{order.deliveryType || 'N/A'}</td></tr>
                  {order.deliveryAddress && <tr><td className="text-muted">Delivery Address</td><td>{order.deliveryAddress}</td></tr>}
                  {order.deliveryFee != null && <tr><td className="text-muted">Delivery Fee</td><td>${Number(order.deliveryFee).toFixed(2)}</td></tr>}
                  <tr><td className="text-muted">Created</td><td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}</td></tr>
                  {order.updatedAt && <tr><td className="text-muted">Updated</td><td>{new Date(order.updatedAt).toLocaleString()}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {order.items && order.items.length > 0 && (
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="card-title fw-semibold mb-3">Items</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Medication</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, i) => (
                        <tr key={i}>
                          <td>{item.medicationName || item.name}</td>
                          <td>{item.quantity}</td>
                          <td>${Number(item.unitPrice || item.price || 0).toFixed(2)}</td>
                          <td>${Number((item.unitPrice || item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-md-4">
          {needsPayment && (
            <div className="card shadow-sm mb-3">
              <div className="card-body text-center">
                <h6 className="fw-semibold mb-3">Payment</h6>
                <p className="small text-muted mb-3">Pay with PayPal to complete your order.</p>
                <button className="btn btn-primary w-100" onClick={handlePayPal}>
                  <i className="bi bi-paypal me-2"></i>Pay with PayPal
                </button>
              </div>
            </div>
          )}

          {canCancel && (
            <div className="card shadow-sm">
              <div className="card-body text-center">
                <h6 className="fw-semibold mb-3 text-danger">Cancel Order</h6>
                <p className="small text-muted mb-3">Cancel this order if you no longer need it.</p>
                <button className="btn btn-outline-danger w-100" disabled={cancelling} onClick={handleCancel}>
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
