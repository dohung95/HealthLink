import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { money, dateTime } from '../../utils/pharmacy/pharmacyHelpers';
import {
  ORDER_LIST_TABS,
  getWorkflowStage,
  isOrderListWorkItem,
  matchesPharmacyWorkflowSearch,
  mergeWorkflowItemsWithOrders,
} from './workflow/pharmacyWorkflow';
import PharmacyOrderDetailModal from './PharmacyOrderDetailModal';

const PAGE_SIZE = 6;

export default function PharmacyOrderListPage({ workItems, orders }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'PAYMENT_DUE';
  const [activeTab, setActiveTab] = useState(
    ORDER_LIST_TABS.some((t) => t.key === initialTab) ? initialTab : 'PAYMENT_DUE',
  );
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState(null);
  const allItems = useMemo(() => (
    mergeWorkflowItemsWithOrders(workItems, orders).filter(isOrderListWorkItem)
  ), [orders, workItems]);

  const visibleItems = useMemo(() => {
    const tab = ORDER_LIST_TABS.find((t) => t.key === activeTab);
    const stages = tab?.stages || [];
    return allItems.filter((item) => matchesPharmacyWorkflowSearch(item, query)).filter((item) => {
      if (activeTab === 'ALL') return true;
      return stages.includes(getWorkflowStage(item));
    });
  }, [activeTab, query, allItems]);

  const pages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
  const pagedItems = visibleItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tabCounts = useMemo(() => {
    const counts = {};
    ORDER_LIST_TABS.forEach((tab) => {
      if (tab.key === 'ALL') {
        counts[tab.key] = allItems.length;
      } else {
        counts[tab.key] = allItems.filter((item) =>
          tab.stages.includes(getWorkflowStage(item)),
        ).length;
      }
    });
    return counts;
  }, [allItems]);

  const switchTab = (key) => {
    setActiveTab(key);
    setSearchParams(key === 'PAYMENT_DUE' ? {} : { tab: key });
    setPage(1);
    setDetailItem(null);
  };

  const handleRowClick = (item) => {
    setDetailItem(item);
  };

  return (
    <>
      <div className="pharmacy-workflow-header">
        <div className="pharmacy-workflow-title">
          <span className="material-symbols-outlined">receipt_long</span>
          <h1>Order List</h1>
        </div>
        <div className="pharmacy-workflow-search">
          <span className="material-symbols-outlined">search</span>
          <input
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search by phone, patient, order number..."
            value={query}
          />
        </div>
      </div>
      <div className="pharmacy-workflow-page pharmacy-workflow-surface">

      <div className="pharmacy-order-tabs">
        {ORDER_LIST_TABS.map((tab) => (
          <button
            className={`pharmacy-order-tab ${activeTab === tab.key ? 'is-active' : ''}`}
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            type="button"
          >
            {tab.label}
            <span className="pharmacy-order-tab-count">{tabCounts[tab.key] || 0}</span>
          </button>
        ))}
      </div>

      <div className="pharmacy-table-wrap">
        <table className="pharmacy-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Patient</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="pharmacy-empty compact" style={{ padding: '24px 16px' }}>
                    <span className="material-symbols-outlined">receipt_long</span>
                    <h3>No orders found</h3>
                    <p>No orders match the current filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              pagedItems.map((item) => {
                const itemKey = item.orderId || item.caseId || item.workItemId;

                return (
                  <tr
                    key={itemKey}
                    className="pharmacy-order-list-row"
                    onClick={() => handleRowClick(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRowClick(item); }}
                  >
                    <td>
                      <strong style={{ fontSize: 13 }}>
                        {item.orderNumber || `#${item.orderId}`}
                      </strong>
                    </td>
                    <td style={{ fontSize: 13 }}>{item.patientName || 'Unknown'}</td>
                    <td style={{ color: 'var(--pharmacy-muted)', fontSize: 13 }}>{item.deliveryPhoneNumber || '-'}</td>
                    <td>
                      <span className={`pharmacy-status ${paymentStatusTone(getWorkflowStage(item))}`}>
                        {getWorkflowStage(item)}
                      </span>
                      {item.requiresPatientConfirmation && (
                        <span className="pharmacy-status is-warning" style={{ fontSize: 10, marginLeft: 4 }}>
                          Awaiting patient confirmation
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`pharmacy-status ${paymentStatusTone(item.paymentStatus)}`} style={{ fontSize: 10 }}>
                        {item.paymentStatus || 'N/A'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: 13 }}>{money(item.totalAmount || item.totalPrice || 0)}</td>
                    <td style={{ color: 'var(--pharmacy-muted)', fontSize: 12 }}>{dateTime(item.updatedAt || item.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="pharmacy-pagination-bar">
          <span>{visibleItems.length} orders</span>
          <div className="pharmacy-pagination-actions">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} type="button">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={p === page ? 'is-active' : ''}
                onClick={() => setPage(p)}
                type="button"
              >
                {p}
              </button>
            ))}
            <button disabled={page === pages} onClick={() => setPage(page + 1)} type="button">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {detailItem && (
        <PharmacyOrderDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
    </>
  );
}

function paymentStatusTone(status) {
  const ns = (status || '').toUpperCase().trim();
  if (ns === 'PAID' || ns === 'COMPLETED') return 'is-success';
  if (['REFUNDED', 'FAILED', 'CANCELLED'].includes(ns)) return 'is-danger';
  return 'is-pending';
}
