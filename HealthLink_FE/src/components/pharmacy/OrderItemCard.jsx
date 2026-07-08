import { useState } from 'react';
import { money } from '../../utils/pharmacy/pharmacyHelpers';

const TIMING_OPTIONS = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EVENING', label: 'Evening' },
];

const UNIT_OPTIONS = ['Tablet', 'Capsule', 'Vial', 'Ampoule', 'Sachet', 'Bottle', 'Tube'];

const FREQUENCY_OPTIONS = [
  '3 times daily',
  'Twice daily',
  'Once daily',
  '4 times daily',
  'Every 6 hours',
  'Every 8 hours',
  'Every 12 hours',
  'As needed',
  'As directed',
];

function lineTotal(item) {
  return Number(item.totalPrice || 0);
}

function getTimingLabel(value) {
  const opt = TIMING_OPTIONS.find((t) => t.value === value);
  return opt ? opt.label : value;
}

export default function OrderItemCard({ item, onUpdate, onRemove, index, expanded, onToggle, lockedMedication = false }) {
  const [showNoteInput, setShowNoteInput] = useState(!!item.notes);
  const total = lineTotal(item);

  return (
    <article className={`pharmacy-order-item ${expanded ? 'is-expanded' : ''}`}>
      <div className="pharmacy-order-item-summary" onClick={onToggle}>
        <div className="pharmacy-order-item-info">
          <span className="pharmacy-order-item-number">{index}</span>
          <strong className="pharmacy-order-item-name">{item.medicationName}</strong>
            {!expanded && (
            <span className="pharmacy-order-item-meta">
              {item.quantity} x {money(item.totalPrice / (item.quantity || 1))}
              {item.frequency ? ` - ${item.frequency}` : ''}
              {item.timing ? ` - ${getTimingLabel(item.timing)}` : ''}
            </span>
          )}
        </div>
        <div className="pharmacy-order-item-actions">
          <span className="pharmacy-order-item-total">{money(total)}</span>
          <button className="btn btn-sm btn-link text-secondary p-0" onClick={(e) => { e.stopPropagation(); onToggle(); }} type="button" aria-label={expanded ? 'Collapse' : 'Expand'}>
            <i className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
          </button>
          {!lockedMedication && (
            <button className="btn btn-sm btn-link text-danger p-0 ms-1" onClick={(e) => { e.stopPropagation(); onRemove(item.localId); }} type="button" aria-label="Remove">
              <i className="bi bi-trash3"></i>
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="pharmacy-order-item-editor">
          <div className="row g-3">
            <div className="col-6 col-md-3">
              <label className="form-label">QTY</label>
              <input className="form-control form-control-sm" disabled={lockedMedication} min="1" onChange={(e) => onUpdate(item.localId, 'quantity', e.target.value)} type="number" value={item.quantity} />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">DAYS</label>
              <input className="form-control form-control-sm" disabled={lockedMedication} min="1" onChange={(e) => onUpdate(item.localId, 'totalSupplyDays', e.target.value)} type="number" value={item.totalSupplyDays} />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">ROUTE</label>
              <input className="form-control form-control-sm" disabled value={item.route || 'Oral'} />
            </div>
            <div className="col-4">
              <label className="form-label">UNIT</label>
              <select className="form-select form-select-sm" disabled={lockedMedication} onChange={(e) => onUpdate(item.localId, 'unit', e.target.value)} value={item.unit}>
                <option value="">Select unit</option>
                {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="col-4">
              <label className="form-label">FREQUENCY</label>
              <select className="form-select form-select-sm" disabled={lockedMedication} onChange={(e) => onUpdate(item.localId, 'frequency', e.target.value)} value={item.frequency}>
                <option value="">Select frequency</option>
                {FREQUENCY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="col-4">
              <label className="form-label">TIMING</label>
              <select className="form-select form-select-sm" disabled={lockedMedication} onChange={(e) => onUpdate(item.localId, 'timing', e.target.value)} value={item.timing}>
                <option value="">Select timing</option>
                {TIMING_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-12">
              {lockedMedication ? (
                item.notes ? (
                  <div className="pharmacy-note-card pharmacy-note-card--readonly">
                    <div className="pharmacy-note-card__header">
                      <label className="form-label mb-0">DOCTOR NOTE</label>
                    </div>
                    <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>{item.notes}</p>
                  </div>
                ) : null
              ) : (
                showNoteInput ? (
                  <div className="pharmacy-note-card">
                    <div className="pharmacy-note-card__header">
                      <label className="form-label mb-0">PHARMACIST NOTE</label>
                      <button
                        className="pharmacy-note-card__close"
                        onClick={() => { setShowNoteInput(false); onUpdate(item.localId, 'notes', ''); }}
                        type="button"
                        aria-label="Remove pharmacist note"
                      >
                        <i className="bi bi-x-lg"></i>
                      </button>
                    </div>
                    <textarea
                      className="form-control form-control-sm"
                      onChange={(e) => onUpdate(item.localId, 'notes', e.target.value)}
                      placeholder="Add instructions for the patient..."
                      rows={2}
                      value={item.notes}
                    />
                  </div>
                ) : (
                  <button className="btn btn-sm btn-link text-decoration-none p-0 text-primary fw-semibold" onClick={() => setShowNoteInput(true)} type="button">
                    <i className="bi bi-plus-circle me-1"></i>
                    Add Pharmacist Note
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
