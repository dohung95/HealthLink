import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import medicineApi from '../../../api/medicineApi';
import pharmacyApi from '../../../api/pharmacyApi';
import {
  PageHeader,
  REQUEST_TABS,
  dateTime,
  initials,
  normalize,
  statusClass,
  useDebouncedValue,
} from '../common/pharmacyDashboardShared';

export default function PharmacyConsultationsTab({ requests, globalSearch, reload }) {
  const [activeStatus, setActiveStatus] = useState('PENDING');
  const [selected, setSelected] = useState(null);
  const deferredSearch = useDebouncedValue(globalSearch);

  const filtered = useMemo(() => requests.filter((request) => {
    const normalized = normalize(request.status);
    const statusMatches = activeStatus === 'CONVERTED'
      ? ['PRESCRIPTION_CREATED', 'ORDER_CREATED'].includes(normalized)
      : normalized === activeStatus;
    const text = [request.patientName, request.symptoms, request.description, request.allergies, request.additionalNotes]
      .join(' ')
      .toLowerCase();
    return statusMatches && (!deferredSearch || text.includes(deferredSearch.toLowerCase()));
  }), [requests, activeStatus, deferredSearch]);

  const selectedRequest = filtered.some((request) => request.requestId === selected?.requestId)
    ? selected
    : filtered[0] || null;

  return (
    <>
      <PageHeader
        title="Consultation Requests"
        description="Manage incoming patient queries and virtual consults."
      />

      <div className="pharmacy-request-tabs">
        {REQUEST_TABS.map((tab) => (
          <button className={activeStatus === tab.key ? 'active' : ''} key={tab.key} onClick={() => setActiveStatus(tab.key)} type="button">
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pharmacy-consult-grid">
        <section className="pharmacy-request-list">
          {filtered.length ? filtered.map((request) => (
            <button
              className={`pharmacy-request-card ${selectedRequest?.requestId === request.requestId ? 'active' : ''}`}
              key={request.requestId}
              onClick={() => setSelected(request)}
              type="button"
            >
              <div>
                <div className="pharmacy-request-avatar">{initials(request.patientName || 'PT')}</div>
                <div>
                  <h3>{request.patientName || 'Unknown patient'}</h3>
                  <p>{dateTime(request.createdAt)}</p>
                </div>
              </div>
              <span className={`pharmacy-status ${statusClass(request.status)}`}>{request.status}</span>
              <p>{request.description || request.symptoms || 'No description provided.'}</p>
            </button>
          )) : (
            <div className="pharmacy-empty">
              <span className="material-symbols-outlined">support_agent</span>
              <h3>No consultation requests</h3>
              <p>Requests matching this tab will appear here.</p>
            </div>
          )}
        </section>

        <RequestDetailPanel request={selectedRequest} onUpdated={reload} />
      </div>
    </>
  );
}

function RequestDetailPanel({ request, onUpdated }) {
  const [notes, setNotes] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderAmount, setOrderAmount] = useState('');
  const [deliveryType, setDeliveryType] = useState('Delivery');
  const [medicineQuery, setMedicineQuery] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');

  useEffect(() => {
    setNotes(request?.pharmacyNotes || '');
    setDiagnosis('');
    setSelectedMedicine(null);
    setMedicineQuery('');
  }, [request?.requestId]);

  useEffect(() => {
    if (!medicineQuery.trim()) {
      setMedicines([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const data = await medicineApi.searchMedicines(medicineQuery.trim());
        setMedicines(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Medicine search failed', error);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [medicineQuery]);

  if (!request) {
    return (
      <aside className="pharmacy-request-detail">
        <div className="pharmacy-empty">
          <span className="material-symbols-outlined">touch_app</span>
          <h3>Select a request</h3>
          <p>Request details will appear here.</p>
        </div>
      </aside>
    );
  }

  const updateStatus = async (status) => {
    try {
      await pharmacyApi.updateConsultationStatus(request.requestId, {
        status,
        pharmacyNotes: notes,
      });
      toast.success('Consultation request updated.');
      await onUpdated();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update request.');
    }
  };

  const createOrder = async (event) => {
    event.preventDefault();
    setCreatingOrder(true);
    try {
      await pharmacyApi.createOrderFromRequest(request.requestId, {
        medicineAmount: Number(orderAmount || 0),
        deliveryType,
        paymentMethod: 'Cash',
        notes: request.additionalNotes,
        pharmacistNotes: notes,
      });
      toast.success('Order created from request.');
      setOrderAmount('');
      await onUpdated();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create order.');
    } finally {
      setCreatingOrder(false);
    }
  };

  const createPrescription = async (event) => {
    event.preventDefault();
    if (!selectedMedicine) {
      toast.error('Please select a medicine.');
      return;
    }
    try {
      await pharmacyApi.createPrescriptionFromRequest(request.requestId, {
        diagnosis: diagnosis || request.symptoms || 'Pharmacy consultation',
        notes,
        items: [{
          medicineId: selectedMedicine.medicineId || selectedMedicine.id,
          totalSupplyDays: 1,
          quantity: Number(quantity || 1),
          unit: selectedMedicine.unit || 'unit',
          frequency: 'As directed',
          unitPrice: Number(unitPrice || selectedMedicine.price || 0),
          notes,
        }],
      });
      toast.success('Prescription created from request.');
      setPrescriptionOpen(false);
      await onUpdated();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create prescription.');
    }
  };

  const status = normalize(request.status);
  const canManuallyUpdate = !['PRESCRIPTION_CREATED', 'ORDER_CREATED', 'CANCELLED'].includes(status);

  return (
    <aside className="pharmacy-request-detail">
      <div className="pharmacy-request-detail-header">
        <div className="pharmacy-request-avatar is-large">{initials(request.patientName || 'PT')}</div>
        <div>
          <h2>{request.patientName || 'Unknown patient'}</h2>
          <p>ID: #{request.requestId} · <span className={`pharmacy-status ${statusClass(request.status)}`}>{request.status}</span></p>
        </div>
      </div>

      <div className="pharmacy-detail-block">
        <h3>Consultation Request</h3>
        <p>{request.description || request.symptoms || 'No description provided.'}</p>
        <div className="pharmacy-chip-row">
          {request.symptoms && <span>Symptoms: {request.symptoms}</span>}
          {request.preferredDeliveryType && <span>{request.preferredDeliveryType}</span>}
          {request.allergies && <span className="danger">Allergies: {request.allergies}</span>}
        </div>
      </div>

      {request.attachments?.length ? (
        <div className="pharmacy-detail-block">
          <h3>Attachments</h3>
          {request.attachments.map((item) => <a href={item} key={item} rel="noreferrer" target="_blank">{item}</a>)}
        </div>
      ) : null}

      <label className="pharmacy-field">
        Pharmacy Notes
        <textarea onChange={(event) => setNotes(event.target.value)} value={notes} />
      </label>

      {canManuallyUpdate && (
        <div className="pharmacy-request-actions">
          <button onClick={() => updateStatus('IN_REVIEW')} type="button">Accept Request</button>
          <button onClick={() => updateStatus('NEED_MORE_INFO')} type="button">Need More Info</button>
          <button className="danger" onClick={() => updateStatus('CANCELLED')} type="button">Reject</button>
        </div>
      )}

      <form className="pharmacy-inline-form" onSubmit={createOrder}>
        <h3>Create Direct Order</h3>
        <input min="0" onChange={(event) => setOrderAmount(event.target.value)} placeholder="Medicine amount" step="0.01" type="number" value={orderAmount} />
        <select onChange={(event) => setDeliveryType(event.target.value)} value={deliveryType}>
          <option value="Delivery">Delivery</option>
          <option value="Pickup">Pickup</option>
        </select>
        <button disabled={creatingOrder} type="submit">{creatingOrder ? 'Creating...' : 'Create Order'}</button>
      </form>

      <div className="pharmacy-inline-form">
        <button className="secondary" onClick={() => setPrescriptionOpen((open) => !open)} type="button">
          {prescriptionOpen ? 'Hide Prescription Form' : 'Create Prescription'}
        </button>
        {prescriptionOpen && (
          <form onSubmit={createPrescription}>
            <input onChange={(event) => setDiagnosis(event.target.value)} placeholder="Diagnosis" value={diagnosis} />
            <input onChange={(event) => setMedicineQuery(event.target.value)} placeholder="Search medicine..." value={medicineQuery} />
            {medicines.length > 0 && (
              <div className="pharmacy-medicine-results">
                {medicines.slice(0, 6).map((medicine) => (
                  <button key={medicine.medicineId || medicine.id || medicine.name} onClick={() => setSelectedMedicine(medicine)} type="button">
                    {medicine.name || medicine.medicineName || `Medicine #${medicine.medicineId || medicine.id}`}
                  </button>
                ))}
              </div>
            )}
            {selectedMedicine && <small>Selected: {selectedMedicine.name || selectedMedicine.medicineName}</small>}
            <input min="1" onChange={(event) => setQuantity(event.target.value)} placeholder="Quantity" type="number" value={quantity} />
            <input min="0" onChange={(event) => setUnitPrice(event.target.value)} placeholder="Unit price" step="0.01" type="number" value={unitPrice} />
            <button type="submit">Create Prescription</button>
          </form>
        )}
      </div>
    </aside>
  );
}
