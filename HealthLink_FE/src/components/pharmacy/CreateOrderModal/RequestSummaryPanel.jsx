import { useEffect, useState } from 'react';
import { vitalSignApi } from '../../../api/vitalSignApi';
import { dateTime } from '../../../utils/pharmacy/pharmacyHelpers';

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function parseTime(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getLatestVitalSign(payload) {
  const list = Array.isArray(payload) ? payload : payload ? [payload] : [];
  return list
    .filter(Boolean)
    .sort((a, b) => parseTime(b.measuredAt || b.createdAt) - parseTime(a.measuredAt || a.createdAt))[0] || null;
}

function formatTemperature(value) {
  return hasValue(value) ? `${value} deg C` : null;
}

function formatBloodPressure(vitals) {
  const systolic = vitals?.bloodPressureSystolic;
  const diastolic = vitals?.bloodPressureDiastolic;

  if (hasValue(systolic) && hasValue(diastolic)) return `${systolic}/${diastolic} mmHg`;
  if (hasValue(systolic)) return `${systolic} mmHg systolic`;
  if (hasValue(diastolic)) return `${diastolic} mmHg diastolic`;
  return null;
}

function formatRate(value, unit) {
  return hasValue(value) ? `${value} ${unit}` : null;
}

function requestLabel(request) {
  return request?.displayId || `Request #${request?.requestId || '-'}`;
}

function patientPhone(request) {
  return request?.patientPhone || request?.phone || request?.deliveryPhoneNumber;
}

function SummaryRow({ icon, label, value, tone = 'default' }) {
  if (!hasValue(value)) return null;
  return (
    <div className={`pharmacy-request-summary-row is-${tone}`}>
      <span className="material-symbols-outlined">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function SummaryBlockHeader({ icon, title, action }) {
  return (
    <div className="pharmacy-request-summary-block__header">
      <div className="pharmacy-request-summary-block__title">
        <span className="material-symbols-outlined">{icon}</span>
        <h3>{title}</h3>
      </div>
      {action}
    </div>
  );
}

function AttachmentList({ attachments }) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return (
      <div className="pharmacy-request-summary-empty">
        <span className="material-symbols-outlined">attach_file_off</span>
        <p>No attachments shared</p>
      </div>
    );
  }

  return (
    <div className="pharmacy-request-summary-attachments">
      {attachments.map((attachment, index) => (
        <a href={attachment} key={`${attachment}-${index}`} rel="noreferrer" target="_blank">
          <span className="material-symbols-outlined">attach_file</span>
          Attachment {index + 1}
        </a>
      ))}
    </div>
  );
}

function VitalsBlock({ loading, error, vitals }) {
  if (loading) {
    return (
      <div className="pharmacy-request-summary-empty is-loading">
        <span className="material-symbols-outlined">monitor_heart</span>
        <p>Loading vitals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pharmacy-request-summary-empty is-error">
        <span className="material-symbols-outlined">warning</span>
        <p>Unable to load vitals</p>
      </div>
    );
  }

  if (!vitals) {
    return (
      <div className="pharmacy-request-summary-empty">
        <span className="material-symbols-outlined">monitor_heart</span>
        <p>No vitals shared yet</p>
      </div>
    );
  }

  return (
    <>
      <SummaryRow icon="thermostat" label="Temperature" value={formatTemperature(vitals.temperature)} />
      <SummaryRow icon="blood_pressure" label="Blood pressure" value={formatBloodPressure(vitals)} />
      <SummaryRow icon="favorite" label="Heart rate" value={formatRate(vitals.heartRate, 'bpm')} />
      <SummaryRow icon="air" label="Respiratory rate" value={formatRate(vitals.respiratoryRate, 'breaths/min')} />
      <SummaryRow icon="spo2" label="SpO2" value={formatRate(vitals.oxygenSaturation, '%')} />
      <SummaryRow
        icon="schedule"
        label="Measured"
        value={vitals.measuredAt ? dateTime(vitals.measuredAt) : null}
      />
    </>
  );
}

export default function RequestSummaryPanel({ request }) {
  const [vitalsState, setVitalsState] = useState({
    loading: false,
    error: false,
    data: null,
  });

  useEffect(() => {
    const patientId = request?.patientId;

    if (!patientId) {
      setVitalsState({ loading: false, error: false, data: null });
      return undefined;
    }

    let alive = true;
    setVitalsState({ loading: true, error: false, data: null });

    vitalSignApi.getPatientVitalSigns(patientId)
      .then((data) => {
        if (!alive) return;
        setVitalsState({
          loading: false,
          error: false,
          data: getLatestVitalSign(data),
        });
      })
      .catch(() => {
        if (!alive) return;
        setVitalsState({ loading: false, error: true, data: null });
      });

    return () => {
      alive = false;
    };
  }, [request?.patientId]);

  const requestCopy = request?.symptoms || request?.description;

  return (
    <div className="pharmacy-request-summary-panel">
      <section className="pharmacy-request-summary-block">
        <SummaryBlockHeader
          icon="clinical_notes"
          title="Request Info"
          action={<span className="pharmacy-request-summary-block__id">{requestLabel(request)}</span>}
        />
        <SummaryRow icon="category" label="Type" value={request?.requestType || request?.sourceType} />
        <SummaryRow icon="pending_actions" label="Status" value={request?.requestStatus || request?.workflowStage} />
        <SummaryRow icon="sick" label="Symptoms" value={requestCopy} />
        <SummaryRow
          icon="sticky_note_2"
          label="Additional note"
          value={request?.additionalNotes || request?.patientFollowUpNotes}
        />
      </section>

      <section className="pharmacy-request-summary-block">
        <SummaryBlockHeader icon="person" title="Patient Info" />
        <SummaryRow icon="badge" label="Name" value={request?.patientName} />
        <SummaryRow icon="call" label="Phone" value={patientPhone(request)} />
        <SummaryRow icon="warning" label="Allergies" value={request?.allergies} tone="warning" />
      </section>

      <section className="pharmacy-request-summary-block">
        <SummaryBlockHeader icon="monitor_heart" title="Vitals" />
        <VitalsBlock
          loading={vitalsState.loading}
          error={vitalsState.error}
          vitals={vitalsState.data}
        />
      </section>

      <section className="pharmacy-request-summary-block">
        <SummaryBlockHeader icon="attach_file" title="Attachments" />
        <AttachmentList attachments={request?.attachments} />
      </section>
    </div>
  );
}
