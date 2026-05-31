import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import pharmacyApi from '../../../api/pharmacyApi';
import {
  Detail,
  MetricCard,
  ORDER_FLOW,
  ORDER_TABS,
  Pagination,
  dateTime,
  exportCsv,
  getOrderTime,
  money,
  normalize,
  statusClass,
  titleCase,
  useDebouncedValue,
} from '../common/pharmacyDashboardShared';

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
                <span>{order.diagnosis || order.notes || 'Prescription order'}</span>
              </td>
              {!compact && <td>{order.deliveryType || '-'}</td>}
              <td>{dateTime(getOrderTime(order))}</td>
              <td>
                <span className={`pharmacy-status ${statusClass(order.paymentStatus)}`}>
                  {order.paymentStatus || 'Pending'} {order.totalAmount != null ? `(${money(order.totalAmount)})` : ''}
                </span>
              </td>
              <td><span className={`pharmacy-status ${statusClass(order.status)}`}>{order.status || '-'}</span></td>
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

export default function PharmacyOrdersTab({ orders, globalSearch, reload }) {
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [deliveryFilter, setDeliveryFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const deferredQuery = useDebouncedValue(`${globalSearch} ${query}`.trim());
  const pageSize = 8;

  const filtered = useMemo(() => {
    const now = new Date();
    return orders.filter((order) => {
      const statusMatches = activeStatus === 'ALL' || normalize(order.status) === activeStatus;
      const deliveryMatches = deliveryFilter === 'ALL' || normalize(order.deliveryType) === deliveryFilter;
      const text = [
        order.orderNumber,
        order.patientName,
        order.diagnosis,
        order.notes,
        order.deliveryAddress,
        order.paymentStatus,
      ].join(' ').toLowerCase();
      const queryMatches = !deferredQuery || text.includes(deferredQuery.toLowerCase());

      if (!statusMatches || !deliveryMatches || !queryMatches) return false;
      if (dateFilter === 'ALL') return true;

      const created = new Date(getOrderTime(order) || 0);
      const diffDays = (now - created) / 86400000;
      if (dateFilter === 'TODAY') return created.toDateString() === now.toDateString();
      if (dateFilter === '7D') return diffDays <= 7;
      return true;
    });
  }, [orders, activeStatus, deliveryFilter, deferredQuery, dateFilter]);

  const stats = {
    PENDING: orders.filter((item) => normalize(item.status) === 'PENDING').length,
    PREPARING: orders.filter((item) => normalize(item.status) === 'PREPARING').length,
    READY: orders.filter((item) => normalize(item.status) === 'READY').length,
  };
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [activeStatus, query, globalSearch, dateFilter, deliveryFilter]);

  return (
    <>
      <div className="pharmacy-metrics-grid is-three">
        <MetricCard label="Pending Orders" value={stats.PENDING} hint="Needs action" icon="schedule" tone="warning" />
        <MetricCard label="Preparing" value={stats.PREPARING} hint="In fulfillment" icon="hourglass_empty" tone="info" />
        <MetricCard label="Ready for Pickup" value={stats.READY} hint="Ready orders" icon="storefront" tone="success" />
      </div>

      <section className="pharmacy-card">
        <div className="pharmacy-tabs">
          {ORDER_TABS.map((status) => (
            <button className={activeStatus === status ? 'active' : ''} key={status} onClick={() => setActiveStatus(status)} type="button">
              {status === 'ALL' ? 'All Orders' : titleCase(status)}
              {status !== 'ALL' && <span>{orders.filter((item) => normalize(item.status) === status).length}</span>}
            </button>
          ))}
        </div>

        <div className="pharmacy-filter-bar">
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Search ID or Patient..." value={query} />
          <select onChange={(event) => setDateFilter(event.target.value)} value={dateFilter}>
            <option value="ALL">Any date</option>
            <option value="TODAY">Today</option>
            <option value="7D">Last 7 days</option>
          </select>
          <select onChange={(event) => setDeliveryFilter(event.target.value)} value={deliveryFilter}>
            <option value="ALL">Delivery Method: All</option>
            <option value="PICKUP">Pickup</option>
            <option value="DELIVERY">Home Delivery</option>
          </select>
          <button className="pharmacy-secondary-action pharmacy-filter-action" onClick={() => exportCsv(filtered, 'pharmacy-orders.csv')} type="button">Export CSV</button>
        </div>

        <OrderTable orders={visible} onSelect={setSelected} />
        <Pagination page={page} pages={pages} total={filtered.length} onPage={setPage} label="orders" />
      </section>

      {selected && (
        <OrderDetailDrawer
          order={selected}
          onClose={() => setSelected(null)}
          onUpdated={async () => {
            await reload();
            setSelected(null);
          }}
        />
      )}
    </>
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
            <Detail label="Status" value={<span className={`pharmacy-status ${statusClass(order.status)}`}>{order.status}</span>} />
            <Detail label="Payment" value={`${order.paymentStatus || '-'} · ${order.paymentMethod || '-'}`} />
            <Detail label="Medicine Amount" value={money(order.medicineAmount)} />
            <Detail label="Delivery Fee" value={money(order.deliveryFee)} />
            <Detail label="Total" value={money(order.totalAmount)} />
            <Detail label="Pharmacy Earning" value={money(order.pharmacyEarning)} />
          </div>

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
