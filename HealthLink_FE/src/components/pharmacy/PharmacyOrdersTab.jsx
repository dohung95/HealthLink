import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

import pharmacyApi from '../../api/pharmacyApi';
import {
  CreateOrderModal,
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
  getOrderTime,
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
  if (has('CREATE_ORDER')) return ['CREATE_ORDER'];
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

export function OrderCaseTable({ items, compact = false, onAcceptRequest, onRejectRequest, onCreateOrder, updatingRequestId, activeStage }) {
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
      className="pharmacy-case-row"
      key={item.caseId || item.workItemId}
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
            <button className="btn btn-sm btn-outline-success me-1" disabled={updatingRequestId === item.requestId} onClick={(e) => { e.stopPropagation(); onAcceptRequest?.(item); }} type="button" title="Accept">
              <i className="bi bi-check2"></i>
            </button>
          )}
          {visibleActions(item).includes('REJECT_REQUEST') && (
            <button className="btn btn-sm btn-outline-danger me-1" disabled={updatingRequestId === item.requestId} onClick={(e) => { e.stopPropagation(); onRejectRequest?.(item); }} type="button" title="Reject">
              <i className="bi bi-x-circle"></i>
            </button>
          )}
          {visibleActions(item).includes('CREATE_ORDER') && (
            <button className="btn btn-sm btn-outline-primary" onClick={(e) => { e.stopPropagation(); onCreateOrder?.(item); }} type="button" title="Create Order">
              <i className="bi bi-bag-plus"></i>
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
  const [createOrderRequest, setCreateOrderRequest] = useState(null);
  const [updatingRequestId, setUpdatingRequestId] = useState(null);
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

  const updateRequestStatus = async (item, status) => {
    if (!item?.requestId) return;
    setUpdatingRequestId(item.requestId);
    try {
      await pharmacyApi.updateConsultationStatus(item.requestId, {
        status,
        pharmacyNotes: item.pharmacyNotes || '',
      });
      toast.success(status === 'IN_REVIEW' ? 'Request accepted.' : 'Request rejected.');
      await reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update request.');
    } finally {
      setUpdatingRequestId(null);
    }
  };

  const handleAcceptRequest = (item) => updateRequestStatus(item, 'IN_REVIEW');

  const handleRejectRequest = (item) => {
    if (!window.confirm('Reject this consultation request? This action cannot be undone.')) return;
    updateRequestStatus(item, 'CANCELLED');
  };

  const handleCreateOrder = (item) => {
    setCreateOrderRequest(item);
  };

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
                onClick={() => setActiveStageGroup(group.key)}
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
          onAcceptRequest={handleAcceptRequest}
          onRejectRequest={handleRejectRequest}
          onCreateOrder={handleCreateOrder}
          updatingRequestId={updatingRequestId}
        />
        <Pagination page={page} pages={pages} total={filtered.length} onPage={setPage} label="cases" />
      </section>

      {createOrderRequest && (
        <CreateOrderModal
          request={createOrderRequest}
          profile={profile}
          onClose={() => setCreateOrderRequest(null)}
          onCreated={async () => {
            await reload();
            setCreateOrderRequest(null);
          }}
        />
      )}
    </>
  );
}




