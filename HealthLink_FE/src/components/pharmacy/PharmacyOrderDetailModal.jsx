import { useEffect, useMemo, useRef, useState } from 'react';
import pharmacyApi from '../../api/pharmacyApi';
import {
  paymentStatusTone,
  paymentStatusLabel,
  getNextOrderStatus,
  getItemDisplayId,
  isDeliveryOrder,
} from './workflow/pharmacyWorkflow';
import { money, dateTime, titleCase } from '../../utils/pharmacy/pharmacyHelpers';

const PICKUP_STEPS = [
  ['CONFIRMED', 'Confirmed', 'confirmedAt'],
  ['PREPARING', 'Preparing', 'preparingAt'],
  ['READY', 'Ready', null],
  ['COMPLETED', 'Picked up', 'completedAt'],
];

const DELIVERY_STEPS = [
  ['CONFIRMED', 'Confirmed', 'confirmedAt'],
  ['PREPARING', 'Preparing', 'preparingAt'],
  ['READY', 'Ready', null],
  ['SHIPPING', 'Shipping', 'shippedAt'],
  ['DELIVERED', 'Delivered', 'deliveredAt'],
  ['COMPLETED', 'Completed', 'completedAt'],
];

function actionLabel(nextStatus, pickup) {
  if (pickup && nextStatus === 'COMPLETED') return 'Mark as picked up';
  return `Mark ${titleCase(nextStatus)}`;
}

function OrderProgress({ order }) {
  const status = String(order.status || '').toUpperCase();
  const steps = isDeliveryOrder(order) ? DELIVERY_STEPS : PICKUP_STEPS;
  const currentIndex = steps.findIndex(([value]) => value === status);

  return (
    <div className="pharmacy-order-progress" aria-label="Order fulfillment progress">
      {steps.map(([value, label], index) => (
        <div className={`pharmacy-order-progress__step ${index < currentIndex ? 'is-complete' : ''} ${index === currentIndex ? 'is-current' : ''}`} key={value}>
          <span>{index < currentIndex ? 'check' : index + 1}</span>
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}

export default function PharmacyOrderDetailModal({ item, profile, onClose, onStatusUpdate, savingId }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmPickup, setConfirmPickup] = useState(false);
  const headingRef = useRef(null);
  const originRef = useRef(document.activeElement);

  const loadOrder = async () => {
    if (!item?.orderId) return;
    setLoading(true);
    setError('');
    try {
      setOrder(await pharmacyApi.getOrderById(item.orderId));
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Unable to load order details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
    window.setTimeout(() => headingRef.current?.focus(), 0);
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      originRef.current?.focus?.();
    };
  }, [item?.orderId]);

  const nextStatus = useMemo(() => order ? getNextOrderStatus(order) : null, [order]);
  const pickup = order && !isDeliveryOrder(order);
  const isSaving = savingId === (order?.orderId || item?.orderId);

  const submitStatus = async () => {
    setConfirmPickup(false);
    await onStatusUpdate({ ...item, ...order, workflowStage: order.status, orderStatus: order.status });
  };

  const activity = order ? [
    ['Order created', order.createdAt],
    ['Order confirmed', order.confirmedAt],
    ['Preparing', order.preparingAt],
    ['Shipped', order.shippedAt],
    ['Delivered', order.deliveredAt],
    ['Completed', order.completedAt],
    ['Cancelled', order.cancelledAt],
  ].filter(([, timestamp]) => timestamp) : [];

  return (
    <div className="pharmacy-order-detail-modal" role="dialog" aria-modal="true" aria-labelledby="pharmacy-order-detail-title">
      <button className="pharmacy-order-detail-backdrop" onClick={onClose} type="button" aria-label="Close" />
      <section className="pharmacy-order-detail-sheet">
        <header className="pharmacy-order-detail-header">
          <div>
            <h2 id="pharmacy-order-detail-title" ref={headingRef} tabIndex="-1">{getItemDisplayId(order || item)}</h2>
            {order && <small>{dateTime(order.createdAt)}</small>}
            <div className="pharmacy-order-detail-badges">
              {order && <span className={`pharmacy-status ${paymentStatusTone(order.status)}`}>{titleCase(order.status)}</span>}
              {order && <span className={`pharmacy-status ${paymentStatusTone(order.paymentStatus)}`}>{paymentStatusLabel(order.paymentStatus)}</span>}
              {order && <span className="pharmacy-status tone-neutral">{titleCase(order.deliveryType || 'Pickup')}</span>}
            </div>
          </div>
          <button className="pharmacy-order-detail-close" onClick={onClose} type="button" aria-label="Close"><span className="material-symbols-outlined">close</span></button>
        </header>

        <div className="pharmacy-order-detail-body">
          {loading && <div className="pharmacy-loading"><span className="spinner-border spinner-border-sm" /> Loading order details...</div>}
          {error && <div className="pharmacy-detail-error"><p>{error}</p><button className="btn btn-outline-primary btn-sm" onClick={loadOrder} type="button">Retry</button></div>}
          {order && !loading && (
            <>
              <OrderProgress order={order} />
              <div className="pharmacy-order-detail-banner">{pickup ? 'Waiting for patient pickup' : order.status === 'SHIPPING' ? 'Out for delivery' : 'Order fulfillment in progress'}</div>
              <section className="pharmacy-detail-section"><h3>Patient</h3><strong>{order.patientName || 'Unknown patient'}</strong><span>{order.deliveryPhoneNumber || '-'}</span></section>
              <section className="pharmacy-detail-section"><h3>{pickup ? 'Pickup' : 'Delivery'}</h3>{pickup ? <><strong>{profile?.name || order.pharmacyName || 'Pharmacy'}</strong><span>{profile?.address || 'Pharmacy address unavailable'}</span><span>{profile?.phoneNumber || order.pharmacyPhone || '-'}</span></> : <><strong>{order.deliveryAddress || '-'}</strong><span>{order.deliveryPhoneNumber || '-'}</span></>}</section>
              <section className="pharmacy-detail-section"><h3>Medicines</h3><div className="pharmacy-order-items">{order.items?.map((orderItem, index) => <div className="pharmacy-order-item-row" key={`${orderItem.medicineId || orderItem.medicationName}-${index}`}><div><strong>{orderItem.medicationName || orderItem.name}</strong><small>{orderItem.quantity} {orderItem.unit} {orderItem.route ? `- ${orderItem.route}` : ''} {orderItem.frequency ? `- ${orderItem.frequency}` : ''}</small></div><small>{money(orderItem.totalPrice || 0)}</small></div>)}</div></section>
              <section className="pharmacy-detail-section pharmacy-payment-summary"><h3>Payment summary</h3><div><span>Medicine subtotal</span><strong>{money(order.medicineAmount || 0)}</strong></div><div><span>Delivery fee</span><strong>{money(order.deliveryFee || 0)}</strong></div><div><span>Platform fee</span><strong>{money(order.platformFee || 0)}</strong></div><div><span>Pharmacy earning</span><strong>{money(order.pharmacyEarning || 0)}</strong></div><div className="is-total"><span>Total</span><strong>{money(order.totalAmount || 0)}</strong></div></section>
              {(order.notes || order.pharmacistNotes) && <details className="pharmacy-detail-section"><summary>Order notes</summary><p>{order.pharmacistNotes || order.notes}</p></details>}
              {activity.length > 0 && <section className="pharmacy-detail-section"><h3>Activity</h3><div className="pharmacy-timeline">{activity.map(([label, timestamp]) => <div key={label}><span /><small>{dateTime(timestamp)}</small><small>{label}</small></div>)}</div></section>}
            </>
          )}
        </div>

        <footer className="pharmacy-order-detail-footer">
          <button className="btn btn-light" onClick={onClose} type="button">Close</button>
          {nextStatus && !order?.requiresPatientConfirmation && <button className="btn btn-primary" disabled={isSaving || loading} onClick={() => pickup && nextStatus === 'COMPLETED' ? setConfirmPickup(true) : submitStatus()} type="button">{isSaving ? 'Updating...' : actionLabel(nextStatus, pickup)}</button>}
        </footer>
        {confirmPickup && <div className="pharmacy-order-pickup-confirm"><div role="alertdialog" aria-modal="true"><h3>Confirm patient pickup?</h3><p>Confirm that the medicines have been handed to the patient. This will complete the order.</p><button className="btn btn-light" onClick={() => setConfirmPickup(false)} type="button">Back</button><button className="btn btn-primary" onClick={submitStatus} type="button">Confirm pickup</button></div></div>}
      </section>
    </div>
  );
}
