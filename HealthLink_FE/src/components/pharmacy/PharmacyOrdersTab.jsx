import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

import medicineApi from '../../api/medicineApi';
import pharmacyApi from '../../api/pharmacyApi';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import {
  DEFAULT_STAGE_GROUP,
  Detail,
  MetricCard,
  ORDER_FLOW,
  Pagination,
  STAGE_GROUPS,
  STAGE_LABELS,
  dateTime,
  exportCsv,
  getNextActionHint,
  money,
  normalize,
  stageClass,
  statusClass,
  titleCase,
  useDebouncedValue,
} from './PharmacyShared';

function orderItems(order) {
  return Array.isArray(order.items) ? order.items : [];
}

function medicationSummary(order) {
  const items = orderItems(order);
  if (!items.length) return order.diagnosis || order.notes || 'Prescription order';
  const names = items.slice(0, 3).map((item) => item.medicationName || `Medicine #${item.medicineId}`);
  return `${items.length} med${items.length === 1 ? '' : 's'}: ${names.join(', ')}${items.length > 3 ? '...' : ''}`;
}

function visibleActions(item) {
  const actions = item.availableActions || [];
  const has = (a) => actions.includes(a);
  if (has('ACCEPT_REQUEST')) return ['ACCEPT_REQUEST', 'REJECT_REQUEST'];
  if (has('CREATE_ORDER')) return ['CHAT', 'CREATE_ORDER'];
  if (has('UPDATE_ORDER_STATUS') || has('CANCEL_ORDER')) return ['UPDATE_ORDER_STATUS', 'CANCEL_ORDER'];
  return [];
}

const STAGE_EMPTY_MESSAGES = {
  NEW_REQUEST: { icon: 'inbox', title: 'No new consultation requests', desc: '' },
  CONSULTING: { icon: 'chat', title: 'No active consultations', desc: '' },
  REVISION_REQUESTED: { icon: 'edit', title: 'No revision requests', desc: '' },
  AWAITING_PAYMENT: { icon: 'payments', title: 'No orders awaiting payment', desc: '' },
  PREPARING: { icon: 'hourglass_empty', title: 'No orders in preparation', desc: '' },
  READY: { icon: 'checklist', title: 'No orders ready for handoff', desc: '' },
  SHIPPING: { icon: 'local_shipping', title: 'No orders in shipping', desc: '' },
  DELIVERED: { icon: 'inventory', title: 'No delivered orders', desc: '' },
  COMPLETED: { icon: 'task_alt', title: 'No completed orders in this filter', desc: '' },
};

export function OrderCaseTable({ items, compact = false, onSelect, selectedCaseId, activeStage }) {
  if (!items.length) {
    const empty = STAGE_EMPTY_MESSAGES[activeStage] || { icon: 'inbox', title: 'No cases found', desc: 'Cases matching your filters will appear here.' };
    return (
      <div className="pharmacy-empty">
        <span className="material-symbols-outlined">{empty.icon}</span>
        <h3>{empty.title}</h3>
        {empty.desc && <p>{empty.desc}</p>}
      </div>
    );
  }

  const rows = items.map((item) => (
    <tr
      className={`pharmacy-case-row ${selectedCaseId === item.caseId ? 'is-selected' : ''}`}
      key={item.caseId || item.workItemId}
      onClick={() => onSelect?.(item)}
    >
      <td>
        <strong>{item.displayId || item.orderNumber || `#${item.orderId || item.requestId}`}</strong>
        {item.sourceType && (
          <span className={`pharmacy-case-source-badge ${item.sourceType === 'DIRECT_ORDER' ? 'is-direct' : 'is-consult'}`}>
            {item.sourceType === 'DIRECT_ORDER' ? 'Order' : 'Request'}
          </span>
        )}
      </td>
      <td>
        <strong>{item.patientName || 'Unknown patient'}</strong>
        <span className="pharmacy-case-detail">{item.symptoms || item.description || ''}</span>
      </td>
      {!compact && <td>{item.orderNumber ? `#${item.orderId}` : '-'}</td>}
      <td>
        <span className={`pharmacy-status ${stageClass(item.workflowStage)}`}>
          {STAGE_LABELS[item.workflowStage] || item.workflowStage}
        </span>
      </td>
      {!compact && (
        <td>
          {item.totalAmount != null ? money(item.totalAmount) : '-'}
          {item.paymentStatus && <span className="pharmacy-status is-pending ms-1">{item.paymentStatus}</span>}
        </td>
      )}
      {!compact && <td className="pharmacy-next-action">{getNextActionHint(item)}</td>}
      <td>{dateTime(item.sortAt || item.updatedAt || item.createdAt)}</td>
      {!compact && (
        <td className="text-right pharmacy-case-actions">
          {visibleActions(item).includes('ACCEPT_REQUEST') && (
            <button className="btn btn-sm btn-outline-success me-1" onClick={(e) => { e.stopPropagation(); onSelect?.(item); }} type="button" title="Accept">
              <i className="bi bi-check2"></i>
            </button>
          )}
          {visibleActions(item).includes('CREATE_ORDER') && (
            <button className="btn btn-sm btn-outline-primary" onClick={(e) => { e.stopPropagation(); onSelect?.(item); }} type="button" title="Create Order">
              <i className="bi bi-bag-plus"></i>
            </button>
          )}
          {visibleActions(item).includes('CHAT') && (
            <button className="btn btn-sm btn-outline-info" onClick={(e) => { e.stopPropagation(); onSelect?.(item); }} type="button" title="Chat">
              <i className="bi bi-chat-dots"></i>
            </button>
          )}
          {visibleActions(item).includes('UPDATE_ORDER_STATUS') && (
            <button className="btn btn-sm btn-outline-secondary" onClick={(e) => { e.stopPropagation(); onSelect?.(item); }} type="button" title="Update Status">
              <i className="bi bi-arrow-right-circle"></i>
            </button>
          )}
        </td>
      )}
    </tr>
  ));

  return (
    <div className="pharmacy-table-wrap">
      <table className="pharmacy-table pharmacy-case-table">
        <thead>
          <tr>
            <th>Case / Order</th>
            <th>Patient</th>
            {!compact && <th>Order #</th>}
            <th>Stage</th>
            {!compact && <th>Total</th>}
            {!compact && <th>Next Action</th>}
            <th>Updated</th>
            {!compact && <th className="text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

export function OrderTable({ orders, compact = false, onSelect }) {
  if (!orders.length) {
    return (
      <div className="pharmacy-empty">
        <span className="material-symbols-outlined">inbox</span>
        <h3>No orders found</h3>
        <p>Orders matching your filters will appear here.</p>
      </div>
    );
  }

  return (
    <div className="pharmacy-table-wrap">
      <table className="pharmacy-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Patient</th>
            {!compact && <th>Delivery</th>}
            <th>Date</th>
            <th>Payment</th>
            <th>Status</th>
            {!compact && <th className="text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.orderId || order.orderNumber}>
              <td><strong>{order.orderNumber || `#${order.orderId}`}</strong></td>
              <td>
                <strong>{order.patientName || 'Unknown patient'}</strong>
                <span>{medicationSummary(order)}</span>
              </td>
              {!compact && <td>{order.deliveryType || '-'}</td>}
              <td>{dateTime(getOrderTime(order))}</td>
              <td>
                <span className={`pharmacy-status ${statusClass(order.paymentStatus)}`}>
                  {order.paymentStatus || 'Pending'} {order.totalAmount != null ? `(${money(order.totalAmount)})` : ''}
                </span>
              </td>
              <td><span className={`pharmacy-status ${statusClass(order.status)}`}>{titleCase(order.status) || '-'}</span></td>
              {!compact && (
                <td className="text-right">
                  <button className="pharmacy-link-button" onClick={() => onSelect?.(order)} type="button">Review</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OrderDetailDrawer({ order, onClose, onUpdated }) {
  const current = normalize(order.status);
  const allowed = ORDER_FLOW[current] || [];
  const [status, setStatus] = useState(allowed[0] || '');
  const [pharmacistNotes, setPharmacistNotes] = useState(order.pharmacistNotes || '');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelledBy, setCancelledBy] = useState('Pharmacy');
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!status) return;
    setSaving(true);
    try {
      await pharmacyApi.updateOrderStatus(order.orderId, {
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

  return (
    <div className="pharmacy-drawer">
      <button className="pharmacy-drawer-backdrop" onClick={onClose} type="button" />
      <aside className="pharmacy-drawer-panel">
        <div className="pharmacy-drawer-header">
          <div>
            <h2>{order.orderNumber || `Order #${order.orderId}`}</h2>
            <p>{order.patientName || 'Unknown patient'} · {dateTime(getOrderTime(order))}</p>
          </div>
          <button onClick={onClose} type="button"><span className="material-symbols-outlined">close</span></button>
        </div>

        <div className="pharmacy-drawer-body">
          <div className="pharmacy-detail-grid">
            <Detail label="Status" value={<span className={`pharmacy-status ${statusClass(order.status)}`}>{titleCase(order.status)}</span>} />
            <Detail label="Payment" value={`${order.paymentStatus || '-'} · ${order.paymentMethod || '-'}`} />
            <Detail label="Medicine Amount" value={money(order.medicineAmount)} />
            <Detail label="Medications" value={`${orderItems(order).length} item${orderItems(order).length === 1 ? '' : 's'}`} />
            <Detail label="Delivery Fee" value={money(order.deliveryFee)} />
            <Detail label="Total" value={money(order.totalAmount)} />
            <Detail label="Pharmacy Earning" value={money(order.pharmacyEarning)} />
          </div>

          <section className="pharmacy-order-items">
            <h3>Medication Items</h3>
            {orderItems(order).length ? orderItems(order).map((item) => (
              <div className="pharmacy-order-item-row" key={item.orderItemId || item.medicationName}>
                <div>
                  <strong>{item.medicationName || `Medicine #${item.medicineId}`}</strong>
                  <span>{item.frequency || 'As directed'} {item.timing ? `- ${item.timing}` : ''}</span>
                </div>
                <small>
                  {item.quantity || 0} {item.unit || 'unit'} - {money(item.totalPrice)}
                </small>
              </div>
            )) : (
              <p className="pharmacy-muted">No medication items recorded.</p>
            )}
          </section>

          <section className="pharmacy-timeline">
            <h3>Status Timeline</h3>
            {[
              ['Created', order.createdAt],
              ['Confirmed', order.confirmedAt],
              ['Preparing', order.preparingAt],
              ['Shipped', order.shippedAt],
              ['Delivered', order.deliveredAt],
              ['Completed', order.actualDeliveryTime],
              ['Cancelled', order.cancelledAt],
            ].map(([label, value]) => value && (
              <div key={label}><span /> <strong>{label}</strong> <small>{dateTime(value)}</small></div>
            ))}
          </section>

          <Detail label="Delivery Address" value={order.deliveryAddress || 'Pickup / not provided'} block />
          <Detail label="Notes" value={order.notes || 'No notes'} block />
          <Detail label="Pharmacist Notes" value={order.pharmacistNotes || 'No notes'} block />

          <form className="pharmacy-form" onSubmit={submit}>
            <h3>Update Status</h3>
            {allowed.length ? (
              <>
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
              </>
            ) : (
              <p className="pharmacy-muted">This order is in a terminal state.</p>
            )}
          </form>
        </div>
      </aside>
    </div>
  );
}

function getStageGroupKey(stage) {
  const group = STAGE_GROUPS.find((g) => g.stages.includes(stage));
  return group ? group.key : null;
}

function resolveInitialGroup(searchParams) {
  const groupParam = searchParams.get('group');
  if (groupParam) {
    const match = STAGE_GROUPS.find((g) => g.key === groupParam);
    if (match) return match.key;
  }

  const legacyStage = searchParams.get('stage');
  if (legacyStage) {
    if (legacyStage === 'ALL' || legacyStage === 'NEEDS_INFO' || legacyStage === 'QUOTE_SENT') {
      if (legacyStage === 'QUOTE_SENT') return 'PAYMENT_DUE';
      if (legacyStage === 'NEEDS_INFO') return 'CONSULTING';
    }
  }

  return DEFAULT_STAGE_GROUP;
}

export default function PharmacyOrdersTab({ workItems, orders, globalSearch, reload, profile }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeStageGroup, setActiveStageGroup] = useState(() => resolveInitialGroup(searchParams));
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [deliveryFilter, setDeliveryFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const deferredQuery = useDebouncedValue(`${globalSearch} ${query}`.trim());
  const pageSize = 10;

  const activeGroup = STAGE_GROUPS.find((g) => g.key === activeStageGroup);
  const activeStages = activeGroup ? activeGroup.stages : [];

  const items = useMemo(() => {
    if (Array.isArray(workItems) && workItems.length) return workItems;
    return (orders || []).map((o) => ({
      ...o,
      caseId: 'ORD-' + o.orderId,
      workItemId: 'ORD-' + o.orderId,
      sourceType: 'DIRECT_ORDER',
      displayId: o.orderNumber || 'Order #' + o.orderId,
      workflowStage: o.status,
      hasOrder: true,
      hasConsultationRequest: false,
      sortAt: o.createdAt,
      availableActions: [],
    }));
  }, [workItems, orders]);

  const groupCounts = useMemo(() => {
    const counts = {};
    STAGE_GROUPS.forEach((g) => { counts[g.key] = 0; });
    items.forEach((item) => {
      const groupKey = getStageGroupKey(item.workflowStage);
      if (groupKey) counts[groupKey] = (counts[groupKey] || 0) + 1;
    });
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    const now = new Date();
    return items.filter((item) => {
      const stageMatches = activeStages.length === 0 || activeStages.includes(item.workflowStage);
      const text = [
        item.displayId,
        item.orderNumber,
        item.patientName,
        item.symptoms,
        item.description,
      ].join(' ').toLowerCase();
      const queryMatches = !deferredQuery || text.includes(deferredQuery.toLowerCase());

      if (!stageMatches || !queryMatches) return false;
      if (dateFilter === 'ALL') return true;

      const updated = new Date(item.sortAt || item.updatedAt || item.createdAt || 0);
      const diffDays = (now - updated) / 86400000;
      if (dateFilter === 'TODAY') return updated.toDateString() === now.toDateString();
      if (dateFilter === '7D') return diffDays <= 7;
      return true;
    });
  }, [items, activeStages, deferredQuery, dateFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [activeStageGroup, query, globalSearch, dateFilter]);

  useEffect(() => {
    setSearchParams({ group: activeStageGroup }, { replace: true });
  }, [activeStageGroup, setSearchParams]);

  return (
    <>
      <div className="pharmacy-order-ops">
        <div className="pharmacy-order-toolbar">
          <div>
            <h2>Orders Operations</h2>
            <span className="pharmacy-muted">{items.length} case{items.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        <div className="pharmacy-stage-strip row g-2">
          {STAGE_GROUPS.map((group) => (
            <div className="col" key={group.key}>
              <button
                className={`pharmacy-stage-metric ${activeStageGroup === group.key ? 'is-active' : ''}`}
                onClick={() => { setActiveStageGroup(group.key); setSelected(null); }}
                type="button"
              >
                <span className="pharmacy-stage-metric-label">{group.label}</span>
                <span className="pharmacy-stage-metric-value">{groupCounts[group.key] || 0}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <section className="pharmacy-card">
        <h3 className="pharmacy-card-title">{activeGroup?.label || ''} - {filtered.length} case{filtered.length === 1 ? '' : 's'}</h3>

        <div className="pharmacy-filter-bar">
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID, patient, symptoms..." value={query} />
          <select onChange={(event) => setDateFilter(event.target.value)} value={dateFilter}>
            <option value="ALL">Any date</option>
            <option value="TODAY">Today</option>
            <option value="7D">Last 7 days</option>
          </select>
          <select onChange={(event) => setDeliveryFilter(event.target.value)} value={deliveryFilter}>
            <option value="ALL">All Methods</option>
            <option value="PICKUP">Pickup</option>
            <option value="DELIVERY">Home Delivery</option>
          </select>
          <button className="pharmacy-secondary-action pharmacy-filter-action" onClick={() => {
            const cols = ['displayId', 'patientName', 'workflowStage', 'sourceType', 'totalAmount', 'paymentStatus'];
            const labelRow = ['Case', 'Patient', 'Stage', 'Source', 'Total', 'Payment Status'];
            const rows = filtered.map((r) => {
              const row = {};
              cols.forEach((col, i) => { row[labelRow[i]] = r[col] ?? ''; });
              return row;
            });
            exportCsv(rows, 'pharmacy-cases.csv', labelRow);
          }} type="button">Export CSV</button>
        </div>

        <OrderCaseTable
          activeStage={activeStages.length === 1 ? activeStages[0] : null}
          items={visible}
          onSelect={setSelected}
          selectedCaseId={selected?.caseId}
        />
        <Pagination page={page} pages={pages} total={filtered.length} onPage={setPage} label="cases" />
      </section>

      {selected && (
        <OrderCaseDetailDrawer
          item={selected}
          onClose={() => setSelected(null)}
          onUpdated={async () => {
            await reload();
            if (selected?.caseId) {
              const stillExists = items.some((i) => i.caseId === selected.caseId);
              if (!stillExists) setSelected(null);
            }
          }}
          profile={profile}
        />
      )}
    </>
  );
}

function OrderCaseHeader({ item }) {
  return (
    <div className="pharmacy-case-header">
      <div className="pharmacy-case-header-main">
        <div className="pharmacy-request-avatar is-large">{item.patientName?.[0]?.toUpperCase() || 'P'}</div>
        <div>
          <h2>{item.patientName || 'Unknown patient'}</h2>
          <div className="pharmacy-case-header-meta">
            <span>{item.displayId || `#${item.requestId || item.orderId}`}</span>
            <span className={`pharmacy-status ${stageClass(item.workflowStage)}`}>
              {STAGE_LABELS[item.workflowStage] || item.workflowStage}
            </span>
            {item.sourceType === 'DIRECT_ORDER' && <span className="pharmacy-case-source-badge is-direct">Direct Order</span>}
            {item.hasConsultationRequest && <span className="pharmacy-case-source-badge is-consult">Consultation</span>}
            {item.paymentStatus && <span className={`pharmacy-status ${statusClass(item.paymentStatus)}`}>{item.paymentStatus}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderCaseTimeline({ item }) {
  const requestSteps = item.hasConsultationRequest ? [
    item.createdAt && ['Request Received', item.createdAt],
  ].filter(Boolean) : [
    item.createdAt && ['Direct Order Received', item.createdAt],
  ];

  const orderSteps = item.hasOrder ? [
    item.orderId && ['Order Created', item.sortAt],
    item.patientConfirmedAt && ['Quote Confirmed', item.patientConfirmedAt],
    item.preparingAt && ['Preparing', item.preparingAt],
    item.shippedAt && ['Shipping', item.shippedAt],
    item.deliveredAt && ['Delivered', item.deliveredAt],
    item.cancelledAt && ['Cancelled', item.cancelledAt],
  ].filter(Boolean) : [];

  const steps = [...requestSteps, ...orderSteps];

  if (!steps.length) return null;

  return (
    <section className="pharmacy-case-timeline">
      <h3>Case Timeline</h3>
      <div className="pharmacy-timeline">
        {steps.map(([label, value], idx) => (
          <div key={label} className={idx === steps.length - 1 ? 'is-current' : 'is-done'}>
            <span /> <strong>{label}</strong> <small>{dateTime(value)}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function OrderCaseDetailDrawer({ item, onClose, onUpdated, profile }) {
  const { initiateCall } = useAuth();
  const { openChatWith } = useChat();
  const actions = item.availableActions || [];

  return (
    <div className="pharmacy-drawer pharmacy-case-drawer">
      <button className="pharmacy-drawer-backdrop" onClick={onClose} type="button" />
      <aside className="pharmacy-drawer-panel">
        <div className="pharmacy-drawer-header">
          <OrderCaseHeader item={item} />
          <button onClick={onClose} type="button"><span className="material-symbols-outlined">close</span></button>
        </div>

        <div className="pharmacy-drawer-body">
          <OrderCaseTimeline item={item} />

          {item.hasConsultationRequest && ['NEW_REQUEST', 'CONSULTING'].includes(item.workflowStage) && (
            <RequestIntakeSection
              actions={actions}
              initiateCall={initiateCall}
              item={item}
              openChatWith={openChatWith}
              onUpdated={onUpdated}
            />
          )}

          {(item.workflowStage === 'CONSULTING' || item.workflowStage === 'REVISION_REQUESTED') && !item.hasOrder && (
            <ConsultingSection item={item} onUpdated={onUpdated} profile={profile} />
          )}

          {item.hasOrder && (
            <ExistingOrderSection item={item} onUpdated={onUpdated} />
          )}
        </div>

        <OrderCaseActionBar item={item} actions={actions} onUpdated={onUpdated} />
      </aside>
    </div>
  );
}

function RequestIntakeSection({ item, onUpdated, actions, initiateCall, openChatWith }) {
  const hasAction = (action) => actions.includes(action);
  const [notes, setNotes] = useState(item.pharmacyNotes || '');

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

  useEffect(() => {
    setNotes(item.pharmacyNotes || '');
  }, [item.requestId, item.pharmacyNotes]);

  return (
    <section className="pharmacy-case-section">
      <h3><i className="bi bi-clipboard2-pulse me-2"></i>Request Intake</h3>
      <div className="pharmacy-detail-block">
        <div className="pharmacy-chip-row">
          {item.symptoms && <span className="badge bg-light text-dark border">Symptoms: {item.symptoms}</span>}
          {item.preferredDeliveryType && <span className="badge bg-light text-dark border">{item.preferredDeliveryType}</span>}
          {item.allergies && <span className="badge bg-light text-danger border">Allergies: {item.allergies}</span>}
        </div>
        <p className="mt-2">{item.description || 'No description provided.'}</p>
      </div>

      {item.additionalNotes && (
        <div className="pharmacy-detail-block">
          <span className="pharmacy-muted">Additional Notes: {item.additionalNotes}</span>
        </div>
      )}

      {item.attachments?.length > 0 && (
        <div className="pharmacy-detail-block">
          <span className="material-symbols-outlined">attach_file</span>
          <span>{item.attachments.length} attachment{item.attachments.length === 1 ? '' : 's'}</span>
        </div>
      )}

      <label className="pharmacy-field">
        Pharmacy Notes
        <textarea onChange={(e) => setNotes(e.target.value)} value={notes} />
      </label>

      {hasAction('ACCEPT_REQUEST') && (
        <div className="pharmacy-request-actions">
          <button className="btn btn-success" onClick={() => updateStatus('IN_REVIEW')} type="button">
            <i className="bi bi-check2 me-2"></i>Accept Request
          </button>
          <button className="btn btn-outline-danger" onClick={() => updateStatus('CANCELLED')} type="button">
            <i className="bi bi-x-circle me-2"></i>Reject
          </button>
        </div>
      )}

      {(hasAction('CHAT') || hasAction('VIDEO_CALL')) && (
        <div className="pharmacy-request-actions">
          {hasAction('CHAT') && (
            <button className="btn btn-outline-info" type="button" onClick={() => openChatWith({ uid: item.patientId, displayName: item.patientName })}>
              <i className="bi bi-chat-dots-fill me-2"></i>Chat
            </button>
          )}
          {hasAction('VIDEO_CALL') && (
            <button className="btn btn-outline-primary" type="button" onClick={() => initiateCall(item.patientId, item.chatRoomId || '', item.patientName, 'Pharmacy')}>
              <i className="bi bi-camera-video-fill me-2"></i>Video Call
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function ConsultingSection({ item, onUpdated, profile }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [pendingMedicine, setPendingMedicine] = useState(null);
  const [recentMedicineIds, setRecentMedicineIds] = useState([]);

  useEffect(() => {
    if (!item.requestId) return;
    let alive = true;
    setLoadingPrescriptions(true);
    pharmacyApi.getRequestPrescriptions(item.requestId)
      .then((data) => { if (alive) setPrescriptions(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) setPrescriptions([]); })
      .finally(() => { if (alive) setLoadingPrescriptions(false); });
    return () => { alive = false; };
  }, [item.requestId]);

  const importedItemKeys = useMemo(
    () => new Set(orderItems.map((oi) => oi.sourcePrescriptionItemKey).filter(Boolean)),
    [orderItems],
  );

  const importOrderItems = (mappedItems) => {
    if (!mappedItems.length) {
      toast.error('This prescription has no medications to import.');
      return;
    }
    const existingKeys = new Set(orderItems.map((oi) => oi.sourcePrescriptionItemKey).filter(Boolean));
    const imported = mappedItems.filter((oi) => !oi.sourcePrescriptionItemKey || !existingKeys.has(oi.sourcePrescriptionItemKey));
    if (!imported.length) {
      toast.info('All medications from this prescription are already in the order.');
      return;
    }
    setOrderItems((current) => [...current, ...imported]);
    toast.success(`${imported.length} medication${imported.length === 1 ? '' : 's'} imported.`);
  };

  return (
    <>
      <section className="pharmacy-case-section">
        <h3><i className="bi bi-chat-dots me-2"></i>Consultation</h3>
        <p className="pharmacy-muted mb-2">Patient is being consulted. Review request details and create an order.</p>

        <div className="pharmacy-chip-row">
          {item.symptoms && <span className="badge bg-light text-dark border">Symptoms: {item.symptoms}</span>}
          {item.allergies && <span className="badge bg-light text-danger border">Allergies: {item.allergies}</span>}
        </div>
      </section>

      <PrescriptionImportSection
        importedItemKeys={importedItemKeys}
        loading={loadingPrescriptions}
        onImportAll={() => importOrderItems(prescriptions.flatMap(mapPrescriptionToOrderItems))}
        onImportPrescription={(prescription) => importOrderItems(mapPrescriptionToOrderItems(prescription))}
        prescriptions={prescriptions}
      />

      <OrderDraftSection
        item={item}
        items={orderItems}
        setItems={setOrderItems}
        onOpenMedicineSearch={() => setActiveModal('medicine')}
        onUpdated={onUpdated}
        profile={profile}
        pendingMedicine={pendingMedicine}
      />

      {activeModal === 'medicine' && (
        <MedicineLibraryModal
          onClose={() => setActiveModal(null)}
          onSelect={(medicine) => {
            setPendingMedicine(medicine);
            setActiveModal(null);
          }}
          recentMedicineIds={recentMedicineIds}
          selectedMedicineIds={new Set(orderItems.map((oi) => oi.medicineId).filter(Boolean))}
        />
      )}
    </>
  );
}

function PrescriptionImportSection({ importedItemKeys, loading, onImportAll, onImportPrescription, prescriptions }) {
  if (loading) {
    return (
      <section className="pharmacy-case-section">
        <div className="pharmacy-bootstrap-loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span>Loading prescriptions...</span>
        </div>
      </section>
    );
  }

  if (!prescriptions.length) {
    return (
      <section className="pharmacy-case-section">
        <div className="pharmacy-empty compact">
          <span className="material-symbols-outlined">prescriptions</span>
          <h3>No prescriptions provided</h3>
          <p>Prescriptions shared by the patient will appear here for import.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="pharmacy-case-section">
      <h3><i className="bi bi-prescription me-2"></i>Prescriptions</h3>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="pharmacy-muted">{prescriptions.length} prescription{prescriptions.length === 1 ? '' : 's'} provided</span>
        <button className="btn btn-primary btn-sm" onClick={onImportAll} type="button">
          <i className="bi bi-box-arrow-in-down me-2"></i>Import All
        </button>
      </div>
      {prescriptions.map((prescription) => (
        <PrescriptionCard
          importedItemKeys={importedItemKeys}
          key={prescription.prescriptionHeaderId || prescription.id}
          onImport={() => onImportPrescription(prescription)}
          prescription={prescription}
        />
      ))}
    </section>
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
    <div className={`card mb-2 pharmacy-prescription-import-row ${fullyImported ? 'border-success' : ''}`}>
      <div className="card-body py-2 px-3">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <strong className="small">Prescription #{prescriptionId}</strong>
            <span className="pharmacy-muted ms-2 small">{prescription.diagnosis || prescription.doctorName || ''}</span>
          </div>
          <button
            className={`btn btn-sm ${fullyImported ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
            disabled={fullyImported || !items.length}
            onClick={onImport}
            type="button"
          >
            <i className={`bi ${fullyImported ? 'bi-check2' : 'bi-box-arrow-in-down'} me-1`}></i>
            {fullyImported ? 'Imported' : 'Import'}
          </button>
        </div>
        {items.slice(0, 2).map((item, idx) => (
          <small key={idx} className="d-block text-muted ms-2">
            {getPrescriptionMedicationName(item)} - {item.quantity || 0} {item.unit || 'unit'}
          </small>
        ))}
        {items.length > 2 && <small className="text-muted ms-2">+{items.length - 2} more</small>}
      </div>
    </div>
  );
}

function OrderDraftSection({ item, items, setItems, onOpenMedicineSearch, onUpdated, profile, pendingMedicine }) {
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [draft, setDraft] = useState(defaultDraft());
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('');

  useEffect(() => {
    const preferredDelivery = isDeliveryPreferred(item?.preferredDeliveryType);
    setDeliveryEnabled(preferredDelivery);
    setDeliveryFee(preferredDelivery ? String(profile?.deliveryFee ?? 0) : '');
    setSelectedMedicine(null);
    setDraft(defaultDraft());
  }, [profile?.deliveryFee, item?.preferredDeliveryType, item?.requestId]);

  useEffect(() => {
    if (!pendingMedicine) return;
    setSelectedMedicine(pendingMedicine);
    setDraft((current) => ({
      ...current,
      unit: current.unit || pendingMedicine.unit || 'unit',
      unitPrice: current.unitPrice || String(pendingMedicine.price || pendingMedicine.unitPrice || 0),
    }));
  }, [pendingMedicine]);

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
        notes: item.additionalNotes,
        items: items.map(toOrderItemPayload),
      };
      await pharmacyApi.createOrderFromRequest(item.requestId, payload);
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
    <section className="pharmacy-case-section">
      <h3><i className="bi bi-bag-plus me-2"></i>Order Draft</h3>

      <div className="row g-2 mb-2">
        <div className="col">
          <button className="btn btn-outline-primary btn-sm w-100" onClick={onOpenMedicineSearch} type="button">
            <i className="bi bi-search me-1"></i>Medicine Library
          </button>
        </div>
      </div>

      {selectedMedicine ? (
        <div className="alert alert-info py-2 mb-2 d-flex justify-content-between align-items-center">
          <span><strong>{getMedicineDisplayName(selectedMedicine)}</strong> selected</span>
          <button className="btn btn-sm btn-link text-danger" onClick={() => { setSelectedMedicine(null); setDraft(defaultDraft()); }} type="button">Clear</button>
        </div>
      ) : (
        <div className="alert alert-light border small py-2 mb-2">
          <i className="bi bi-capsule me-1"></i> Pick a medicine from the library first.
        </div>
      )}

      <div className="row g-2">
        <div className="col-4">
          <input className="form-control form-control-sm" min="1" onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} placeholder="Qty" type="number" value={draft.quantity} />
        </div>
        <div className="col-4">
          <input className="form-control form-control-sm" min="1" onChange={(e) => setDraft({ ...draft, totalSupplyDays: e.target.value })} placeholder="Days" type="number" value={draft.totalSupplyDays} />
        </div>
        <div className="col-4">
          <input className="form-control form-control-sm" min="0" onChange={(e) => setDraft({ ...draft, unitPrice: e.target.value })} placeholder="Price" step="0.01" type="number" value={draft.unitPrice} />
        </div>
        <div className="col-6">
          <input className="form-control form-control-sm" onChange={(e) => setDraft({ ...draft, frequency: e.target.value })} placeholder="Frequency" value={draft.frequency} />
        </div>
        <div className="col-6">
          <select className="form-select form-select-sm" onChange={(e) => setDraft({ ...draft, timing: e.target.value })} value={draft.timing}>
            <option value="">Timing</option>
            {TIMING_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="col-12">
          <input className="form-control form-control-sm" onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes" value={draft.notes} />
        </div>
      </div>

      <button className="btn btn-sm btn-primary mt-2" disabled={!selectedMedicine} onClick={addMedicine} type="button">
        <i className="bi bi-plus-lg me-1"></i>Add Medicine
      </button>

      {items.length > 0 && (
        <div className="mt-2">
          <small className="text-muted">{items.length} item{items.length === 1 ? '' : 's'} in draft</small>
          {items.map((item) => (
            <div className="pharmacy-order-draft-row card mt-1" key={item.localId}>
              <div className="card-body py-2 px-3">
                <div className="d-flex justify-content-between">
                  <strong className="small">{item.medicationName}</strong>
                  <button className="btn btn-sm btn-link text-danger p-0" onClick={() => removeItem(item.localId)} type="button">
                    <i className="bi bi-trash3"></i>
                  </button>
                </div>
                <div className="row g-1 mt-1">
                  <div className="col-4">
                    <input className="form-control form-control-sm" min="1" onChange={(e) => updateItem(item.localId, 'quantity', e.target.value)} type="number" value={item.quantity} />
                  </div>
                  <div className="col-4">
                    <input className="form-control form-control-sm" min="0" onChange={(e) => updateItem(item.localId, 'unitPrice', e.target.value)} step="0.01" type="number" value={item.unitPrice} />
                  </div>
                  <div className="col-4 d-flex align-items-center justify-content-end">
                    <strong className="small">{money(lineTotal(item))}</strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2">
        <div className="form-check form-switch">
          <input checked={deliveryEnabled} className="form-check-input" id="delivery-switch" onChange={(e) => setDeliveryEnabled(e.target.checked)} type="checkbox" />
          <label className="form-check-label small" htmlFor="delivery-switch">Home delivery</label>
        </div>
      </div>

      {deliveryEnabled && (
        <div className="row g-2 mt-1">
          <div className="col-6">
            <input className="form-control form-control-sm" min="0" onChange={(e) => setDeliveryFee(e.target.value)} placeholder="Delivery fee" step="0.01" type="number" value={deliveryFee} />
          </div>
          <div className="col-6">
            <input className="form-control form-control-sm" onChange={(e) => setEstimatedDeliveryTime(e.target.value)} type="datetime-local" value={estimatedDeliveryTime} />
          </div>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mt-2 p-2 bg-light rounded">
        <div>
          <small className="text-muted">Total: {money(medicationSubtotal)}</small>
          {deliveryEnabled && <small className="text-muted ms-2">+ Delivery: {money(deliveryFeeAmount)}</small>}
        </div>
        <strong>{money(orderTotal)}</strong>
      </div>

      <button
        className="btn btn-primary w-100 mt-2"
        disabled={creatingOrder || !items.length}
        onClick={createOrder}
        type="button"
      >
        {creatingOrder ? (
          <><span className="spinner-border spinner-border-sm me-2" />Creating...</>
        ) : (
          <><i className="bi bi-bag-check me-2"></i>Create Order - {money(orderTotal)}</>
        )}
      </button>
    </section>
  );
}

function ExistingOrderSection({ item, onUpdated }) {
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const current = normalize(item.orderStatus || item.status);
  const allowed = ORDER_FLOW[current] || [];
  const [status, setStatus] = useState(allowed[0] || '');
  const [pharmacistNotes, setPharmacistNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelledBy, setCancelledBy] = useState('Pharmacy');
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item.orderId) return;
    let alive = true;
    setLoading(true);
    pharmacyApi.getOrderById(item.orderId)
      .then((data) => { if (alive) setOrderData(data); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [item.orderId]);

  const order = orderData || item;
  const stageSpecificCopy = item.workflowStage === 'AWAITING_PAYMENT'
    ? 'Waiting for payment.'
    : item.workflowStage === 'PREPARING'
    ? 'Payment received. Prepare medicines.'
    : item.workflowStage === 'REVISION_REQUESTED'
    ? 'Patient requested changes. Please update the order quote.'
    : null;

  const submit = async (event) => {
    event.preventDefault();
    if (!status) return;
    setSaving(true);
    try {
      await pharmacyApi.updateOrderStatus(order.orderId, {
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

  if (loading) {
    return (
      <section className="pharmacy-case-section">
        <div className="pharmacy-bootstrap-loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span>Loading order details...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="pharmacy-case-section">
      <h3><i className="bi bi-receipt me-2"></i>Order {order.orderNumber || `#${order.orderId}`}</h3>

      {stageSpecificCopy && (
        <div className="alert alert-info py-2 small">{stageSpecificCopy}</div>
      )}

      <div className="pharmacy-detail-grid">
        <Detail label="Status" value={<span className={`pharmacy-status ${statusClass(order.orderStatus || order.status)}`}>{titleCase(order.orderStatus || order.status)}</span>} />
        <Detail label="Payment" value={`${order.paymentStatus || '-'}`} />
        <Detail label="Medicine Amount" value={money(order.medicineAmount)} />
        <Detail label="Total" value={money(order.totalAmount)} />
        <Detail label="Delivery Fee" value={money(order.deliveryFee)} />
        {order.pharmacyEarning != null && <Detail label="Earning" value={money(order.pharmacyEarning)} />}
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

      {(order.deliveryAddress || order.deliveryType) && (
        <Detail label="Delivery" value={`${order.deliveryType || '-'}: ${order.deliveryAddress || 'Not provided'}`} block />
      )}

      {allowed.length > 0 && (
        <form className="pharmacy-form mt-2" onSubmit={submit}>
          <h4>Update Status</h4>
          <select className="form-select" onChange={(e) => setStatus(e.target.value)} value={status}>
            {allowed.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </select>
          {status === 'SHIPPING' && (
            <input className="form-control" onChange={(e) => setEstimatedDeliveryTime(e.target.value)} type="datetime-local" value={estimatedDeliveryTime} />
          )}
          {status === 'CANCELLED' && (
            <>
              <select className="form-select" onChange={(e) => setCancelledBy(e.target.value)} value={cancelledBy}>
                <option value="Pharmacy">Cancelled by Pharmacy</option>
                <option value="Patient">Cancelled by Patient</option>
                <option value="System">Cancelled by System</option>
              </select>
              <textarea className="form-control" onChange={(e) => setCancelReason(e.target.value)} placeholder="Cancellation reason" required value={cancelReason} />
            </>
          )}
          <textarea className="form-control" onChange={(e) => setPharmacistNotes(e.target.value)} placeholder="Pharmacist notes" value={pharmacistNotes} />
          <button className="btn btn-primary w-100" disabled={saving} type="submit">
            {saving ? 'Saving...' : 'Save Status'}
          </button>
        </form>
      )}
    </section>
  );
}

function OrderCaseActionBar({ item, actions, onUpdated }) {
  const hasAction = (action) => actions.includes(action);
  const [saving, setSaving] = useState(false);

  const updateStatus = async (status) => {
    const confirmMessages = {
      IN_REVIEW: 'Accept this consultation request?',
      CANCELLED: 'Reject this consultation request? This action cannot be undone.',
    };
    if (confirmMessages[status] && !window.confirm(confirmMessages[status])) return;

    setSaving(true);
    try {
      if (item.requestId) {
        await pharmacyApi.updateConsultationStatus(item.requestId, { status, pharmacyNotes: item.pharmacyNotes || '' });
      } else if (item.orderId) {
        await pharmacyApi.updateOrderStatus(item.orderId, { status });
      }
      toast.success('Status updated.');
      await onUpdated();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update.');
    } finally {
      setSaving(false);
    }
  };

  if (actions.length === 0 || actions.every((a) => a === 'VIEW_ONLY')) return null;

  return (
    <div className="pharmacy-case-action-bar">
      {hasAction('ACCEPT_REQUEST') && (
        <button className="btn btn-success btn-sm" disabled={saving} onClick={() => updateStatus('IN_REVIEW')} type="button">
          <i className="bi bi-check2 me-1"></i>Accept
        </button>
      )}
      {hasAction('REJECT_REQUEST') && (
        <button className="btn btn-outline-danger btn-sm" disabled={saving} onClick={() => updateStatus('CANCELLED')} type="button">
          <i className="bi bi-x-circle me-1"></i>Reject
        </button>
      )}
      {hasAction('UPDATE_ORDER_STATUS') && (
        <span className="badge bg-info ms-2">Use order section above to update status</span>
      )}
      {hasAction('CANCEL_ORDER') && item.orderId && (
        <button className="btn btn-outline-danger btn-sm" disabled={saving} onClick={() => updateStatus('CANCELLED')} type="button">
          <i className="bi bi-x-circle me-1"></i>Cancel Order
        </button>
      )}
    </div>
  );
}

const TIMING_OPTIONS = [
  { value: 'MORNING', label: 'Morning', icon: 'bi-sunrise' },
  { value: 'AFTERNOON', label: 'Afternoon', icon: 'bi-sun' },
  { value: 'EVENING', label: 'Evening', icon: 'bi-moon' },
];

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

function getPrescriptionItems(prescription) {
  return prescription.items || prescription.medications || [];
}

function getPrescriptionId(prescription) {
  return prescription.prescriptionHeaderId || prescription.prescriptionHeaderID || prescription.id || 'N/A';
}

function getPrescriptionItemKey(prescription, item, index) {
  const prescriptionId = getPrescriptionId(prescription);
  const itemId = item.prescriptionItemId || item.prescriptionItemID || item.id || null;
  return `${prescriptionId}-${itemId || item.medicineId || item.medicationName || index}`;
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

function getMedicineDisplayName(medicine = {}) {
  const brandName = medicine.brandName || '';
  const genericName = medicine.genericName || medicine.name || medicine.medicineName || '';
  if (brandName && genericName && brandName.toLowerCase() !== genericName.toLowerCase()) {
    return `${brandName} (${genericName})`;
  }
  return brandName || genericName || `Medicine #${medicine.medicineId || medicine.id || 'N/A'}`;
}

function isDeliveryPreferred(value) {
  return normalize(value) === 'DELIVERY';
}

function mapPrescriptionToOrderItems(prescription) {
  const rawPrescriptionId = prescription.prescriptionHeaderId || prescription.prescriptionHeaderID || prescription.id || null;
  const prescriptionId = rawPrescriptionId || 'unknown';
  return getPrescriptionItems(prescription).map((item, index) => {
    const originalItemId = item.prescriptionItemId || item.prescriptionItemID || item.id || null;
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
      .catch(() => { if (alive) setMedicines([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
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

  const medicineOptions = useMemo(() => medicines.map((m) => {
    const displayName = getMedicineDisplayName(m);
    const medicineId = m.medicineId || m.id;
    const searchableText = [displayName, m.brandName, m.genericName, m.name, m.medicineName, m.dosageForm, m.strength, m.manufacturer, m.unit]
      .filter(Boolean).join(' ').toLowerCase();
    return { ...m, medicineId, displayName, searchLabel: [displayName, m.strength].filter(Boolean).join(' - '), searchableText };
  }), [medicines]);

  const filteredMedicines = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return medicineOptions;
    const LIBRARY_FILTERS = [
      { key: 'brandName', label: 'Brand Name' },
      { key: 'genericName', label: 'Generic Name' },
      { key: 'dosageForm', label: 'Dosage Form' },
      { key: 'manufacturer', label: 'Manufacturer' },
    ];
    const enabledKeys = LIBRARY_FILTERS.filter((f) => filters[f.key]).map((f) => f.key);
    return medicineOptions.filter((med) => (
      med.searchableText.includes(normalizedQuery)
      || enabledKeys.some((key) => String(med[key] || '').toLowerCase().includes(normalizedQuery))
    ));
  }, [filters, medicineOptions, query]);

  return (
    <div className="pharmacy-medicine-library">
      <button className="pharmacy-medicine-library-backdrop" onClick={onClose} type="button" aria-label="Close" />
      <div aria-modal="true" className="pharmacy-medicine-library-dialog" role="dialog">
        <div className="pharmacy-medicine-library-header">
          <div className="pharmacy-medicine-library-search">
            <i className="bi bi-search"></i>
            <input autoFocus className="form-control" onChange={(e) => setQuery(e.target.value)} placeholder="Search medicines..." value={query} />
          </div>
          <button className="btn btn-light btn-sm" onClick={() => setShowFilters((c) => !c)} type="button">
            <i className="bi bi-funnel"></i>
          </button>
          <button className="btn btn-light btn-sm" onClick={onClose} type="button" aria-label="Close">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {showFilters && (
          <div className="d-flex gap-2 p-2 border-bottom">
            {['brandName', 'genericName', 'dosageForm', 'manufacturer'].map((key) => (
              <label className="form-check form-check-inline small" key={key}>
                <input checked={filters[key]} className="form-check-input" onChange={() => setFilters((c) => ({ ...c, [key]: !c[key] }))} type="checkbox" />
                <span className="form-check-label">{key === 'brandName' ? 'Brand' : key === 'genericName' ? 'Generic' : key === 'dosageForm' ? 'Form' : 'Mfr'}</span>
              </label>
            ))}
          </div>
        )}

        <div className="p-2" style={{ overflow: 'auto', maxHeight: '60vh' }}>
          {loading ? (
            <div className="pharmacy-bootstrap-loading">
              <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
              <span>Loading medicines...</span>
            </div>
          ) : filteredMedicines.length ? filteredMedicines.map((medicine) => {
            const isSelected = selectedMedicineIds.has(medicine.medicineId);
            return (
              <div className="pharmacy-medicine-library-result" key={medicine.medicineId || medicine.displayName}>
                <div className="pharmacy-medicine-library-result-content">
                  <div className="pharmacy-medicine-library-result-title">
                    <h4>{medicine.displayName}</h4>
                    {medicine.strength && <span className="badge bg-light text-primary border ms-1">{medicine.strength}</span>}
                  </div>
                  <p className="small text-muted">{medicine.manufacturer || ''}</p>
                </div>
                <button className={`btn btn-sm ${isSelected ? 'btn-outline-secondary' : 'btn-primary'}`} disabled={isSelected} onClick={() => onSelect(medicine)} type="button">
                  <i className={`bi ${isSelected ? 'bi-check2' : 'bi-plus-lg'} me-1`}></i>
                  {isSelected ? 'Added' : 'Add'}
                </button>
              </div>
            );
          }) : (
            <div className="pharmacy-empty">
              <span className="material-symbols-outlined">search</span>
              <h3>No medicines matched</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getOrderTime(order) {
  return order?.createdAt || order?.confirmedAt || order?.deliveredAt;
}
