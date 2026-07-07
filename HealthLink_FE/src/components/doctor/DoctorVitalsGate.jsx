import React, { useEffect, useMemo, useState } from 'react';
import {
  getDoctorVitalsInitialForm,
  validateDoctorVitalsForm,
} from '@utils/doctor/vitalsFormModel';

const VITAL_FIELDS = [
  {
    name: 'heartRate',
    label: 'Heart rate',
    unit: 'bpm',
    icon: 'bi-heart-pulse',
    required: true,
    min: 30,
    max: 220,
    step: 1,
  },
  {
    name: 'temperature',
    label: 'Temperature',
    unit: 'C',
    icon: 'bi-thermometer-half',
    min: 30,
    max: 45,
    step: 0.1,
  },
  {
    name: 'oxygenSaturation',
    label: 'SpO2',
    unit: '%',
    icon: 'bi-lungs',
    min: 50,
    max: 100,
    step: 1,
  },
  {
    name: 'respiratoryRate',
    label: 'Respiratory rate',
    unit: 'br/min',
    icon: 'bi-wind',
    min: 5,
    max: 60,
    step: 1,
  },
];

const formatAppointmentTime = (value) => {
  if (!value) return 'Appointment time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Appointment time unavailable';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const FieldError = ({ id, message }) => {
  if (!message) return null;
  return (
    <p id={id} className="doctor-vitals-gate__error">
      {message}
    </p>
  );
};

const DoctorVitalsGate = ({
  patientName,
  appointmentTime,
  latestVitalSign,
  saving,
  onSave,
}) => {
  const [form, setForm] = useState(() => getDoctorVitalsInitialForm(latestVitalSign));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(getDoctorVitalsInitialForm(latestVitalSign));
    setErrors({});
  }, [latestVitalSign?.vitalSignId, latestVitalSign?.measuredAt]);

  const appointmentLabel = useMemo(
    () => formatAppointmentTime(appointmentTime),
    [appointmentTime],
  );

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field] && field !== 'bloodPressureSystolic' && field !== 'bloodPressureDiastolic') {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      if (field === 'bloodPressureSystolic' || field === 'bloodPressureDiastolic') {
        delete next.bloodPressure;
        delete next.bloodPressureSystolic;
        delete next.bloodPressureDiastolic;
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateDoctorVitalsForm(form);
    setErrors(validation.errors);
    if (!validation.isValid) return;
    await onSave(form);
  };

  return (
    <div className="doctor-vitals-gate" aria-labelledby="doctor-vitals-gate-title">
      <form className="doctor-vitals-gate__panel" onSubmit={handleSubmit}>
        <div className="doctor-vitals-gate__header">
          <div>
            <p className="doctor-vitals-gate__eyebrow">Pre-consultation vitals</p>
            <h2 id="doctor-vitals-gate-title" className="doctor-vitals-gate__title">
              Record patient readings
            </h2>
            <p className="doctor-vitals-gate__desc">
              Ask {patientName || 'the patient'} for the readings prepared before the appointment, then save to open the consultation workspace.
            </p>
          </div>
          <div className="doctor-vitals-gate__time">
            <i className="bi bi-calendar-check" />
            <span>{appointmentLabel}</span>
          </div>
        </div>

        <div className="doctor-vitals-gate__bp-row">
          <div className="doctor-vitals-gate__field">
            <label htmlFor="doctor-vitals-systolic">
              Blood pressure SYS <span>mmHg</span>
            </label>
            <input
              id="doctor-vitals-systolic"
              type="number"
              min="70"
              max="250"
              step="1"
              value={form.bloodPressureSystolic}
              onChange={(event) => handleChange('bloodPressureSystolic', event.target.value)}
              aria-invalid={Boolean(errors.bloodPressure || errors.bloodPressureSystolic)}
              aria-describedby="doctor-vitals-bp-error doctor-vitals-sys-error"
            />
            <FieldError id="doctor-vitals-sys-error" message={errors.bloodPressureSystolic} />
          </div>

          <div className="doctor-vitals-gate__field">
            <label htmlFor="doctor-vitals-diastolic">
              Blood pressure DIA <span>mmHg</span>
            </label>
            <input
              id="doctor-vitals-diastolic"
              type="number"
              min="40"
              max="150"
              step="1"
              value={form.bloodPressureDiastolic}
              onChange={(event) => handleChange('bloodPressureDiastolic', event.target.value)}
              aria-invalid={Boolean(errors.bloodPressure || errors.bloodPressureDiastolic)}
              aria-describedby="doctor-vitals-bp-error doctor-vitals-dia-error"
            />
            <FieldError id="doctor-vitals-dia-error" message={errors.bloodPressureDiastolic} />
          </div>
        </div>
        <FieldError id="doctor-vitals-bp-error" message={errors.bloodPressure} />

        <div className="doctor-vitals-gate__grid">
          {VITAL_FIELDS.map((field) => (
            <div className="doctor-vitals-gate__field" key={field.name}>
              <label htmlFor={`doctor-vitals-${field.name}`}>
                <i className={`bi ${field.icon}`} />
                {field.label}
                {field.required && <strong>*</strong>}
                <span>{field.unit}</span>
              </label>
              <input
                id={`doctor-vitals-${field.name}`}
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                value={form[field.name]}
                onChange={(event) => handleChange(field.name, event.target.value)}
                aria-invalid={Boolean(errors[field.name])}
                aria-describedby={`doctor-vitals-${field.name}-error`}
              />
              <FieldError id={`doctor-vitals-${field.name}-error`} message={errors[field.name]} />
            </div>
          ))}
        </div>

        <div className="doctor-vitals-gate__field doctor-vitals-gate__field--notes">
          <label htmlFor="doctor-vitals-notes">Notes</label>
          <textarea
            id="doctor-vitals-notes"
            rows={3}
            value={form.notes}
            onChange={(event) => handleChange('notes', event.target.value)}
            placeholder="Example: readings provided verbally during video call"
          />
        </div>

        <div className="doctor-vitals-gate__footer">
          <p>Chat and video call remain available while collecting these values.</p>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-save me-2" />
                Save vitals and open workspace
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DoctorVitalsGate;
