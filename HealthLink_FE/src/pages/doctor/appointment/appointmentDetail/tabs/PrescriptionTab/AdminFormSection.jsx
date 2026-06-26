import React from 'react';

const FREQUENCY_OPTIONS = [
  { value: '', label: 'Optional' },
  { value: 'QD', label: 'QD (1x daily)' },
  { value: 'BID', label: 'BID (2x daily)' },
  { value: 'TID', label: 'TID (3x daily)' },
  { value: 'QID', label: 'QID (4x daily)' },
];

const TIMING_OPTIONS = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EVENING', label: 'Evening' },
];

const getOptionLabel = (options, value, fallback) =>
  options.find((option) => option.value === value)?.label || fallback;

const normalizeTimingValues = (timings, timing) => {
  const source = Array.isArray(timings) && timings.length > 0
    ? timings
    : String(timing || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

  return [...new Set(source.map((value) => String(value).toUpperCase()).filter(Boolean))];
};

const getTimingLabel = (value) => getOptionLabel(TIMING_OPTIONS, value, value);

const getPrescriptionStrengthLabel = (item = {}) => {
  const dosage = item.strength || item.dosage || '';
  const unit = item.unit || '';

  if (!dosage || !unit) {
    return dosage;
  }

  return dosage.toLowerCase().endsWith(unit.toLowerCase())
    ? dosage.slice(0, dosage.length - unit.length).trim()
    : dosage;
};

const PrescriptionReadonlyItem = ({ item, index }) => {
  const medicationName =
    item.medicationName ||
    item.brandName ||
    item.genericName ||
    `Medication ${index + 1}`;
  const strengthLabel = getPrescriptionStrengthLabel(item);
  const timingValues = normalizeTimingValues(item.timings, item.timing);
  const scheduleBadges = [
    item.frequency ? `Frequency: ${item.frequency}` : null,
    item.route ? `Route: ${item.route}` : null,
    item.totalSupplyDays ? `${item.totalSupplyDays} day supply` : null,
  ].filter(Boolean);

  return (
    <article className="doctor-prescription-item-card doctor-prescription-item-card--readonly">
      <div className="doctor-prescription-item-card__summary">
        {item.quantity ? (
          <span className="doctor-prescription-chip doctor-prescription-chip--success doctor-prescription-item-card__quantity">
            Quantity: {item.quantity}
          </span>
        ) : null}

        <div
          className={`doctor-prescription-item-card__content ${item.quantity ? 'doctor-prescription-item-card__content--with-quantity' : ''}`}
        >
          <div className="doctor-prescription-item-card__title-row">
            <h4>{medicationName}</h4>
            {strengthLabel ? <span className="doctor-prescription-chip">{strengthLabel}</span> : null}
          </div>

          {scheduleBadges.length > 0 ? (
            <div className="doctor-prescription-pill-list">
              {scheduleBadges.map((badge) => (
                <span className="doctor-prescription-pill" key={badge}>
                  {badge}
                </span>
              ))}
            </div>
          ) : null}

          {timingValues.length > 0 ? (
            <div className="doctor-prescription-pill-list">
              {timingValues.map((timingValue) => (
                <span className="doctor-prescription-pill doctor-prescription-pill--timing" key={timingValue}>
                  {getTimingLabel(timingValue)}
                </span>
              ))}
            </div>
          ) : null}

          {item.notes || item.instructions ? (
            <p className="doctor-prescription-item-card__notes">
              {item.notes || item.instructions}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default function AdminFormSection({
  prescription,
  patientName,
}) {
  if (prescription) {
    const issuedAtLabel = prescription?.issueDate
      ? new Date(prescription.issueDate).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'N/A';

    return (
      <div className="doctor-prescription-workspace doctor-prescription-workspace--readonly">
        <div className="doctor-prescription-header doctor-prescription-header--readonly">
          <p className="doctor-detail-eyebrow mb-0">Prescription</p>
          <span className="doctor-detail-status doctor-detail-status--completed">
            {prescription.status || 'Issued'}
          </span>
        </div>

        <div className="doctor-detail-note-card doctor-prescription-summary-card">
          <div className="doctor-prescription-summary-card__item">
            <p className="doctor-prescription-summary-card__label">Patient</p>
            <p className="doctor-prescription-summary-card__value">{patientName}</p>
          </div>
          <div className="doctor-prescription-summary-card__item">
            <p className="doctor-prescription-summary-card__label">Issued</p>
            <p className="doctor-prescription-summary-card__value">{issuedAtLabel}</p>
          </div>
          <div className="doctor-prescription-summary-card__item doctor-prescription-summary-card__item--diagnosis">
            <p className="doctor-prescription-summary-card__label">Diagnosis</p>
            <p className="doctor-prescription-summary-card__value">
              {prescription.diagnosis?.trim() || 'Not provided'}
            </p>
          </div>
        </div>

        <div className="doctor-prescription-table-card">
          <div className="doctor-prescription-table-card__header">
            <p className="doctor-detail-eyebrow mb-0">Medications</p>
            <div className="doctor-prescription-header__badge">
              {prescription.medications?.length || 0} item
              {prescription.medications?.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="doctor-prescription-list">
            {prescription.medications?.map((item, index) => (
              <PrescriptionReadonlyItem
                item={item}
                index={index}
                key={`${item.medicationName || item.medicineId || 'medication'}-${index}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
