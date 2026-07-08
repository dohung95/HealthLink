import { useMemo } from 'react';
import {
  paymentStatusTone,
  paymentStatusLabel,
  getWorkflowStage,
  getNextOrderStatus,
  getItemDisplayId,
} from './workflow/pharmacyWorkflow';
import { money, dateTime, titleCase } from '../../utils/pharmacy/pharmacyHelpers';

export default function PharmacyOrderDetailModal({ item, onClose, onStatusUpdate, onChat, savingId }) {
  const nextStatus = useMemo(() => getNextOrderStatus(item), [item]);
  const stage = getWorkflowStage(item);
  const isSaving = savingId === (item?.orderId || item?.caseId);
  const paymentTone = paymentStatusTone(item?.paymentStatus);

  if (!item) return null;

  return (
    <div className="pharmacy-order-detail-modal" role="dialog" aria-modal="true">
      <button className="pharmacy-order-detail-backdrop" onClick={onClose} type="button" aria-label="Close" />
      <div className="pharmacy-order-detail-sheet">
        <div className="pharmacy-order-detail-header">
          <div>
            <h2>{getItemDisplayId(item)}</h2>
            <span className={`pharmacy-status ${paymentTone}`}>{paymentStatusLabel(item?.paymentStatus)}</span>
          </div>
          <button className="pharmacy-order-detail-close" onClick={onClose} type="button" aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="pharmacy-order-detail-body">
          <div className="pharmacy-detail-grid">
            <div className="pharmacy-detail">
              <span>Patient</span>
              <strong>{item.patientName || 'Unknown'}</strong>
            </div>
            <div className="pharmacy-detail">
              <span>Phone</span>
              <strong>{item.deliveryPhoneNumber || '-'}</strong>
            </div>
            <div className="pharmacy-detail">
              <span>Status</span>
              <span className={`pharmacy-status ${paymentStatusTone(stage)}`}>{titleCase(stage)}</span>
            </div>
            <div className="pharmacy-detail">
              <span>Total</span>
              <strong style={{ color: 'var(--pharmacy-primary)' }}>{money(item.totalAmount || item.totalPrice || 0)}</strong>
            </div>
          </div>

          {item.deliveryAddress && (
            <div className="pharmacy-detail is-block">
              <span>Delivery Address</span>
              <strong>{item.deliveryAddress}</strong>
              {item.deliveryType && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--pharmacy-muted)' }}>{item.deliveryType}</div>}
            </div>
          )}

          {item.items?.length > 0 && (
            <div className="pharmacy-order-items" style={{ marginTop: 12 }}>
              <h3>Items ({item.items.length})</h3>
              {item.items.map((orderItem, idx) => (
                <div className="pharmacy-order-item-row" key={idx}>
                  <div>
                    <strong>{orderItem.medicationName || orderItem.name || `Item #${idx + 1}`}</strong>
                    <small>{orderItem.quantity} {orderItem.unit} - {orderItem.frequency || ''}</small>
                  </div>
                  <small>{money(orderItem.totalPrice || orderItem.price || 0)}</small>
                </div>
              ))}
            </div>
          )}

          {item.timeline?.length > 0 && (
            <div className="pharmacy-timeline">
              <h3>Timeline</h3>
              {item.timeline.map((entry, idx) => (
                <div key={idx} className={idx === 0 ? 'is-current' : ''}>
                  <span />
                  <small>{dateTime(entry.timestamp)}</small>
                  <small>{entry.label || entry.status || '-'}</small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pharmacy-order-detail-footer">
          {item.requiresPatientConfirmation ? (
            <span className="btn btn-secondary" style={{ fontSize: 12 }} disabled>
              Awaiting patient confirmation
            </span>
          ) : nextStatus && onStatusUpdate ? (
            <button
              className="btn btn-primary"
              disabled={isSaving}
              onClick={() => onStatusUpdate(item)}
              type="button"
            >
              {isSaving ? 'Updating...' : `Mark ${titleCase(nextStatus)}`}
            </button>
          ) : null}
          {item.availableActions?.includes('CHAT') && onChat && (
            <button className="btn btn-outline-secondary" onClick={() => onChat(item)} type="button">
              <i className="bi bi-chat-dots" /> Chat
            </button>
          )}
          <button className="btn btn-light" onClick={onClose} type="button">Close</button>
        </div>
      </div>
    </div>
  );
}
