import { STAGE_LABELS, stageClass, titleCase, money, normalize } from './PharmacyShared';

function orderNumberLabel(item) {
  if (!item.orderId) return '-';
  return item.orderNumber || `#${item.orderId}`;
}

function caseLabel(item) {
  if (item.sourceType === 'ORDER_REQUEST') return item.displayId || `Order Request #${item.requestId}`;
  if (item.sourceType === 'DIRECT_ORDER') return item.displayId || `Direct Order #${item.orderId}`;
  return item.displayId || `Request #${item.requestId}`;
}

function sourceLabel(item) {
  if (item.sourceType === 'ORDER_REQUEST') return 'Order Request';
  if (item.sourceType === 'DIRECT_ORDER') return 'Direct Order';
  return 'Consultation';
}

function sourceBadgeClass(item) {
  if (item.sourceType === 'DIRECT_ORDER') return 'is-direct';
  if (item.sourceType === 'ORDER_REQUEST') return 'is-order-request';
  return 'is-consult';
}

function paymentStatusClass(status) {
  const ns = normalize(status);
  if (ns === 'PAID') return 'is-success';
  if (['REFUNDED', 'FAILED', 'CANCELLED'].includes(ns)) return 'is-danger';
  return 'is-pending';
}

function shortDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value)).replace(',', '');
}

function isPaid(item) {
  return normalize(item.paymentStatus) === 'PAID';
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

function visibleWorkflowActions(item) {
  const actions = item.availableActions || [];
  const has = (a) => actions.includes(a);
  if (has('ACCEPT_REQUEST')) return ['ACCEPT_REQUEST', 'REJECT_REQUEST'];

  const visible = [];
  if (has('CREATE_ORDER')) visible.push('CREATE_ORDER');
  if (has('UPDATE_ORDER_STATUS') && getNextOrderStatus(item)) visible.push('UPDATE_ORDER_STATUS');
  if (has('CANCEL_ORDER') && getOrderStatus(item) !== 'READY' && !isPaid(item)) visible.push('CANCEL_ORDER');
  return visible;
}

function canChatWithPatient(item) {
  return Boolean(
    item?.patientId
      && Array.isArray(item.availableActions)
      && item.availableActions.includes('CHAT')
  );
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
  PAYMENT_DUE: { icon: 'payments', title: 'No orders awaiting payment or ready check', desc: '' },
  DELIVERY: { icon: 'local_shipping', title: 'No orders in delivery', desc: '' },
  HISTORY: { icon: 'history', title: 'No order history yet', desc: '' },
};

export default function OrderCaseTable({
  items,
  compact = false,
  onAcceptRequest,
  onRejectRequest,
  onCreateOrder,
  onUpdateOrderStatus,
  onCancelOrder,
  onChat,
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
    const rowActions = visibleWorkflowActions(item);
    const showChatAction = canChatWithPatient(item);
    const nextOrderStatus = getNextOrderStatus(item);
    const updatingThisOrder = updatingOrderId === item.orderId;

    return (
      <tr
        className="pharmacy-case-row"
        key={item.caseId || item.workItemId}
      >
      {!compact ? (
        <td>
          {item.sourceType && (
            <span className={`pharmacy-case-source-badge ${sourceBadgeClass(item)}`}>
              {sourceLabel(item)}
            </span>
          )}
          <div className="pharmacy-order-number">{orderNumberLabel(item)}</div>
        </td>
      ) : (
        <td>
          {item.sourceType && (
            <span className={`pharmacy-case-source-badge ${sourceBadgeClass(item)}`}>
              {sourceLabel(item)}
            </span>
          )}
          <div className="pharmacy-order-number">{caseLabel(item)}</div>
        </td>
      )}
      <td>
        <strong>{item.patientName || 'Unknown patient'}</strong>
        <span className="pharmacy-case-detail">{item.symptoms || item.description || ''}</span>
        {item.deliveryAddress && (
          <span className="pharmacy-case-detail delivery">
            <i className="bi bi-geo-alt me-1"></i>{item.deliveryAddress}
          </span>
        )}
        {item.deliveryPhoneNumber && (
          <span className="pharmacy-case-detail delivery">
            <i className="bi bi-telephone me-1"></i>{item.deliveryPhoneNumber}
          </span>
        )}
      </td>
      <td>
        <span className={`pharmacy-status ${stageClass(item.workflowStage)}`}>
          {STAGE_LABELS[item.workflowStage] || item.workflowStage}
        </span>
      </td>
      {!compact && <td>{item.totalAmount != null ? money(item.totalAmount) : '-'}</td>}
      {!compact && (
        <td>
          {item.paymentStatus ? (
            <span className={`pharmacy-status ${paymentStatusClass(item.paymentStatus)}`}>
              {titleCase(item.paymentStatus)}
            </span>
          ) : '-'}
        </td>
      )}
      <td>{shortDateTime(item.sortAt || item.updatedAt || item.createdAt)}</td>
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
              <i className={`bi ${nextOrderStatus === 'SHIPPING' ? 'bi-box-seam' : 'bi-check2-circle'}`}></i>
            </button>
          )}
          {rowActions.includes('CANCEL_ORDER') && (
            <button className="btn btn-sm btn-outline-danger" disabled={updatingThisOrder} onClick={(e) => { e.stopPropagation(); onCancelOrder?.(item); }} type="button" title="Cancel Order">
              <i className="bi bi-slash-circle"></i>
            </button>
          )}
          {showChatAction && (
            <button
              className="btn btn-sm btn-outline-secondary me-1 pharmacy-chat-action"
              onClick={(event) => {
                event.stopPropagation();
                onChat?.(item);
              }}
              type="button"
              title="Chat with patient"
            >
              <i className="bi bi-chat-dots"></i>
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
            {!compact && <th>Order #</th>}
            <th>Patient</th>
            <th>Stage</th>
            {!compact && <th>Total</th>}
            {!compact && <th>Payment</th>}
            <th>Updated</th>
            {!compact && <th className="text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
