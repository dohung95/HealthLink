import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import pharmacyApi from '../../api/pharmacyApi';
import {
  KANBAN_COLUMNS,
  getWorkflowStage,
  isActiveOrderWorkItem,
  matchesPharmacyWorkflowSearch,
  getNextOrderStatus,
  compactCardClass,
  compactCardSubtitle,
  compactCardMeta,
  paymentStatusTone,
  paymentStatusLabel,
} from './workflow/pharmacyWorkflow';
import PharmacyOrderDetailModal from './PharmacyOrderDetailModal';

export default function PharmacyKanbanOrdersPage({ workItems, reload }) {
  const [query, setQuery] = useState('');
  const [detailItem, setDetailItem] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const activeItems = useMemo(
    () => (Array.isArray(workItems) ? workItems : []).filter(isActiveOrderWorkItem),
    [workItems],
  );

  const filteredItems = useMemo(
    () => activeItems.filter((item) => matchesPharmacyWorkflowSearch(item, query)),
    [activeItems, query],
  );

  const columns = useMemo(() => KANBAN_COLUMNS.map((column) => ({
    ...column,
    items: filteredItems.filter((item) => column.stages.includes(getWorkflowStage(item))),
  })), [filteredItems]);

  const handleQuickStatus = async (item) => {
    const nextStatus = getNextOrderStatus(item);
    if (!nextStatus) return;
    setSavingId(item.orderId || item.caseId);
    try {
      await pharmacyApi.updateOrderStatus(item.orderId, {
        status: nextStatus,
        pharmacistNotes: item.pharmacistNotes || '',
      });
      toast.success(`Order moved to ${nextStatus}.`);
      setDetailItem(null);
      await reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update order status.');
    } finally {
      setSavingId(null);
    }
  };

  const handleChat = () => {
    toast.info('Chat feature coming soon');
  };

  return (
    <div className="pharmacy-workflow-page">
      <div className="pharmacy-workflow-header">
        <div className="pharmacy-workflow-title">
          <h1>Kanban Orders</h1>
          <p>{activeItems.length} active orders</p>
        </div>
        <div className="pharmacy-workflow-search">
          <span className="material-symbols-outlined">search</span>
          <input
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by phone, patient, order number..."
            value={query}
          />
        </div>
      </div>

      <div className="pharmacy-kanban-board">
        {columns.map((column) => (
          <div className="pharmacy-kanban-column" key={column.key}>
            <div className="pharmacy-kanban-column__header">
              <strong>{column.label}</strong>
              <span className="pharmacy-order-tab-count">{column.items.length}</span>
            </div>
            <div className="pharmacy-kanban-column__body">
              {column.items.length === 0 ? (
                <div className="pharmacy-empty compact" style={{ padding: '16px 8px' }}>
                  <p style={{ margin: 0, fontSize: 12 }}>No items</p>
                </div>
              ) : (
                column.items.map((item) => {
                  const itemKey = item.orderId || item.caseId || item.workItemId;
                  const subtitle = compactCardSubtitle(item);
                  const meta = compactCardMeta(item);

                  return (
                    <div
                      className={`pharmacy-kanban-card ${compactCardClass(item)}`}
                      key={itemKey}
                      onClick={() => setDetailItem(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') setDetailItem(item); }}
                    >
                      <div className="pharmacy-kanban-card__header">
                        <span className={`pharmacy-status ${paymentStatusTone(item.paymentStatus)}`}>
                          {paymentStatusLabel(item.paymentStatus)}
                        </span>
                        <span className="pharmacy-kanban-card__stage">{getWorkflowStage(item)}</span>
                      </div>
                      <strong className="pharmacy-kanban-card__id">
                        {item.orderNumber || `#${item.orderId}`}
                      </strong>
                      {subtitle && (
                        <span className="pharmacy-kanban-card__subtitle">{subtitle}</span>
                      )}
                      {meta && (
                        <span className="pharmacy-kanban-card__meta">{meta}</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {detailItem && (
        <PharmacyOrderDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onStatusUpdate={handleQuickStatus}
          onChat={handleChat}
          savingId={savingId}
        />
      )}
    </div>
  );
}


