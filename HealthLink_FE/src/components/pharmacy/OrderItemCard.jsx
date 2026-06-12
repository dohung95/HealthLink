import { useState } from 'react';
import { money } from '../../utils/pharmacy/pharmacyHelpers';

const TIMING_OPTIONS = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EVENING', label: 'Evening' },
];

function lineTotal(item) {
  return Number(item.quantity || 0) * Number(item.unitPrice || 0);
}

function getTimingLabel(value) {
  const opt = TIMING_OPTIONS.find((t) => t.value === value);
  return opt ? opt.label : value;
}

export default function OrderItemCard({ item, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const total = lineTotal(item);

  return (
    <article className={`pharmacy-order-item ${expanded ? 'is-expanded' : ''}`}>
      <div className="pharmacy-order-item-summary" onClick={() => setExpanded((c) => !c)}>
        <div className="pharmacy-order-item-info">
          <strong className="pharmacy-order-item-name">{item.medicationName}</strong>
          {!expanded && (
            <span className="pharmacy-order-item-meta">
              {item.quantity} x {money(item.unitPrice)}
              {item.frequency ? ` - ${item.frequency}` : ''}
              {item.timing ? ` - ${getTimingLabel(item.timing)}` : ''}
            </span>
          )}
        </div>
        <div className="pharmacy-order-item-actions">
          <span className="pharmacy-order-item-total">{money(total)}</span>
          <button className="btn btn-sm btn-link text-secondary p-0" onClick={(e) => { e.stopPropagation(); setExpanded((c) => !c); }} type="button" aria-label={expanded ? 'Collapse' : 'Expand'}>
            <i className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
          </button>
          <button className="btn btn-sm btn-link text-danger p-0 ms-1" onClick={(e) => { e.stopPropagation(); onRemove(item.localId); }} type="button" aria-label="Remove">
            <i className="bi bi-trash3"></i>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="pharmacy-order-item-editor">
          <div className="row g-2">
            <div className="col-4 col-md-3">
              <label className="form-label">Qty</label>
              <input className="form-control form-control-sm" min="1" onChange={(e) => onUpdate(item.localId, 'quantity', e.target.value)} type="number" value={item.quantity} />
            </div>
            <div className="col-4 col-md-3">
              <label className="form-label">Days</label>
              <input className="form-control form-control-sm" min="1" onChange={(e) => onUpdate(item.localId, 'totalSupplyDays', e.target.value)} type="number" value={item.totalSupplyDays} />
            </div>
            <div className="col-4 col-md-3">
              <label className="form-label">Unit</label>
              <input className="form-control form-control-sm" onChange={(e) => onUpdate(item.localId, 'unit', e.target.value)} value={item.unit} />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Unit Price</label>
              <input className="form-control form-control-sm" min="0" onChange={(e) => onUpdate(item.localId, 'unitPrice', e.target.value)} step="0.01" type="number" value={item.unitPrice} />
            </div>
            <div className="col-4">
              <label className="form-label">Frequency</label>
              <input className="form-control form-control-sm" onChange={(e) => onUpdate(item.localId, 'frequency', e.target.value)} placeholder="As directed" value={item.frequency} />
            </div>
            <div className="col-4">
              <label className="form-label">Timing</label>
              <select className="form-select form-select-sm" onChange={(e) => onUpdate(item.localId, 'timing', e.target.value)} value={item.timing}>
                <option value="">Timing</option>
                {TIMING_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-4">
              <label className="form-label">Route</label>
              <input className="form-control form-control-sm" onChange={(e) => onUpdate(item.localId, 'route', e.target.value)} placeholder="Oral" value={item.route} />
            </div>
            <div className="col-12">
              <label className="form-label">Notes</label>
              <input className="form-control form-control-sm" onChange={(e) => onUpdate(item.localId, 'notes', e.target.value)} placeholder="Instructions for patient" value={item.notes} />
            </div>
          </div>
          <div className="pharmacy-order-item-footer">
            <span className="text-muted small">{item.route || 'Route not set'}</span>
            <strong>{money(total)}</strong>
          </div>
        </div>
      )}
    </article>
  );
}
