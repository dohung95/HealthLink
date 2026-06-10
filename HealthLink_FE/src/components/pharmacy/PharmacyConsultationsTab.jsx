import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

import medicineApi from '../../api/medicineApi';
import pharmacyApi from '../../api/pharmacyApi';
import {
  Detail,
  Modal,
  ORDER_FLOW,
  dateTime,
  initials,
  money,
  normalize,
  statusClass,
  titleCase,
  useDebouncedValue,
} from './PharmacyShared';

const VALID_TIMINGS = new Set(['MORNING', 'AFTERNOON', 'EVENING']);

function normalizeTimingForPayload(rawTiming) {
  if (!rawTiming) return '';
  const tokens = String(rawTiming)
    .split(',')
    .map((token) => token.trim().toUpperCase())
    .filter((token) => VALID_TIMINGS.has(token));
  return [...new Set(tokens)].join(',');
}

function normalizeTimingWithNotesFallback(item) {
  const rawTiming = getTimingText(item);
  const normalized = normalizeTimingForPayload(rawTiming);
  const rawTokens = String(rawTiming)
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  const invalidTokens = rawTokens.filter(
    (token) => !VALID_TIMINGS.has(token.trim().toUpperCase()),
  );
  const existingNotes = item.notes || item.instructions || '';
  if (invalidTokens.length > 0 && !normalized) {
    const timingNote = `Timing note: ${invalidTokens.join(', ')}`;
    return {
      timing: '',
      notes: existingNotes
        ? `${existingNotes}\n${timingNote}`
        : timingNote,
    };
  }
  return {
    timing: normalized,
    notes: existingNotes,
  };
}

const TIMING_OPTIONS = [
  { value: 'MORNING', label: 'Morning', icon: 'bi-sunrise' },
  { value: 'AFTERNOON', label: 'Afternoon', icon: 'bi-sun' },
  { value: 'EVENING', label: 'Evening', icon: 'bi-moon' },
];

const LIBRARY_FILTERS = [
  { key: 'brandName', label: 'Brand Name' },
  { key: 'genericName', label: 'Generic Name' },
  { key: 'dosageForm', label: 'Dosage Form' },
  { key: 'manufacturer', label: 'Manufacturer' },
];

const WORKFLOW_TABS = [
  { key: 'NEW_REQUEST', label: 'New Requests' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'AWAITING_PATIENT_CONFIRMATION', label: 'Awaiting Patient' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY_SHIPPING', label: 'Ready / Shipping' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const WORKSPACE_TABS = [
  { key: 'details', label: 'Details' },
  { key: 'prescription', label: 'Prescription' },
  { key: 'order', label: 'Order' },
];

function getWorkFlowStageTab(stage) {
  if (stage === 'READY' || stage === 'SHIPPING') return 'READY_SHIPPING';
  return stage;
}

function getNextActionHint(item) {
  const actions = item.availableActions || [];
  if (actions.includes('ACCEPT_REQUEST')) return 'Accept request';
  if (actions.includes('CREATE_ORDER')) return 'Create order';
  if (actions.includes('UPDATE_ORDER_STATUS')) {
    if (item.orderStatus === 'PREPARING') return 'Mark ready';
    if (item.orderStatus === 'READY') return 'Mark delivered';
    if (item.orderStatus === 'SHIPPING') return 'Mark delivered';
    if (item.orderStatus === 'DELIVERED') return 'Mark completed';
    return 'Update status';
  }
  if (actions.includes('CANCEL_ORDER')) return 'Cancel order';
  if (item.workflowStage === 'AWAITING_PATIENT_CONFIRMATION') return 'Waiting for patient confirmation';
  if (item.workflowStage === 'AWAITING_PAYMENT') return 'Waiting for payment';
  return 'View details';
}

export default function PharmacyConsultationsTab({ workItems, requests, globalSearch, reload, profile }) {
  const [activeTabKey, setActiveTabKey] = useState('NEW_REQUEST');
  const [selected, setSelected] = useState(null);
  const deferredSearch = useDebouncedValue(globalSearch);

  const items = useMemo(() => {
    if (Array.isArray(workItems) && workItems.length) return workItems;
    return (requests || []).map((r) => ({
      requestId: r.requestId,
      workItemId: 'REQ-' + r.requestId,
      workflowStage: r.status === 'ORDER_CREATED' ? 'AWAITING_PAYMENT'
        : r.status === 'IN_REVIEW' ? 'CONSULTING'
        : r.status === 'NEED_MORE_INFO' ? 'CONSULTING'
        : r.status === 'CANCELLED' ? 'CANCELLED'
        : 'NEW_REQUEST',
      availableActions: [],
      patientId: r.patientId,
      patientName: r.patientName,
      symptoms: r.symptoms,
      description: r.description,
      allergies: r.allergies,
      attachments: r.attachments,
      additionalNotes: r.additionalNotes,
      preferredDeliveryType: r.preferredDeliveryType,
      requestStatus: r.status,
      chatRoomId: r.chatRoomId,
      pharmacyNotes: r.pharmacyNotes,
      patientFollowUpNotes: r.patientFollowUpNotes,
      prescriptionHeaderIds: r.prescriptionHeaderIds,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      orderId: r.pharmacyOrderId,
      orderStatus: null,
      paymentStatus: null,
      totalAmount: null,
      itemCount: null,
    }));
  }, [workItems, requests]);

  const filtered = useMemo(() => {
    const normalizedQuery = deferredSearch ? deferredSearch.toLowerCase() : '';
    return items.filter((item) => {
      const stageMatches = getWorkFlowStageTab(item.workflowStage) === activeTabKey
        || (activeTabKey === 'ALL' && item.workflowStage);
      const text = [item.patientName, item.symptoms, item.description, item.orderNumber]
        .join(' ')
        .toLowerCase();
      return stageMatches && (!normalizedQuery || text.includes(normalizedQuery));
    });
  }, [items, activeTabKey, deferredSearch]);

  const selectedItem = filtered.some((item) => item.workItemId === selected?.workItemId)
    ? selected
    : filtered[0] || null;

  return (
    <div className="pharmacy-consult-grid">
      <div className="pharmacy-request-rail">
        <div className="pharmacy-request-tabs">
          {WORKFLOW_TABS.map((tab) => (
            <button className={activeTabKey === tab.key ? 'active' : ''} key={tab.key} onClick={() => setActiveTabKey(tab.key)} type="button">
              {tab.label}
            </button>
          ))}
        </div>

        <section className="pharmacy-request-list">
          {filtered.length ? filtered.map((item) => (
            <button
              className={`pharmacy-request-card ${selectedItem?.workItemId === item.workItemId ? 'active' : ''}`}
              key={item.workItemId}
              onClick={() => setSelected(item)}
              type="button"
            >
              <div className="pharmacy-request-card-row">
                <div className="pharmacy-request-avatar">{initials(item.patientName || 'PT')}</div>
                <div className="pharmacy-request-card-info">
                  <h3>{item.patientName || 'Unknown patient'}</h3>
                  <span className="pharmacy-request-card-time">{dateTime(item.createdAt)}</span>
                </div>
                <span className={`pharmacy-status ${statusClass(item.workflowStage)}`}>{item.workflowStage}</span>
              </div>
              <p className="pharmacy-request-card-desc">{item.description || item.symptoms || 'No description provided.'}</p>
              <small className="pharmacy-next-action-hint">{getNextActionHint(item)}</small>
            </button>
          )) : (
            <div className="pharmacy-empty">
              <span className="material-symbols-outlined">support_agent</span>
              <h3>No consultation requests</h3>
              <p>Requests matching this tab will appear here.</p>
            </div>
          )}
        </section>
      </div>

      <section className="pharmacy-workspace-column">
        <WorkItemWorkspace item={selectedItem} onUpdated={reload} profile={profile} />
      </section>
    </div>
  );
}

function WorkspaceTabs({ active, onChange }) {
  return (
    <div className="pharmacy-workspace-tabs">
      {WORKSPACE_TABS.map((tab) => (
        <button
          className={active === tab.key ? 'active' : ''}
          key={tab.key}
          onClick={() => onChange(tab.key)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function WorkItemWorkspace({ item, onUpdated, profile }) {
  const [notes, setNotes] = useState('');
  const [workspaceTab, setWorkspaceTab] = useState('details');
  const [activeModal, setActiveModal] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [pendingMedicine, setPendingMedicine] = useState(null);
  const [recentMedicineIds, setRecentMedicineIds] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  const requestId = item?.requestId;
  const isOrderExisting = !!item?.orderId;
  const actions = item?.availableActions || [];

  useEffect(() => {
    setNotes(item?.pharmacyNotes || '');
  }, [requestId, item?.pharmacyNotes]);

  useEffect(() => {
    setOrderItems([]);
    setPendingMedicine(null);
    setRecentMedicineIds([]);
  }, [requestId]);

  useEffect(() => {
    if (!requestId) {
      setPrescriptions([]);
      setLoadingPrescriptions(false);
      return undefined;
    }

    let alive = true;
    setLoadingPrescriptions(true);
    pharmacyApi.getRequestPrescriptions(requestId)
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
  }, [requestId]);

  const importedItemKeys = useMemo(
    () => new Set(orderItems.map((oi) => oi.sourcePrescriptionItemKey).filter(Boolean)),
    [orderItems],
  );

  const selectedMedicineIds = useMemo(
    () => new Set(orderItems.map((oi) => oi.medicineId).filter(Boolean)),
    [orderItems],
  );

  const importOrderItems = (mappedItems) => {
    if (!mappedItems.length) {
      toast.error('This prescription has no medications to import.');
      return;
    }

    const existingKeys = new Set(orderItems.map((oi) => oi.sourcePrescriptionItemKey).filter(Boolean));
    const imported = mappedItems.filter((oi) => !oi.sourcePrescriptionItemKey || !existingKeys.has(oi.sourcePrescriptionItemKey));
    const skipped = mappedItems.length - imported.length;

    if (!imported.length) {
      toast.info('All medications from this prescription are already in the order.');
      setWorkspaceTab('order');
      return;
    }

    setOrderItems((current) => [...current, ...imported]);
    setWorkspaceTab('order');
    toast.success(`${imported.length} medication${imported.length === 1 ? '' : 's'} imported${skipped ? `, ${skipped} skipped` : ''}.`);
  };

  const handleImportPrescription = (prescription) => {
    importOrderItems(mapPrescriptionToOrderItems(prescription));
  };

  const handleImportAllPrescriptions = () => {
    importOrderItems(prescriptions.flatMap(mapPrescriptionToOrderItems));
  };

  const handleSelectMedicine = (medicine) => {
    setPendingMedicine(medicine);
    setRecentMedicineIds((currentIds) => [
      medicine.medicineId,
      ...currentIds.filter((id) => id !== medicine.medicineId),
    ].filter(Boolean).slice(0, 5));
    setActiveModal(null);
  };

  if (!item) {
    return (
      <aside className="pharmacy-request-workspace">
        <div className="pharmacy-empty">
          <span className="material-symbols-outlined">touch_app</span>
          <h3>Select a request</h3>
          <p>Request details will appear here.</p>
        </div>
      </aside>
    );
  }

  return (
    <div className="pharmacy-request-workspace">
      <WorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} />

      {workspaceTab === 'details' && (
        <WorkItemDetailPanel
          actions={actions}
          item={item}
          notes={notes}
          onNotesChange={setNotes}
          onUpdated={onUpdated}
          onOpenAttachments={() => setActiveModal('attachments')}
        />
      )}

      {workspaceTab === 'prescription' && (
        <RequestPrescriptionPanel
          importedItemKeys={importedItemKeys}
          loading={loadingPrescriptions}
          onImportAll={handleImportAllPrescriptions}
          onImportPrescription={handleImportPrescription}
          prescriptions={prescriptions}
        />
      )}

      {workspaceTab === 'order' && (
        isOrderExisting ? (
          <ExistingOrderPanel item={item} onUpdated={onUpdated} />
        ) : (
          <PharmacyRequestOrderPanel
            items={orderItems}
            onConsumePendingMedicine={() => setPendingMedicine(null)}
            onOpenMedicineSearch={() => setActiveModal('medicine')}
            onUpdated={onUpdated}
            pendingMedicine={pendingMedicine}
            profile={profile}
            request={item}
            setItems={setOrderItems}
          />
        )
      )}

      {activeModal === 'attachments' && (
        <RequestAttachmentsModal
          attachments={item.attachments}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'medicine' && (
        <MedicineLibraryModal
          onClose={() => setActiveModal(null)}
          onSelect={handleSelectMedicine}
          recentMedicineIds={recentMedicineIds}
          selectedMedicineIds={selectedMedicineIds}
        />
      )}
    </div>
  );
}

function WorkItemDetailPanel({ actions, item, notes, onNotesChange, onUpdated, onOpenAttachments }) {
  const { initiateCall } = useAuth();
  const { openChatWith } = useChat();

  const hasAction = (action) => actions.includes(action);

  const updateStatus = async (status) => {
    const confirmMessages = {
      IN_REVIEW: 'Accept this consultation request?',
      CANCELLED: 'Reject this consultation request? This action cannot be undone.',
    };
    if (confirmMessages[status] && !window.confirm(confirmMessages[status])) return;

    try {
      await pharmacyApi.updateConsultationStatus(item.requestId, {
        status,
        pharmacyNotes: notes,
      });
      toast.success('Consultation request updated.');
      await onUpdated();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update request.');
    }
  };

  const attachments = item.attachments || [];
  const attachmentCount = attachments.length;

  return (
    <aside className="pharmacy-request-detail">
      <div className="pharmacy-request-detail-header">
        <div className="pharmacy-request-avatar is-large">{initials(item.patientName || 'PT')}</div>
        <div>
          <h2>{item.patientName || 'Unknown patient'}</h2>
          <p>ID: #{item.requestId} - <span className={`pharmacy-status ${statusClass(item.workflowStage)}`}>{item.workflowStage}</span></p>
        </div>
      </div>

      <div className="pharmacy-detail-block">
        <h3>Consultation Request</h3>
        <p>{item.description || item.symptoms || 'No description provided.'}</p>
        <div className="pharmacy-chip-row">
          {item.symptoms && <span>Symptoms: {item.symptoms}</span>}
          {item.preferredDeliveryType && <span>{item.preferredDeliveryType}</span>}
          {item.allergies && <span className="danger">Allergies: {item.allergies}</span>}
        </div>
      </div>

      {item.orderId && (
        <div className="pharmacy-detail-block">
          <h3>Order</h3>
          <p>Order #{item.orderNumber || item.orderId} - <span className={`pharmacy-status ${statusClass(item.orderStatus)}`}>{item.orderStatus}</span></p>
          <div className="pharmacy-chip-row">
            {item.paymentStatus && <span>Payment: {item.paymentStatus}</span>}
            {item.totalAmount != null && <span>Total: {money(item.totalAmount)}</span>}
            {item.itemCount != null && <span>{item.itemCount} item{item.itemCount === 1 ? '' : 's'}</span>}
          </div>
        </div>
      )}

      {attachmentCount > 0 && (
        <div className="pharmacy-detail-block">
          <div className="pharmacy-attachment-summary">
            <span className="material-symbols-outlined">attach_file</span>
            <span>{attachmentCount} attachment{attachmentCount === 1 ? '' : 's'}</span>
            <button className="pharmacy-text-btn" onClick={onOpenAttachments} type="button">View all</button>
          </div>
        </div>
      )}

      <label className="pharmacy-field">
        Pharmacy Notes
        <textarea onChange={(event) => onNotesChange(event.target.value)} value={notes} />
      </label>

      {hasAction('ACCEPT_REQUEST') && (
        <div className="pharmacy-request-actions">
          <button onClick={() => updateStatus('IN_REVIEW')} type="button">Accept Request</button>
          <button className="danger" onClick={() => updateStatus('CANCELLED')} type="button">Reject</button>
        </div>
      )}

      {(hasAction('CHAT') || hasAction('VIDEO_CALL') || hasAction('CREATE_ORDER')) && (
        <div className="pharmacy-request-actions">
          {hasAction('CHAT') && (
            <button type="button" onClick={() => openChatWith({ uid: item.patientId, displayName: item.patientName })}>
              <i className="bi bi-chat-dots-fill me-1"></i> Chat
            </button>
          )}
          {hasAction('VIDEO_CALL') && (
            <button
              type="button"
              onClick={() => {
                const roomId = item.chatRoomId || Array.from({ length: 45 }, () =>
                  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
                ).join('');
                initiateCall(item.patientId, roomId, item.patientName, 'Pharmacy');
              }}
            >
              <i className="bi bi-camera-video-fill me-1"></i> Video Call
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

function PharmacyOrderTimeline({ order }) {
  const steps = [
    ['Created', order.createdAt],
    ['Confirmed', order.confirmedAt],
    ['Preparing', order.preparingAt],
    ['Shipped', order.shippedAt],
    ['Delivered', order.deliveredAt],
    ['Completed', order.actualDeliveryTime],
    ['Cancelled', order.cancelledAt],
  ].filter(([, value]) => !!value);

  if (!steps.length) return null;

  return (
    <section className="pharmacy-timeline">
      <h3>Status Timeline</h3>
      {steps.map(([label, value]) => (
        <div key={label}><span /> <strong>{label}</strong> <small>{dateTime(value)}</small></div>
      ))}
    </section>
  );
}

function PharmacyOrderStatusActions({ orderId, currentStatus, onUpdated }) {
  const current = normalize(currentStatus);
  const allowed = ORDER_FLOW[current] || [];
  const [status, setStatus] = useState(allowed[0] || '');
  const [pharmacistNotes, setPharmacistNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelledBy, setCancelledBy] = useState('Pharmacy');
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!status) return;
    setSaving(true);
    try {
      await pharmacyApi.updateOrderStatus(orderId, {
        status,
        pharmacistNotes,
        cancelReason,
        cancelledBy: status === 'CANCELLED' ? cancelledBy : undefined,
        estimatedDeliveryTime: estimatedDeliveryTime || undefined,
      });
      toast.success('Order status updated.');
      onUpdated();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update order.');
    } finally {
      setSaving(false);
    }
  };

  if (!allowed.length) return null;

  return (
    <form className="pharmacy-form" onSubmit={submit}>
      <h3>Update Status</h3>
      <select onChange={(event) => setStatus(event.target.value)} value={status}>
        {allowed.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
      </select>
      {status === 'SHIPPING' && (
        <input onChange={(event) => setEstimatedDeliveryTime(event.target.value)} type="datetime-local" value={estimatedDeliveryTime} />
      )}
      {status === 'CANCELLED' && (
        <>
          <select onChange={(event) => setCancelledBy(event.target.value)} value={cancelledBy}>
            <option value="Pharmacy">Cancelled by Pharmacy</option>
            <option value="Patient">Cancelled by Patient</option>
            <option value="System">Cancelled by System</option>
          </select>
          <textarea onChange={(event) => setCancelReason(event.target.value)} placeholder="Cancellation reason" required value={cancelReason} />
        </>
      )}
      <textarea onChange={(event) => setPharmacistNotes(event.target.value)} placeholder="Pharmacist notes" value={pharmacistNotes} />
      <button disabled={saving} type="submit">{saving ? 'Saving...' : 'Save Status'}</button>
    </form>
  );
}

function ExistingOrderPanel({ item, onUpdated }) {
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!item.orderId) return;
    let alive = true;
    setLoading(true);
    pharmacyApi.getOrderById(item.orderId)
      .then((data) => { if (alive) setOrderData(data); })
      .catch(() => { if (alive) setOrderData(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [item.orderId]);

  if (loading) {
    return (
      <aside className="pharmacy-prescription-panel">
        <div className="pharmacy-bootstrap-loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span>Loading order details...</span>
        </div>
      </aside>
    );
  }

  const order = orderData || item;

  return (
    <aside className="pharmacy-request-order-panel">
      <div className="pharmacy-request-order-header">
        <div>
          <p className="pharmacy-section-eyebrow">Order</p>
          <h3>{order.orderNumber || `Order #${order.orderId}`}</h3>
        </div>
      </div>

      <div className="pharmacy-detail-grid">
        <Detail label="Status" value={<span className={`pharmacy-status ${statusClass(order.orderStatus || order.status)}`}>{titleCase(order.orderStatus || order.status)}</span>} />
        <Detail label="Payment" value={`${order.paymentStatus || '-'} · ${order.paymentMethod || '-'}`} />
        <Detail label="Medicine Amount" value={money(order.medicineAmount)} />
        <Detail label="Delivery Fee" value={money(order.deliveryFee)} />
        <Detail label="Total" value={money(order.totalAmount)} />
        {order.pharmacyEarning != null && <Detail label="Pharmacy Earning" value={money(order.pharmacyEarning)} />}
      </div>

      <section className="pharmacy-order-items">
        <h3>Medication Items</h3>
        {(order.items || []).length ? order.items.map((oi) => (
          <div className="pharmacy-order-item-row" key={oi.orderItemId || oi.medicationName}>
            <div>
              <strong>{oi.medicationName || `Medicine #${oi.medicineId}`}</strong>
              <span>{oi.frequency || 'As directed'} {oi.timing ? `- ${oi.timing}` : ''}</span>
            </div>
            <small>{oi.quantity || 0} {oi.unit || 'unit'} - {money(oi.totalPrice)}</small>
          </div>
        )) : (
          item.itemCount != null && <p className="pharmacy-muted">{item.itemCount} item{item.itemCount === 1 ? '' : 's'}</p>
        )}
      </section>

      <PharmacyOrderTimeline order={order} />

      {(order.deliveryAddress || order.deliveryType) && (
        <Detail label="Delivery" value={`${order.deliveryType || '-'}: ${order.deliveryAddress || 'Not provided'}`} block />
      )}
      {(order.notes || item.additionalNotes) && (
        <Detail label="Notes" value={order.notes || item.additionalNotes || 'No notes'} block />
      )}

      <PharmacyOrderStatusActions
        currentStatus={order.orderStatus || order.status}
        onUpdated={onUpdated}
        orderId={order.orderId}
      />
    </aside>
  );
}

function RequestPrescriptionPanel({ importedItemKeys, loading, onImportAll, onImportPrescription, prescriptions }) {
  if (loading) {
    return (
      <aside className="pharmacy-prescription-panel">
        <div className="pharmacy-bootstrap-loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span>Loading prescriptions...</span>
        </div>
      </aside>
    );
  }

  if (!prescriptions.length) {
    return (
      <aside className="pharmacy-prescription-panel">
        <div className="pharmacy-empty pharmacy-prescription-empty">
          <span className="material-symbols-outlined">prescriptions</span>
          <h3>No prescriptions provided</h3>
          <p>Prescriptions shared by the patient will appear here for import.</p>
        </div>
      </aside>
    );
  }

  const totalItems = prescriptions.reduce((sum, prescription) => sum + getPrescriptionItems(prescription).length, 0);

  return (
    <aside className="pharmacy-prescription-panel">
      <div className="pharmacy-prescription-toolbar card">
        <div>
          <p className="pharmacy-section-eyebrow">Patient Prescriptions</p>
          <h3>{prescriptions.length} prescription{prescriptions.length === 1 ? '' : 's'} provided</h3>
          <span>{totalItems} medication{totalItems === 1 ? '' : 's'} available for import</span>
        </div>
        <button className="btn btn-primary" onClick={onImportAll} type="button">
          <i className="bi bi-box-arrow-in-down me-2"></i>
          Import All
        </button>
      </div>

      <div className="pharmacy-prescription-list">
        {prescriptions.map((prescription) => (
          <PrescriptionCard
            importedItemKeys={importedItemKeys}
            key={getPrescriptionId(prescription)}
            onImport={() => onImportPrescription(prescription)}
            prescription={prescription}
          />
        ))}
      </div>
    </aside>
  );
}

function PrescriptionCard({ importedItemKeys, onImport, prescription }) {
  const items = getPrescriptionItems(prescription);
  const importableItems = mapPrescriptionToOrderItems(prescription).filter(
    (item) => !item.sourcePrescriptionItemKey || !importedItemKeys.has(item.sourcePrescriptionItemKey),
  );
  const fullyImported = items.length > 0 && importableItems.length === 0;
  const prescriptionId = getPrescriptionId(prescription);

  return (
    <article className={`pharmacy-prescription-card card ${fullyImported ? 'is-imported' : ''}`}>
      <div className="pharmacy-prescription-card-header">
        <div>
          <p className="pharmacy-section-eyebrow">Prescription #{prescriptionId}</p>
          <h4>{prescription.diagnosis || prescription.doctorName || 'Shared prescription'}</h4>
          <span>Issued {dateTime(prescription.issueDate)}</span>
        </div>
        <div className="pharmacy-prescription-card-actions">
          <span className={`pharmacy-status ${statusClass(prescription.status)}`}>{prescriptionRequestLabel(prescription)}</span>
          <button className={`btn ${fullyImported ? 'btn-outline-secondary' : 'btn-primary'}`} disabled={fullyImported || !items.length} onClick={onImport} type="button">
            <i className={`bi ${fullyImported ? 'bi-check2' : 'bi-box-arrow-in-down'} me-2`}></i>
            {fullyImported ? 'Imported' : 'Import'}
          </button>
        </div>
      </div>

      <div className="pharmacy-prescription-med-list">
        {items.length ? items.map((item, index) => (
          <PrescriptionMedicationCard item={item} key={`${prescriptionId}-${item.prescriptionItemId || item.prescriptionItemID || index}`} />
        )) : (
          <p className="pharmacy-muted">No medications in this prescription.</p>
        )}
      </div>
    </article>
  );
}

function PrescriptionMedicationCard({ item }) {
  const timing = getTimingText(item);
  const chips = [
    item.quantity ? `Qty: ${item.quantity}` : null,
    item.totalSupplyDays ? `${item.totalSupplyDays} days` : null,
    item.frequency ? `Frequency: ${item.frequency}` : null,
    item.route ? `Route: ${item.route}` : null,
    timing ? `Timing: ${timing}` : null,
  ].filter(Boolean);

  return (
    <div className="pharmacy-prescription-med-card">
      <div className="pharmacy-prescription-med-main">
        <strong>{getPrescriptionMedicationName(item)}</strong>
        {item.unit && <span className="badge bg-light text-primary border">{item.unit}</span>}
      </div>
      {chips.length > 0 && (
        <div className="pharmacy-prescription-chip-list">
          {chips.map((chip) => <span key={chip}>{chip}</span>)}
        </div>
      )}
      {(item.notes || item.instructions) && <p>{item.notes || item.instructions}</p>}
    </div>
  );
}

function PharmacyRequestOrderPanel({
  request,
  onUpdated,
  items,
  setItems,
  pendingMedicine,
  onConsumePendingMedicine,
  onOpenMedicineSearch,
  profile,
}) {
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [draft, setDraft] = useState(defaultDraft());
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('');

  useEffect(() => {
    const preferredDelivery = isDeliveryPreferred(request?.preferredDeliveryType);
    setDeliveryEnabled(preferredDelivery);
    setDeliveryFee(preferredDelivery ? String(profile?.deliveryFee ?? request?.deliveryFee ?? 0) : '');
    setEstimatedDeliveryTime('');
    setSelectedMedicine(null);
    setDraft(defaultDraft());
  }, [profile?.deliveryFee, request?.deliveryFee, request?.preferredDeliveryType, request?.requestId]);

  useEffect(() => {
    if (!pendingMedicine) return;
    setSelectedMedicine(pendingMedicine);
    setDraft((current) => ({
      ...current,
      unit: current.unit || pendingMedicine.unit || 'unit',
      unitPrice: current.unitPrice || String(pendingMedicine.price || pendingMedicine.unitPrice || 0),
    }));
    onConsumePendingMedicine();
  }, [pendingMedicine, onConsumePendingMedicine]);

  if (!request) {
    return null;
  }

  const status = normalize(request.status);
  const canCreateOrder = !['ORDER_CREATED', 'CANCELLED'].includes(status);
  const medicationSubtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
  const deliveryFeeAmount = deliveryEnabled ? Number(deliveryFee || 0) : 0;
  const orderTotal = medicationSubtotal + deliveryFeeAmount;

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
        medicationName: getMedicineDisplayName(selectedMedicine),
        totalSupplyDays: Number(draft.totalSupplyDays || 1),
        quantity: Number(draft.quantity || 1),
        unit: draft.unit || selectedMedicine.unit || 'unit',
        frequency: draft.frequency,
        timing: draft.timing,
        route: draft.route,
        unitPrice: Number(draft.unitPrice || selectedMedicine.price || selectedMedicine.unitPrice || 0),
        notes: draft.notes,
      },
    ]);
    setSelectedMedicine(null);
    setDraft(defaultDraft());
    toast.success('Medicine added to order.');
  };

  const updateItem = (localId, field, value) => {
    setItems((current) => current.map((item) => (
      item.localId === localId ? { ...item, [field]: value } : item
    )));
  };

  const removeItem = (localId) => {
    setItems((current) => current.filter((item) => item.localId !== localId));
  };

  const updateDeliveryEnabled = (checked) => {
    setDeliveryEnabled(checked);
    if (checked) {
      setDeliveryFee((current) => current || String(profile?.deliveryFee ?? 0));
    } else {
      setDeliveryFee('');
    }
  };

  const createOrder = async (event) => {
    event.preventDefault();
    if (!items.length) {
      toast.error('Add at least one medication.');
      return;
    }
    if (deliveryEnabled && !estimatedDeliveryTime) {
      toast.error('Please provide an estimated delivery time for delivery orders.');
      return;
    }
    setCreatingOrder(true);
    try {
      const payload = {
        deliveryType: deliveryEnabled ? 'Delivery' : 'Pickup',
        deliveryFee: deliveryFeeAmount,
        estimatedDeliveryTime: estimatedDeliveryTime ? new Date(estimatedDeliveryTime).toISOString() : null,
        paymentMethod: 'Cash',
        notes: request.additionalNotes,
        items: items.map(toOrderItemPayload),
      };
      await pharmacyApi.createOrderFromRequest(request.requestId, payload);
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
          <p className="pharmacy-section-eyebrow">Order</p>
          <h3>Medication Order</h3>
        </div>
        <button className="btn btn-outline-primary" onClick={onOpenMedicineSearch} type="button">
          <i className="bi bi-search me-2"></i>
          Medicine Library
        </button>
      </div>

      {!canCreateOrder ? (
        <div className="pharmacy-empty compact">
          <span className="material-symbols-outlined">inventory_2</span>
          <h3>{status === 'ORDER_CREATED' ? 'Order created' : 'Request closed'}</h3>
          <p>{request.pharmacyOrderId ? `Order #${request.pharmacyOrderId}` : 'No new order can be created from this request.'}</p>
        </div>
      ) : (
        <form className="pharmacy-request-order-form" onSubmit={createOrder}>
          <section className="card pharmacy-order-manual">
            <div className="pharmacy-order-section-header">
              <div>
                <p className="pharmacy-section-eyebrow">Medicine</p>
                <h4>Add Medicine</h4>
              </div>
              <button className="btn btn-sm btn-outline-primary" onClick={onOpenMedicineSearch} type="button">
                <i className="bi bi-search me-2"></i>
                Browse
              </button>
            </div>

            {selectedMedicine ? (
              <div className="pharmacy-selected-medicine">
                <div>
                  <span>Selected medicine</span>
                  <strong>{getMedicineDisplayName(selectedMedicine)}</strong>
                </div>
                <button onClick={() => { setSelectedMedicine(null); setDraft(defaultDraft()); }} type="button" aria-label="Clear selected medicine">
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            ) : (
              <div className="alert alert-light border pharmacy-order-inline-alert mb-0">
                <i className="bi bi-capsule me-2"></i>
                Pick a medicine from the library before adding order details.
              </div>
            )}

            <div className="row g-3">
              <div className="col-sm-6">
                <label className="form-label">Quantity</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-box-seam"></i></span>
                  <input className="form-control" min="1" onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} type="number" value={draft.quantity} />
                </div>
              </div>
              <div className="col-sm-6">
                <label className="form-label">Supply Days</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-calendar3"></i></span>
                  <input className="form-control" min="1" onChange={(event) => setDraft({ ...draft, totalSupplyDays: event.target.value })} type="number" value={draft.totalSupplyDays} />
                </div>
              </div>
              <div className="col-sm-6">
                <label className="form-label">Unit</label>
                <input className="form-control" onChange={(event) => setDraft({ ...draft, unit: event.target.value })} placeholder="tablet, bottle..." value={draft.unit} />
              </div>
              <div className="col-sm-6">
                <label className="form-label">Unit Price</label>
                <div className="input-group">
                  <span className="input-group-text">$</span>
                  <input className="form-control" min="0" onChange={(event) => setDraft({ ...draft, unitPrice: event.target.value })} step="0.01" type="number" value={draft.unitPrice} />
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label">Frequency</label>
                <input className="form-control" onChange={(event) => setDraft({ ...draft, frequency: event.target.value })} placeholder="As directed" value={draft.frequency} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Timing</label>
                <select className="form-select" onChange={(event) => setDraft({ ...draft, timing: event.target.value })} value={draft.timing}>
                  <option value="">Timing</option>
                  {TIMING_OPTIONS.map((timing) => <option key={timing.value} value={timing.value}>{timing.label}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Route</label>
                <input className="form-control" onChange={(event) => setDraft({ ...draft, route: event.target.value })} placeholder="Oral" value={draft.route} />
              </div>
              <div className="col-12">
                <label className="form-label">Patient Notes</label>
                <input className="form-control" onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Instructions for patient" value={draft.notes} />
              </div>
            </div>

            <button className="btn btn-primary" disabled={!selectedMedicine} onClick={addMedicine} type="button">
              <i className="bi bi-plus-lg me-2"></i>
              Add to Order
            </button>
          </section>

          <section className="pharmacy-order-item-list">
            <div className="pharmacy-order-section-header">
              <div>
                <p className="pharmacy-section-eyebrow">Order Items</p>
                <h4>Medication List</h4>
              </div>
            </div>

            {items.length ? items.map((item) => (
              <OrderItemCard item={item} key={item.localId} onRemove={removeItem} onUpdate={updateItem} />
            )) : (
              <div className="pharmacy-empty compact pharmacy-order-empty card">
                <span className="material-symbols-outlined">medication</span>
                <h3>No medications</h3>
                <p>Add medicine manually or import prescriptions from the Prescription tab.</p>
              </div>
            )}
            {items.length > 0 && !items.some((i) => i.quantity > 0) && (
              <div className="alert alert-warning small mt-2 mb-0">
                <i className="bi bi-exclamation-triangle me-1"></i>
                Some items may have insufficient quantity. Check your inventory before submitting.
              </div>
            )}
          </section>

          <section className="card pharmacy-order-checkout">
            <div className="form-check form-switch pharmacy-delivery-switch">
              <input
                checked={deliveryEnabled}
                className="form-check-input"
                id="pharmacy-delivery-enabled"
                onChange={(event) => updateDeliveryEnabled(event.target.checked)}
                type="checkbox"
              />
              <label className="form-check-label" htmlFor="pharmacy-delivery-enabled">
                <span>Home delivery</span>
                <small>{deliveryEnabled ? 'Delivery fee will be included in total.' : 'Pickup order, no delivery fee.'}</small>
              </label>
            </div>

            {deliveryEnabled && (
              <>
                <div>
                  <label className="form-label">Delivery Fee <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text">$</span>
                    <input className="form-control" min="0" onChange={(event) => setDeliveryFee(event.target.value)} step="0.01" type="number" value={deliveryFee} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Estimated Delivery Time <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-calendar-event"></i></span>
                    <input className="form-control" onChange={(event) => setEstimatedDeliveryTime(event.target.value)} type="datetime-local" value={estimatedDeliveryTime} />
                  </div>
                  <div className="form-text">Enter the estimated delivery date and time after contacting the third-party delivery service.</div>
                </div>
              </>
            )}

            <div className="pharmacy-order-summary">
              <div>
                <span>Total Items</span>
                <strong>{items.length}</strong>
              </div>
              <div>
                <span>Medication Subtotal</span>
                <strong>{money(medicationSubtotal)}</strong>
              </div>
              <div>
                <span>Delivery Fee</span>
                <strong>{money(deliveryFeeAmount)}</strong>
              </div>
              <div className="is-total">
                <span>Total</span>
                <strong>{money(orderTotal)}</strong>
              </div>
            </div>

            <button className="btn btn-primary pharmacy-create-order-btn" disabled={creatingOrder || !items.length} type="submit">
              {creatingOrder ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                  Creating...
                </>
              ) : (
                <>
                  <i className="bi bi-bag-check me-2"></i>
                  Create Order - {money(orderTotal)}
                </>
              )}
            </button>
          </section>
        </form>
      )}
    </aside>
  );
}

function OrderItemCard({ item, onRemove, onUpdate }) {
  return (
    <article className="card pharmacy-order-item-card">
      <div className="pharmacy-order-item-card-header">
        <div>
          <strong>{item.medicationName}</strong>
          <small>{item.frequency || 'As directed'} {item.timing ? `- ${getTimingLabel(item.timing)}` : ''}</small>
        </div>
        <button className="btn btn-sm btn-link text-danger" onClick={() => onRemove(item.localId)} type="button" aria-label="Remove medicine">
          <i className="bi bi-trash3"></i>
        </button>
      </div>
      <div className="row g-2">
        <div className="col-6 col-md-3">
          <label className="form-label">Qty</label>
          <input className="form-control" min="1" onChange={(event) => onUpdate(item.localId, 'quantity', event.target.value)} type="number" value={item.quantity} />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label">Days</label>
          <input className="form-control" min="1" onChange={(event) => onUpdate(item.localId, 'totalSupplyDays', event.target.value)} type="number" value={item.totalSupplyDays} />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label">Unit</label>
          <input className="form-control" onChange={(event) => onUpdate(item.localId, 'unit', event.target.value)} value={item.unit} />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label">Unit Price</label>
          <input className="form-control" min="0" onChange={(event) => onUpdate(item.localId, 'unitPrice', event.target.value)} step="0.01" type="number" value={item.unitPrice} />
        </div>
      </div>
      <div className="pharmacy-order-item-footer">
        <span>{item.route || 'Route not set'}</span>
        <strong>{money(lineTotal(item))}</strong>
      </div>
      {item.notes && <p>{item.notes}</p>}
    </article>
  );
}

function RequestAttachmentsModal({ attachments, onClose }) {
  if (!attachments?.length) return null;
  return (
    <Modal title="Attachments" icon="attach_file" onClose={onClose}>
      <div className="consul-modal-body">
        <div className="consul-attachment-list">
          {attachments.map((item) => (
            <a className="consul-attachment-link" href={item} key={item} rel="noreferrer" target="_blank">
              <span className="material-symbols-outlined">description</span>
              <span>{item.split('/').pop() || item}</span>
            </a>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function MedicineLibraryModal({ onClose, onSelect, recentMedicineIds, selectedMedicineIds }) {
  const [query, setQuery] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(() => ({
    brandName: true,
    genericName: true,
    dosageForm: false,
    manufacturer: false,
  }));

  useEffect(() => {
    let alive = true;
    medicineApi.searchMedicines()
      .then((data) => {
        if (alive) setMedicines(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (alive) {
          console.error('Medicine library load failed', error);
          setMedicines([]);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const medicineOptions = useMemo(() => medicines.map(normalizeMedicine), [medicines]);
  const medicineMap = useMemo(
    () => new Map(medicineOptions.map((medicine) => [medicine.medicineId, medicine])),
    [medicineOptions],
  );
  const recentMedicines = recentMedicineIds.map((id) => medicineMap.get(id)).filter(Boolean);
  const commonMedicines = medicineOptions.slice(0, 4);
  const activeFilterCount = LIBRARY_FILTERS.filter((filter) => filters[filter.key]).length;

  const filteredMedicines = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return medicineOptions;

    const enabledKeys = LIBRARY_FILTERS.filter((filter) => filters[filter.key]).map((filter) => filter.key);
    return medicineOptions.filter((medicine) => (
      medicine.searchableText.includes(normalizedQuery)
      || enabledKeys.some((key) => String(medicine[key] || '').toLowerCase().includes(normalizedQuery))
    ));
  }, [filters, medicineOptions, query]);

  const handleSelect = (medicine) => {
    if (selectedMedicineIds.has(medicine.medicineId)) return;
    onSelect(medicine);
  };

  return (
    <div className="pharmacy-medicine-library">
      <button className="pharmacy-medicine-library-backdrop" onClick={onClose} type="button" aria-label="Close medicine library" />
      <div aria-modal="true" className="pharmacy-medicine-library-dialog" role="dialog">
        <aside className="pharmacy-medicine-library-sidebar">
          <div>
            <p className="pharmacy-section-eyebrow">Medicine Library</p>
            <h3>Find a medication</h3>
          </div>

          <ShortcutList label="Recent Searches" medicines={recentMedicines} onSelect={handleSelect} icon="bi-clock-history" />
          <ShortcutList label="Commonly Used" medicines={commonMedicines} onSelect={handleSelect} icon="bi-heart" />
        </aside>

        <section className="pharmacy-medicine-library-main">
          <div className="pharmacy-medicine-library-header">
            <div className="pharmacy-medicine-library-search">
              <i className="bi bi-search"></i>
              <input
                autoFocus
                className="form-control"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search medicines, brands, or generics..."
                value={query}
              />
            </div>
            <button className="btn btn-light pharmacy-library-filter-btn" onClick={() => setShowFilters((current) => !current)} type="button">
              <i className="bi bi-funnel"></i>
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </button>
            <button className="btn btn-light pharmacy-library-close-btn" onClick={onClose} type="button" aria-label="Close">
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {showFilters && (
            <div className="pharmacy-medicine-library-filters">
              {LIBRARY_FILTERS.map((filter) => (
                <label className="form-check" key={filter.key}>
                  <input
                    checked={filters[filter.key]}
                    className="form-check-input"
                    onChange={() => setFilters((current) => ({ ...current, [filter.key]: !current[filter.key] }))}
                    type="checkbox"
                  />
                  <span className="form-check-label">{filter.label}</span>
                </label>
              ))}
            </div>
          )}

          <div className="pharmacy-medicine-library-results-head">
            <div>
              <strong>Search Results</strong>
              <span>{filteredMedicines.length} medicine{filteredMedicines.length === 1 ? '' : 's'} available</span>
            </div>
          </div>

          {loading ? (
            <div className="pharmacy-bootstrap-loading">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <span>Loading medicine catalog...</span>
            </div>
          ) : filteredMedicines.length ? (
            <div className="pharmacy-medicine-library-results">
              {filteredMedicines.map((medicine) => {
                const isSelected = selectedMedicineIds.has(medicine.medicineId);
                return (
                  <div className="pharmacy-medicine-library-result" key={medicine.medicineId || medicine.displayName}>
                    <div className="pharmacy-medicine-library-result-content">
                      <div className="pharmacy-medicine-library-result-title">
                        <h4>{medicine.displayName}</h4>
                        {medicine.strength && <span className="badge bg-light text-primary border">{medicine.strength}</span>}
                        {medicine.dosageForm && <span className="badge bg-light text-secondary border">{medicine.dosageForm}</span>}
                      </div>
                      <p>{medicine.manufacturer || 'Manufacturer not listed'}</p>
                      <div className="pharmacy-prescription-chip-list">
                        {medicine.brandName && <span>Brand: {medicine.brandName}</span>}
                        {medicine.genericName && <span>Generic: {medicine.genericName}</span>}
                        {medicine.unit && <span>Unit: {medicine.unit}</span>}
                        {(medicine.price || medicine.unitPrice) && <span>Price: {money(medicine.price || medicine.unitPrice)}</span>}
                      </div>
                    </div>
                    <button className={`btn ${isSelected ? 'btn-outline-secondary' : 'btn-primary'}`} disabled={isSelected} onClick={() => handleSelect(medicine)} type="button">
                      <i className={`bi ${isSelected ? 'bi-check2' : 'bi-plus-lg'} me-2`}></i>
                      {isSelected ? 'Added' : 'Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="pharmacy-empty pharmacy-medicine-library-empty">
              <span className="material-symbols-outlined">search</span>
              <h3>No medicines matched</h3>
              <p>Try another keyword or loosen the active filters.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ShortcutList({ icon, label, medicines, onSelect }) {
  return (
    <div className="pharmacy-medicine-library-shortcuts">
      <p>{label}</p>
      {medicines.length ? medicines.map((medicine) => (
        <button key={`${label}-${medicine.medicineId}`} onClick={() => onSelect(medicine)} type="button">
          <i className={`bi ${icon}`}></i>
          <span>{medicine.searchLabel}</span>
        </button>
      )) : (
        <span className="pharmacy-medicine-library-placeholder">Selections will show up here.</span>
      )}
    </div>
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
  const timing = normalizeTimingForPayload(item.timing);
  return {
    medicineId: item.medicineId,
    totalSupplyDays: Number(item.totalSupplyDays || 1),
    quantity: Number(item.quantity || 1),
    unit: item.unit || undefined,
    frequency: item.frequency || undefined,
    timing: timing || undefined,
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

function getPrescriptionId(prescription) {
  return getRawPrescriptionId(prescription) || 'N/A';
}

function getRawPrescriptionId(prescription) {
  return prescription.prescriptionHeaderId || prescription.prescriptionHeaderID || prescription.id || null;
}

function getPrescriptionItems(prescription) {
  return prescription.items || prescription.medications || [];
}

function getOriginalPrescriptionItemId(item) {
  return item.prescriptionItemId || item.prescriptionItemID || item.id || null;
}

function getPrescriptionItemKey(prescription, item, index) {
  const prescriptionId = getRawPrescriptionId(prescription) || 'unknown';
  const itemId = getOriginalPrescriptionItemId(item);
  return `${prescriptionId}-${itemId || item.medicineId || item.medicationName || index}`;
}

function mapPrescriptionToOrderItems(prescription) {
  const rawPrescriptionId = getRawPrescriptionId(prescription);
  const prescriptionId = rawPrescriptionId || 'unknown';
  return getPrescriptionItems(prescription).map((item, index) => {
    const originalItemId = getOriginalPrescriptionItemId(item);
    const medicineId = item.medicineId || item.medicineID || item.medicine?.medicineId || item.medicine?.id;
    const { timing, notes } = normalizeTimingWithNotesFallback(item);
    return {
      localId: `rx-${Date.now()}-${prescriptionId}-${originalItemId || medicineId || index}`,
      medicineId,
      medicationName: getPrescriptionMedicationName(item),
      totalSupplyDays: Number(item.totalSupplyDays || 1),
      quantity: Number(item.quantity || 1),
      unit: item.unit || item.medicine?.unit || 'unit',
      frequency: item.frequency || '',
      timing,
      route: item.route || '',
      unitPrice: Number(item.unitPrice || item.price || item.medicine?.price || 0),
      notes,
      sourcePrescriptionHeaderId: rawPrescriptionId,
      sourcePrescriptionItemId: originalItemId,
      sourcePrescriptionItemKey: getPrescriptionItemKey(prescription, item, index),
    };
  });
}

function getPrescriptionMedicationName(item) {
  return item.medicationName
    || item.name
    || item.medicineName
    || item.brandName
    || item.genericName
    || item.medicine?.name
    || item.medicine?.medicineName
    || `Medicine #${item.medicineId || item.medicineID || 'N/A'}`;
}

function getTimingText(item) {
  if (Array.isArray(item.timings) && item.timings.length) return item.timings.join(',');
  return item.timing || '';
}

function getTimingLabel(value) {
  const timingValues = String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (!timingValues.length) return '';
  return timingValues.map((timing) => TIMING_OPTIONS.find((option) => option.value === normalize(timing))?.label || timing).join(', ');
}

function isDeliveryPreferred(value) {
  return normalize(value) === 'DELIVERY';
}

function getMedicineDisplayName(medicine = {}) {
  const brandName = medicine.brandName || '';
  const genericName = medicine.genericName || medicine.name || medicine.medicineName || '';
  if (brandName && genericName && brandName.toLowerCase() !== genericName.toLowerCase()) {
    return `${brandName} (${genericName})`;
  }
  return brandName || genericName || `Medicine #${medicine.medicineId || medicine.id || 'N/A'}`;
}

function normalizeMedicine(medicine = {}) {
  const displayName = getMedicineDisplayName(medicine);
  const medicineId = medicine.medicineId || medicine.id;
  const searchableText = [
    displayName,
    medicine.brandName,
    medicine.genericName,
    medicine.name,
    medicine.medicineName,
    medicine.dosageForm,
    medicine.strength,
    medicine.manufacturer,
    medicine.unit,
  ].filter(Boolean).join(' ').toLowerCase();

  return {
    ...medicine,
    medicineId,
    displayName,
    searchLabel: [displayName, medicine.strength].filter(Boolean).join(' - '),
    searchableText,
  };
}
