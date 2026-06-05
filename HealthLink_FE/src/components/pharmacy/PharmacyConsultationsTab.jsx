import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

import medicineApi from '../../api/medicineApi';
import pharmacyApi from '../../api/pharmacyApi';
import {
  REQUEST_TABS,
  dateTime,
  initials,
  money,
  normalize,
  statusClass,
  useDebouncedValue,
} from './PharmacyShared';

const TIMINGS = ['MORNING', 'AFTERNOON', 'EVENING'];

export default function PharmacyConsultationsTab({ requests, globalSearch, reload }) {
  const [activeStatus, setActiveStatus] = useState('PENDING');
  const [selected, setSelected] = useState(null);
  const deferredSearch = useDebouncedValue(globalSearch);

  const filtered = useMemo(() => requests.filter((request) => {
    const normalized = normalize(request.status);
    const statusMatches = activeStatus === 'CONVERTED'
      ? normalized === 'ORDER_CREATED'
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

        <RequestWorkspace request={selectedRequest} onUpdated={reload} />
      </div>
    </>
  );
}

function RequestWorkspace({ request, onUpdated }) {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setNotes(request?.pharmacyNotes || '');
  }, [request?.requestId, request?.pharmacyNotes, request?.preferredDeliveryType]);

  return (
    <div className="pharmacy-request-workspace">
      <RequestDetailPanel request={request} notes={notes} onNotesChange={setNotes} onUpdated={onUpdated} />
      <PharmacyRequestOrderPanel request={request} onUpdated={onUpdated} />
    </div>
  );
}

function RequestDetailPanel({ request, notes, onNotesChange, onUpdated }) {
  const { initiateCall } = useAuth();
  const { openChatWith } = useChat();

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
    const confirmMessages = {
      IN_REVIEW: 'Accept this consultation request?',
      CANCELLED: 'Reject this consultation request? This action cannot be undone.',
      NEED_MORE_INFO: 'Mark this request as needing more information?',
    };
    if (confirmMessages[status] && !window.confirm(confirmMessages[status])) return;

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

  const status = normalize(request.status);
  const canManuallyUpdate = !['ORDER_CREATED', 'CANCELLED'].includes(status);

  return (
    <aside className="pharmacy-request-detail">
      <div className="pharmacy-request-detail-header">
        <div className="pharmacy-request-avatar is-large">{initials(request.patientName || 'PT')}</div>
        <div>
          <h2>{request.patientName || 'Unknown patient'}</h2>
          <p>ID: #{request.requestId} - <span className={`pharmacy-status ${statusClass(request.status)}`}>{request.status}</span></p>
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
        <textarea onChange={(event) => onNotesChange(event.target.value)} value={notes} />
      </label>

      {canManuallyUpdate && (
        <div className="pharmacy-request-actions">
          <button onClick={() => updateStatus('IN_REVIEW')} type="button">Accept Request</button>
          <button onClick={() => updateStatus('NEED_MORE_INFO')} type="button">Need More Info</button>
          <button className="danger" onClick={() => updateStatus('CANCELLED')} type="button">Reject</button>
        </div>
      )}

      {!['PENDING', 'CANCELLED'].includes(status) && (
        <div className="pharmacy-request-actions">
          <button
            type="button"
            onClick={() => openChatWith({ uid: request.patientId, displayName: request.patientName })}
          >
            <i className="bi bi-chat-dots-fill me-1"></i> Chat
          </button>
          <button
            type="button"
            onClick={() => {
              const roomId = request.chatRoomId || Array.from({ length: 45 }, () =>
                'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
              ).join('');
              initiateCall(request.patientId, roomId, request.patientName, 'Pharmacy');
            }}
          >
            <i className="bi bi-camera-video-fill me-1"></i> Video Call
          </button>
        </div>
      )}
    </aside>
  );
}

function PharmacyRequestOrderPanel({ request, onUpdated }) {
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [deliveryType, setDeliveryType] = useState('Delivery');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [pharmacistNotes, setPharmacistNotes] = useState('');
  const [medicineQuery, setMedicineQuery] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [draft, setDraft] = useState(defaultDraft());
  const [items, setItems] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  useEffect(() => {
    setDeliveryType(request?.preferredDeliveryType || 'Delivery');
    setPaymentMethod('Cash');
    setPharmacistNotes(request?.pharmacyNotes || '');
    setMedicineQuery('');
    setMedicines([]);
    setSelectedMedicine(null);
    setDraft(defaultDraft());
    setItems([]);
    setPrescriptions([]);

    if (!request?.requestId) return;

    let alive = true;
    setLoadingPrescriptions(true);
    pharmacyApi.getRequestPrescriptions(request.requestId)
      .then((data) => {
        if (alive) setPrescriptions(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (alive) {
          console.error('Request prescriptions load failed', error);
          setPrescriptions([]);
        }
      })
      .finally(() => {
        if (alive) setLoadingPrescriptions(false);
      });

    return () => {
      alive = false;
    };
  }, [request?.requestId, request?.pharmacyNotes]);

  useEffect(() => {
    if (!selectedMedicine) return;
    setDraft((current) => ({
      ...current,
      unit: current.unit || selectedMedicine.unit || 'unit',
      unitPrice: current.unitPrice || String(selectedMedicine.price || 0),
    }));
  }, [selectedMedicine]);

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
    return null;
  }

  const status = normalize(request.status);
  const canCreateOrder = !['ORDER_CREATED', 'CANCELLED'].includes(status);
  const orderTotal = items.reduce((sum, item) => sum + lineTotal(item), 0);

  const addMedicine = () => {
    if (!selectedMedicine) {
      toast.error('Please select a medicine.');
      return;
    }
    const medicineId = selectedMedicine.medicineId || selectedMedicine.id;
    if (!medicineId) {
      toast.error('Selected medicine is missing an ID.');
      return;
    }
    setItems((current) => [
      ...current,
      {
        localId: `${Date.now()}-${medicineId}`,
        medicineId,
        medicationName: selectedMedicine.name || selectedMedicine.medicineName || `Medicine #${medicineId}`,
        totalSupplyDays: Number(draft.totalSupplyDays || 1),
        quantity: Number(draft.quantity || 1),
        unit: draft.unit || selectedMedicine.unit || 'unit',
        frequency: draft.frequency,
        timing: draft.timing,
        route: draft.route,
        unitPrice: Number(draft.unitPrice || selectedMedicine.price || 0),
        notes: draft.notes,
      },
    ]);
    setMedicineQuery('');
    setMedicines([]);
    setSelectedMedicine(null);
    setDraft(defaultDraft());
  };

  const importPrescription = (prescription) => {
    const sourceItems = prescription.items || prescription.medications || [];
    if (!sourceItems.length) {
      toast.error('This prescription has no medications to import.');
      return;
    }

    const prescriptionId = prescription.prescriptionHeaderId || prescription.prescriptionHeaderID;
    const imported = sourceItems.map((item) => ({
      localId: `${Date.now()}-${prescriptionId}-${item.prescriptionItemId || item.prescriptionItemID || Math.random()}`,
      medicineId: item.medicineId,
      medicationName: item.medicationName || item.name || `Medicine #${item.medicineId}`,
      totalSupplyDays: Number(item.totalSupplyDays || 1),
      quantity: Number(item.quantity || 1),
      unit: item.unit || 'unit',
      frequency: item.frequency || '',
      timing: item.timing || (Array.isArray(item.timings) ? item.timings.join(',') : ''),
      route: item.route || '',
      unitPrice: Number(item.unitPrice || 0),
      notes: item.notes || '',
      sourcePrescriptionHeaderId: prescriptionId,
      sourcePrescriptionItemId: item.prescriptionItemId || item.prescriptionItemID,
    }));
    setItems((current) => [...current, ...imported]);
    toast.success('Medication list imported.');
  };

  const updateItem = (localId, field, value) => {
    setItems((current) => current.map((item) => (
      item.localId === localId ? { ...item, [field]: value } : item
    )));
  };

  const removeItem = (localId) => {
    setItems((current) => current.filter((item) => item.localId !== localId));
  };

  const createOrder = async (event) => {
    event.preventDefault();
    if (!items.length) {
      toast.error('Add at least one medication.');
      return;
    }
    setCreatingOrder(true);
    try {
      await pharmacyApi.createOrderFromRequest(request.requestId, {
        deliveryType,
        paymentMethod,
        notes: request.additionalNotes,
        pharmacistNotes,
        items: items.map(toOrderItemPayload),
      });
      toast.success('Order created from request.');
      setItems([]);
      await onUpdated();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create order.');
    } finally {
      setCreatingOrder(false);
    }
  };

  return (
    <aside className="pharmacy-request-order-panel">
      <div className="pharmacy-request-order-header">
        <div>
          <h3>Order Medication List</h3>
          <p>{items.length} item{items.length === 1 ? '' : 's'} - {money(orderTotal)}</p>
        </div>
      </div>

      {!canCreateOrder ? (
        <div className="pharmacy-empty compact">
          <span className="material-symbols-outlined">inventory_2</span>
          <h3>{status === 'ORDER_CREATED' ? 'Order created' : 'Request closed'}</h3>
          <p>{request.pharmacyOrderId ? `Order #${request.pharmacyOrderId}` : 'No new order can be created from this request.'}</p>
        </div>
      ) : (
        <form className="pharmacy-request-order-form" onSubmit={createOrder}>
          <section className="pharmacy-order-import">
            <h4>Prescriptions Sent With Request</h4>
            {loadingPrescriptions ? (
              <p className="pharmacy-muted">Loading request prescriptions...</p>
            ) : prescriptions.length ? (
              <div className="pharmacy-prescription-import-list">
                {prescriptions.map((prescription) => (
                  <button
                    key={prescription.prescriptionHeaderId || prescription.prescriptionHeaderID}
                    onClick={() => importPrescription(prescription)}
                    type="button"
                  >
                    <strong>#{prescription.prescriptionHeaderId || prescription.prescriptionHeaderID}</strong>
                    <span>{prescriptionRequestLabel(prescription)} - {dateTime(prescription.issueDate)}</span>
                    <small>{(prescription.items || prescription.medications || []).length} meds</small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="pharmacy-muted">No prescriptions were sent with this request.</p>
            )}
          </section>

          <section className="pharmacy-order-manual">
            <h4>Add Medicine</h4>
            <input onChange={(event) => setMedicineQuery(event.target.value)} placeholder="Search medicine..." value={medicineQuery} />
            {medicines.length > 0 && (
              <div className="pharmacy-medicine-results">
                {medicines.slice(0, 6).map((medicine) => (
                  <button
                    key={medicine.medicineId || medicine.id || medicine.name}
                    onClick={() => setSelectedMedicine(medicine)}
                    type="button"
                  >
                    {medicine.name || medicine.medicineName || `Medicine #${medicine.medicineId || medicine.id}`}
                  </button>
                ))}
              </div>
            )}
            {selectedMedicine && (
              <small>Selected: {selectedMedicine.name || selectedMedicine.medicineName}</small>
            )}
            <div className="pharmacy-order-draft-grid">
              <input min="1" onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} placeholder="Quantity" type="number" value={draft.quantity} />
              <input min="1" onChange={(event) => setDraft({ ...draft, totalSupplyDays: event.target.value })} placeholder="Days" type="number" value={draft.totalSupplyDays} />
              <input onChange={(event) => setDraft({ ...draft, unit: event.target.value })} placeholder="Unit" value={draft.unit} />
              <input min="0" onChange={(event) => setDraft({ ...draft, unitPrice: event.target.value })} placeholder="Unit price" step="0.01" type="number" value={draft.unitPrice} />
              <input onChange={(event) => setDraft({ ...draft, frequency: event.target.value })} placeholder="Frequency" value={draft.frequency} />
              <select onChange={(event) => setDraft({ ...draft, timing: event.target.value })} value={draft.timing}>
                <option value="">Timing</option>
                {TIMINGS.map((timing) => <option key={timing} value={timing}>{timing}</option>)}
              </select>
              <input onChange={(event) => setDraft({ ...draft, route: event.target.value })} placeholder="Route" value={draft.route} />
              <input onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Notes" value={draft.notes} />
            </div>
            <button className="secondary" onClick={addMedicine} type="button">Add Medicine</button>
          </section>

          <section className="pharmacy-order-item-list">
            {items.length ? items.map((item) => (
              <div className="pharmacy-order-item-card" key={item.localId}>
                <div>
                  <strong>{item.medicationName}</strong>
                  <button onClick={() => removeItem(item.localId)} type="button">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="pharmacy-order-draft-grid">
                  <input min="1" onChange={(event) => updateItem(item.localId, 'quantity', event.target.value)} type="number" value={item.quantity} />
                  <input min="1" onChange={(event) => updateItem(item.localId, 'totalSupplyDays', event.target.value)} type="number" value={item.totalSupplyDays} />
                  <input onChange={(event) => updateItem(item.localId, 'unit', event.target.value)} value={item.unit} />
                  <input min="0" onChange={(event) => updateItem(item.localId, 'unitPrice', event.target.value)} step="0.01" type="number" value={item.unitPrice} />
                </div>
                <small>{item.frequency || 'As directed'} {item.timing ? `- ${item.timing}` : ''} - {money(lineTotal(item))}</small>
              </div>
            )) : (
              <div className="pharmacy-empty compact">
                <span className="material-symbols-outlined">medication</span>
                <h3>No medications</h3>
                <p>Add medicine manually or import prescriptions sent with this request.</p>
              </div>
            )}
          </section>

          <section className="pharmacy-order-checkout">
            <select onChange={(event) => setDeliveryType(event.target.value)} value={deliveryType}>
              <option value="Delivery">Delivery</option>
              <option value="Pickup">Pickup</option>
            </select>
            <select onChange={(event) => setPaymentMethod(event.target.value)} value={paymentMethod}>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="EWallet">E-Wallet</option>
            </select>
            <textarea onChange={(event) => setPharmacistNotes(event.target.value)} placeholder="Pharmacist notes" value={pharmacistNotes} />
            <button disabled={creatingOrder || !items.length} type="submit">
              {creatingOrder ? 'Creating...' : `Create Order - ${money(orderTotal)}`}
            </button>
          </section>
        </form>
      )}
    </aside>
  );
}

function defaultDraft() {
  return {
    quantity: 1,
    totalSupplyDays: 1,
    unit: '',
    frequency: 'As directed',
    timing: '',
    route: '',
    unitPrice: '',
    notes: '',
  };
}

function lineTotal(item) {
  return Number(item.quantity || 0) * Number(item.unitPrice || 0);
}

function toOrderItemPayload(item) {
  return {
    medicineId: item.medicineId,
    totalSupplyDays: Number(item.totalSupplyDays || 1),
    quantity: Number(item.quantity || 1),
    unit: item.unit || undefined,
    frequency: item.frequency || undefined,
    timing: item.timing || undefined,
    route: item.route || undefined,
    unitPrice: Number(item.unitPrice || 0),
    notes: item.notes || undefined,
    sourcePrescriptionHeaderId: item.sourcePrescriptionHeaderId,
    sourcePrescriptionItemId: item.sourcePrescriptionItemId,
  };
}

function prescriptionRequestLabel(prescription) {
  return normalize(prescription.status) || 'Shared';
}
