import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

import pharmacyApi from '../../api/pharmacyApi';
import { useChat } from '../../context/ChatContext';
import {
  CreateOrderModal,
  DEFAULT_STAGE_GROUP,
  Pagination,
  STAGE_GROUPS,
  STAGE_LABELS,
  exportCsv,
  getOrderTime,
  money,
  normalize,
  stageClass,
  statusClass,
  titleCase,
  useDebouncedValue,
} from './PharmacyShared';
import OrderCaseTable from './OrderCaseTable';
import OrderTable from './OrderTable';

function caseLabel(item) {
  if (item.sourceType === 'ORDER_REQUEST') return item.displayId || `Order Request #${item.requestId}`;
  if (item.sourceType === 'DIRECT_ORDER') return item.displayId || `Direct Order #${item.orderId}`;
  return item.displayId || `Request #${item.requestId}`;
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

function getStageGroupKey(stage) {
  const group = STAGE_GROUPS.find((g) => g.stages.includes(stage));
  return group ? group.key : null;
}

const LEGACY_GROUP_ALIASES = {
  ALL: DEFAULT_STAGE_GROUP,
  NEEDS_INFO: 'CONSULTING',
  QUOTE_SENT: 'PAYMENT_DUE',
  PREPARING: 'PAYMENT_DUE',
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
  const [createOrderRequest, setCreateOrderRequest] = useState(null);
  const [updatingRequestId, setUpdatingRequestId] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [page, setPage] = useState(1);
  const deferredQuery = useDebouncedValue(`${globalSearch} ${query}`.trim());
  const pageSize = 10;

  const { openChatWith } = useChat();

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
    const workItemList = Array.isArray(workItems) ? workItems : [];
    const orderList = Array.isArray(orders) ? orders : [];

    if (workItemList.length > 0 && orderList.length > 0) {
      const workItemIds = new Set(workItemList.map(w => w.orderId || w.id));
      const extraOrders = orderList.filter(o => !workItemIds.has(o.orderId || o.id));
      const mapped = extraOrders.map(o => ({
        ...o, workflowStage: o.status || 'UNKNOWN', hasOrder: true,
      }));
      return [...workItemList, ...mapped];
    }
    if (workItemList.length > 0) return workItemList;
    return orderList.map(o => ({
      ...o, workflowStage: o.status || 'UNKNOWN', hasOrder: true,
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
        item.sourceType,
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

  const handleChat = (item) => {
    if (!item?.patientId) {
      toast.error('Patient contact information is missing.');
      return;
    }

    openChatWith({
      userId: item.patientId,
      displayName: item.patientName || 'Patient',
      pharmacyRequestId: item.requestId,
      pharmacyOrderId: item.orderId,
    });
  };

  return (
    <>
      <div className="pharmacy-order-ops">
        <div className="pharmacy-order-toolbar">
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
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID, patient, symptoms, type..." value={query} />
          <select onChange={(event) => setDateFilter(event.target.value)} value={dateFilter}>
            <option value="ALL">Any date</option>
            <option value="TODAY">Today</option>
            <option value="7D">Last 7 days</option>
          </select>
          <button className="pharmacy-secondary-action pharmacy-filter-action" onClick={() => {
            const cols = ['displayId', 'orderNumber', 'patientName', 'deliveryPhoneNumber', 'deliveryAddress', 'workflowStage', 'sourceType', 'totalAmount', 'paymentStatus'];
            const labelRow = ['Case', 'Order #', 'Patient', 'Delivery Phone', 'Delivery Address', 'Stage', 'Source', 'Total', 'Payment'];
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
          onChat={handleChat}
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
