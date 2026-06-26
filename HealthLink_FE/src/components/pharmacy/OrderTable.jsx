import { statusClass, titleCase, money, getOrderTime } from './PharmacyShared';

function orderItems(order) {
  return Array.isArray(order.items) ? order.items : [];
}

function medicationSummary(order) {
  const items = orderItems(order);
  if (!items.length) return order.diagnosis || order.notes || 'Prescription order';
  const names = items.slice(0, 3).map((item) => item.medicationName || `Medicine #${item.medicineId}`);
  return `${items.length} med${items.length === 1 ? '' : 's'}: ${names.join(', ')}${items.length > 3 ? '...' : ''}`;
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

export default function OrderTable({ orders, compact = false }) {
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
              <td>{shortDateTime(getOrderTime(order))}</td>
              <td>
                <span className={`pharmacy-status ${statusClass(order.paymentStatus)}`}>
                  {order.paymentStatus || 'Pending'} {order.totalAmount != null ? `(${money(order.totalAmount)})` : ''}
                </span>
              </td>
              <td><span className={`pharmacy-status ${statusClass(order.status)}`}>{titleCase(order.status) || '-'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
