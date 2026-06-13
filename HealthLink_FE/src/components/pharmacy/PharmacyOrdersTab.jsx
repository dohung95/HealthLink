import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

import pharmacyApi from '../../api/pharmacyApi';
import {
  CreateOrderModal,
  DEFAULT_STAGE_GROUP,
  Detail,
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

function caseLabel(item) {
  return item.displayId || item.orderNumber || `#${item.orderId || item.requestId}`;
}

function isDeliveryOrder(item) {
  return normalize(item.deliveryType) === 'DELIVERY';
}

function getOrderStatus(item) {
  return normalize(item.orderStatus || item.status || item.workflowStage);
}

function getNextOrderStatus(item) {
  const status = getOrderStatus(item);
  if (status === 'PREPARING') return 'READY';
  if (status === 'READY') return isDeliveryOrder(item) ? 'SHIPPING' : 'DELIVERED';
  if (status === 'SHIPPING') return 'DELIVERED';
  if (status === 'DELIVERED') return 'COMPLETED';
  return null;
}

function visibleActions(item) {
  const actions = item.availableActions || [];
  const has = (a) => actions.includes(a);
  if (has('ACCEPT_REQUEST')) return ['ACCEPT_REQUEST', 'REJECT_REQUEST'];
  const visible = [];
  if (has('CREATE_ORDER')) visible.push('CREATE_ORDER');
  if (has('UPDATE_ORDER_STATUS') && getNextOrderStatus(item)) visible.push('UPDATE_ORDER_STATUS');
  if (has('CANCEL_ORDER')) visible.push('CANCEL_ORDER');
  return visible;
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

const GROUP_EMPTY_MESSAGES = {
  NEW_REQUESTS: { icon: 'inbox', title: 'No new consultation requests', desc: '' },
  CONSULTING: { icon: 'chat', title: 'No active consultations', desc: '' },
  PAYMENT_DUE: { icon: 'payments', title: 'No orders awaiting payment', desc: '' },
  DELIVERY: { icon: 'local_shipping', title: 'No orders in delivery', desc: '' },
  HISTORY: { icon: 'history', title: 'No order history yet', desc: '' },
};

export function OrderCaseTable({
  items,
  compact = false,
  onAcceptRequest,
  onRejectRequest,
  onCreateOrder,
  onUpdateOrderStatus,
  onCancelOrder,
  updatingRequestId,
  updatingOrderId,
  activeStage,
  activeStageGroup,
}) {
  if (!items.length) {
    const empty = GROUP_EMPTY_MESSAGES[activeStageGroup] || STAGE_EMPTY_MESSAGES[activeStage] || { icon: 'inbox', title: 'No cases found', desc: 'Cases matching your filters will appear here.' };
    return (
      <div className="pharmacy-empty">
        <span className="material-symbols-outlined">{empty.icon}</span>
        <h3>{empty.title}</h3>
        {empty.desc && <p>{empty.desc}</p>}
      </div>
    );
  }

  const rows = items.map((item) => {
    const rowActions = visibleActions(item);
    const nextOrderStatus = getNextOrderStatus(item);
    const updatingThisOrder = updatingOrderId === item.orderId;

    return (
      <tr
        className="pharmacy-case-row"
        key={item.caseId || item.workItemId}
      >
      <td>
        <strong>{caseLabel(item)}</strong>
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
          {rowActions.includes('ACCEPT_REQUEST') && (
            <button className="btn btn-sm btn-outline-success me-1" disabled={updatingRequestId === item.requestId} onClick={(e) => { e.stopPropagation(); onAcceptRequest?.(item); }} type="button" title="Accept">
              <i className="bi bi-check2"></i>
            </button>
          )}
          {rowActions.includes('REJECT_REQUEST') && (
            <button className="btn btn-sm btn-outline-danger me-1" disabled={updatingRequestId === item.requestId} onClick={(e) => { e.stopPropagation(); onRejectRequest?.(item); }} type="button" title="Reject">
              <i className="bi bi-x-circle"></i>
            </button>
          )}
          {rowActions.includes('CREATE_ORDER') && (
            <button className="btn btn-sm btn-outline-primary me-1" onClick={(e) => { e.stopPropagation(); onCreateOrder?.(item); }} type="button" title="Create Order">
              <i className="bi bi-bag-plus"></i>
            </button>
          )}
          {rowActions.includes('UPDATE_ORDER_STATUS') && (
            <button className="btn btn-sm btn-outline-success me-1" disabled={updatingThisOrder} onClick={(e) => { e.stopPropagation(); onUpdateOrderStatus?.(item); }} type="button" title={`Mark ${titleCase(nextOrderStatus)}`}>
              <i className={`bi ${nextOrderStatus === 'SHIPPING' ? 'bi-truck' : 'bi-check2-circle'}`}></i>
            </button>
          )}
          {rowActions.includes('CANCEL_ORDER') && (
            <button className="btn btn-sm btn-outline-danger" disabled={updatingThisOrder} onClick={(e) => { e.stopPropagation(); onCancelOrder?.(item); }} type="button" title="Cancel Order">
              <i className="bi bi-slash-circle"></i>
            </button>
          )}
        </td>
      )}
      </tr>
    );
  });

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

const LEGACY_GROUP_ALIASES = {
  ALL: DEFAULT_STAGE_GROUP,
  NEEDS_INFO: 'CONSULTING',
  QUOTE_SENT: 'PAYMENT_DUE',
  PREPARING: 'DELIVERY',
  READY: 'DELIVERY',
  DONE: 'HISTORY',
};

function targetGroupForStage(stage) {
  return getStageGroupKey(stage) || DEFAULT_STAGE_GROUP;
}

function resolveInitialGroup(searchParams) {
  const groupParam = normalize(searchParams.get('group'));
  if (groupParam) {
    const match = STAGE_GROUPS.find((g) => g.key === groupParam);
    if (match) return match.key;
    if (LEGACY_GROUP_ALIASES[groupParam]) return LEGACY_GROUP_ALIASES[groupParam];
  }

  const legacyStage = normalize(searchParams.get('stage'));
  if (legacyStage) {
    if (LEGACY_GROUP_ALIASES[legacyStage]) return LEGACY_GROUP_ALIASES[legacyStage];
    return targetGroupForStage(legacyStage);
  }

  return DEFAULT_STAGE_GROUP;
}

function PharmacyConfirmModal({ action, saving, onCancel, onConfirm }) {
  if (!action) return null;
  return (
    <div className="pharmacy-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="pharmacy-confirm-title">
      <button className="pharmacy-confirm-backdrop" onClick={onCancel} type="button" aria-label="Cancel" />
      <div className="pharmacy-confirm-card">
        <div className={`pharmacy-confirm-icon ${action.variant || 'primary'}`}>
          <i className={`bi ${action.icon || 'bi-question-circle'}`}></i>
        </div>
        <h2 id="pharmacy-confirm-title">{action.title}</h2>
        <p>{action.message}</p>
        <div className="pharmacy-confirm-actions">
          <button className="btn btn-light" disabled={saving} onClick={onCancel} type="button">
            Cancel
          </button>
          <button className={`btn btn-${action.variant || 'primary'}`} disabled={saving} onClick={onConfirm} type="button">
            {saving ? 'Saving...' : action.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PharmacyOrdersTab({ workItems, orders, globalSearch, reload, profile }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeStageGroup, setActiveStageGroup] = useState(() => resolveInitialGroup(searchParams));
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [deliveryFilter, setDeliveryFilter] = useState('ALL');
  const [createOrderRequest, setCreateOrderRequest] = useState(null);
  const [updatingRequestId, setUpdatingRequestId] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [page, setPage] = useState(1);
  const deferredQuery = useDebouncedValue(`${globalSearch} ${query}`.trim());
  const pageSize = 10;

  const activeGroup = useMemo(
    () => STAGE_GROUPS.find((g) => g.key === activeStageGroup),
    [activeStageGroup],
  );
  const activeStages = useMemo(
    () => activeGroup ? activeGroup.stages : [],
    [activeGroup],
  );

  const selectStageGroup = (groupKey) => {
    if (!STAGE_GROUPS.some((group) => group.key === groupKey)) return;
    setActiveStageGroup(groupKey);
  };

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

  const showStageToast = (message, targetGroupKey) => {
    const targetGroup = STAGE_GROUPS.find((group) => group.key === targetGroupKey);
    toast.success(message, {
      icon: <i className="bi bi-check-circle-fill" aria-hidden="true"></i>,
      action: targetGroup ? {
        label: `Go to ${targetGroup.label}`,
        onClick: () => selectStageGroup(targetGroup.key),
      } : undefined,
    });
  };

  const updateRequestStatus = async (item, status, targetGroupKey, successMessage) => {
    if (!item?.requestId) return;
    setUpdatingRequestId(item.requestId);
    try {
      await pharmacyApi.updateConsultationStatus(item.requestId, {
        status,
        pharmacyNotes: item.pharmacyNotes || '',
      });
      await reload();
      showStageToast(successMessage, targetGroupKey);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update request.');
      throw error;
    } finally {
      setUpdatingRequestId(null);
    }
  };

  const updateOrderStatus = async (item, status, targetGroupKey, successMessage) => {
    if (!item?.orderId) return;
    setUpdatingOrderId(item.orderId);
    try {
      await pharmacyApi.updateOrderStatus(item.orderId, {
        status,
        pharmacistNotes: item.pharmacistNotes || '',
        cancelReason: status === 'CANCELLED' ? 'Cancelled by pharmacy' : undefined,
        cancelledBy: status === 'CANCELLED' ? 'Pharmacy' : undefined,
      });
      await reload();
      showStageToast(successMessage, targetGroupKey);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update order.');
      throw error;
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const confirmPendingAction = async () => {
    if (!pendingAction?.run) return;
    setConfirmSaving(true);
    try {
      await pendingAction.run();
      setPendingAction(null);
    } catch {
      // The mutation helper already shows the API error toast.
    } finally {
      setConfirmSaving(false);
    }
  };

  const closePendingAction = () => {
    if (!confirmSaving) setPendingAction(null);
  };

  const handleAcceptRequest = (item) => {
    setPendingAction({
      title: 'Accept request?',
      message: `Accept ${caseLabel(item)} and move it to Consulting?`,
      confirmText: 'Accept Request',
      icon: 'bi-check2-circle',
      variant: 'success',
      run: () => updateRequestStatus(item, 'IN_REVIEW', 'CONSULTING', 'Request accepted.'),
    });
  };

  const handleRejectRequest = (item) => {
    setPendingAction({
      title: 'Reject request?',
      message: `Reject ${caseLabel(item)} and move it to History?`,
      confirmText: 'Reject Request',
      icon: 'bi-x-circle',
      variant: 'danger',
      run: () => updateRequestStatus(item, 'CANCELLED', 'HISTORY', 'Request rejected.'),
    });
  };

  const handleCreateOrder = (item) => {
    setCreateOrderRequest(item);
  };

  const handleUpdateOrderStatus = (item) => {
    const nextStatus = getNextOrderStatus(item);
    if (!nextStatus) return;
    const nextLabel = titleCase(nextStatus);
    setPendingAction({
      title: `Mark ${nextLabel}?`,
      message: `Update ${caseLabel(item)} to ${nextLabel}?`,
      confirmText: `Mark ${nextLabel}`,
      icon: nextStatus === 'SHIPPING' ? 'bi-truck' : 'bi-check2-circle',
      variant: 'success',
      run: () => updateOrderStatus(
        item,
        nextStatus,
        targetGroupForStage(nextStatus),
        `Order marked ${nextLabel.toLowerCase()}.`,
      ),
    });
  };

  const handleCancelOrder = (item) => {
    setPendingAction({
      title: 'Cancel order?',
      message: `Cancel ${caseLabel(item)} and move it to History?`,
      confirmText: 'Cancel Order',
      icon: 'bi-slash-circle',
      variant: 'danger',
      run: () => updateOrderStatus(item, 'CANCELLED', 'HISTORY', 'Order cancelled.'),
    });
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

        <div className="pharmacy-order-tabs" role="tablist" aria-label="Order stages">
          {STAGE_GROUPS.map((group) => (
            <button
              aria-selected={activeStageGroup === group.key}
              className={`pharmacy-order-tab ${activeStageGroup === group.key ? 'is-active' : ''}`}
              key={group.key}
              onClick={() => selectStageGroup(group.key)}
              role="tab"
              type="button"
            >
              <span className="pharmacy-order-tab-label">{group.label}</span>
              <span className="pharmacy-order-tab-count">{groupCounts[group.key] || 0}</span>
            </button>
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
          activeStageGroup={activeStageGroup}
          items={visible}
          onAcceptRequest={handleAcceptRequest}
          onRejectRequest={handleRejectRequest}
          onCreateOrder={handleCreateOrder}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onCancelOrder={handleCancelOrder}
          updatingRequestId={updatingRequestId}
          updatingOrderId={updatingOrderId}
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
            selectStageGroup('PAYMENT_DUE');
          }}
        />
      )}

      <PharmacyConfirmModal
        action={pendingAction}
        saving={confirmSaving}
        onCancel={closePendingAction}
        onConfirm={confirmPendingAction}
      />
    </>
  );
}
