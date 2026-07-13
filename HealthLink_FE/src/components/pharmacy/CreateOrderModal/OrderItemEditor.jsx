import { useState } from 'react';
import {
  TIMING_OPTIONS,
  getFrequencyOptions,
  normalizeTimings,
  serializeTimings,
  toggleTiming,
} from './orderItemSchedule';

const ROUTE_OPTIONS = ['Oral', 'Topical', 'Injection', 'Inhalation'];

export default function OrderItemEditor({
  item,
  readOnlyClinicalFields,
  onChange,
  onRemove,
}) {
  const [showNoteInput, setShowNoteInput] = useState(Boolean(item.notes));
  const timings = normalizeTimings(item.timing);
  const frequencyOptions = getFrequencyOptions(item.frequency);
  const updateItem = (field, value) => onChange({ ...item, [field]: value });

  return (
    <article className="pharmacy-order-item pharmacy-order-item-editor-card">
      <div className="pharmacy-order-item-summary">
        <div className="pharmacy-order-item-info">
          <strong className="pharmacy-order-item-name">{item.medicationName}</strong>
          <span className="pharmacy-order-item-meta">
            {item.quantity} {item.unit || 'unit'}{item.frequency ? ` - ${item.frequency}` : ''}
          </span>
        </div>
        {!readOnlyClinicalFields && (
          <button
            className="btn btn-sm btn-link text-danger p-0"
            onClick={() => onRemove(item.localId)}
            type="button"
            aria-label={`Remove ${item.medicationName}`}
          >
            <i className="bi bi-trash3" />
          </button>
        )}
      </div>

      <div className="pharmacy-order-item-editor">
        <div className="pharmacy-order-item-edit-grid">
          <label>
            <span className="form-label">Qty</span>
            <input
              className="form-control form-control-sm"
              disabled={readOnlyClinicalFields}
              min="1"
              onChange={(event) => updateItem('quantity', event.target.value)}
              type="number"
              value={item.quantity}
            />
          </label>
          <div>
            <span className="form-label">Unit</span>
            <div className="form-control form-control-sm order-item-readonly-field" aria-label="Medicine unit">
              {item.unit || 'Missing unit'}
            </div>
          </div>
          <label>
            <span className="form-label">Days</span>
            <input
              className="form-control form-control-sm"
              disabled={readOnlyClinicalFields}
              min="1"
              onChange={(event) => updateItem('totalSupplyDays', event.target.value)}
              type="number"
              value={item.totalSupplyDays}
            />
          </label>
          <label>
            <span className="form-label">Route</span>
            <select
              className="form-select form-select-sm"
              disabled={readOnlyClinicalFields}
              onChange={(event) => updateItem('route', event.target.value)}
              value={item.route || 'Oral'}
            >
              {ROUTE_OPTIONS.map((route) => <option key={route} value={route}>{route}</option>)}
            </select>
          </label>
        </div>

        <div className="pharmacy-order-item-schedule-row">
          <label>
            <span className="form-label">Frequency</span>
            <select
              className="form-select form-select-sm"
              disabled={readOnlyClinicalFields}
              onChange={(event) => updateItem('frequency', event.target.value)}
              value={item.frequency}
            >
              <option value="">Select frequency</option>
              {frequencyOptions.map((frequency) => (
                <option key={frequency.value} value={frequency.value}>{frequency.label}</option>
              ))}
            </select>
          </label>
          <div>
            <span className="form-label">Timing</span>
            <div className="pharmacy-order-item-timing-badges" aria-label="Timing">
              {TIMING_OPTIONS.map((timing) => {
                const selected = timings.includes(timing.value);
                return (
                  <button
                    aria-pressed={selected}
                    className={`pharmacy-timing-badge ${selected ? 'is-selected' : ''}`}
                    disabled={readOnlyClinicalFields}
                    key={timing.value}
                    onClick={() => updateItem('timing', serializeTimings(toggleTiming(timings, timing.value)))}
                    type="button"
                  >
                    {timing.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {readOnlyClinicalFields ? (
          item.notes && <p className="pharmacy-order-item-note-display">{item.notes}</p>
        ) : showNoteInput ? (
          <div className="pharmacy-note-card">
            <div className="pharmacy-note-card__header">
              <span className="form-label mb-0">Pharmacist note</span>
              <button
                className="pharmacy-note-card__close"
                onClick={() => { setShowNoteInput(false); updateItem('notes', ''); }}
                type="button"
                aria-label="Remove pharmacist note"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <textarea
              className="form-control form-control-sm"
              onChange={(event) => updateItem('notes', event.target.value)}
              placeholder="Add instructions for the patient..."
              rows={2}
              value={item.notes}
            />
          </div>
        ) : (
          <button className="btn btn-sm btn-link text-decoration-none p-0 text-primary fw-semibold" onClick={() => setShowNoteInput(true)} type="button">
            <i className="bi bi-plus-circle me-1" />
            Add Pharmacist Note
          </button>
        )}
      </div>
    </article>
  );
}
