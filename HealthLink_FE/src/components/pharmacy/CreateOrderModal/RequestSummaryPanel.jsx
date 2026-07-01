import { dateTime } from '../../../utils/pharmacy/pharmacyHelpers';

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
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

export default function RequestSummaryPanel({ request }) {
  const requestCopy = request?.symptoms || request?.description;
  const deliveryLabel = request?.deliveryType || request?.preferredDeliveryType;
  const hasHealthIndicators = Boolean(
    request?.temperature ||
    request?.bloodPressure ||
    request?.pulse ||
    request?.heartRate ||
    request?.oxygenSaturation,
  );

  return (
    <div className="pharmacy-request-summary-panel">
      <section className="pharmacy-request-summary-block">
        <div className="pharmacy-request-summary-block__header">
          <span className="material-symbols-outlined">clinical_notes</span>
          <h3>Request Info</h3>
        </div>
        <SummaryRow icon="confirmation_number" label="Request" value={request?.displayId || `Request #${request?.requestId || '-'}`} />
        <SummaryRow icon="category" label="Type" value={request?.requestType || request?.sourceType} />
        <SummaryRow icon="schedule" label="Created" value={request?.createdAt ? dateTime(request.createdAt) : '-'} />
        <SummaryRow icon="sick" label="Symptoms" value={requestCopy} />
        <SummaryRow icon="warning" label="Allergies" value={request?.allergies} tone="warning" />
        <SummaryRow icon="sticky_note_2" label="Additional note" value={request?.additionalNotes || request?.patientFollowUpNotes} />
      </section>

      <section className="pharmacy-request-summary-block">
        <div className="pharmacy-request-summary-block__header">
          <span className="material-symbols-outlined">monitor_heart</span>
          <h3>Health Indicators</h3>
        </div>
        {hasHealthIndicators ? (
          <>
            <SummaryRow icon="thermostat" label="Temperature" value={request?.temperature} />
            <SummaryRow icon="blood_pressure" label="Blood pressure" value={request?.bloodPressure} />
            <SummaryRow icon="favorite" label="Pulse" value={request?.pulse || request?.heartRate} />
            <SummaryRow icon="spo2" label="Oxygen saturation" value={request?.oxygenSaturation} />
          </>
        ) : (
          <div className="pharmacy-request-summary-empty">
            <span className="material-symbols-outlined">monitor_heart</span>
            <p>No health indicators shared</p>
          </div>
        )}
      </section>

      <section className="pharmacy-request-summary-block">
        <div className="pharmacy-request-summary-block__header">
          <span className="material-symbols-outlined">local_shipping</span>
          <h3>Delivery Context</h3>
        </div>
        <SummaryRow icon="call" label="Phone" value={request?.deliveryPhoneNumber} />
        <SummaryRow icon="local_shipping" label="Preference" value={deliveryLabel} />
        <SummaryRow icon="location_on" label="Address" value={request?.deliveryAddress} />
        <SummaryRow icon="explore" label="Address source" value={request?.deliveryAddressSource} />
      </section>

      <section className="pharmacy-request-summary-block">
        <div className="pharmacy-request-summary-block__header">
          <span className="material-symbols-outlined">attach_file</span>
          <h3>Attachments</h3>
        </div>
        <AttachmentList attachments={request?.attachments} />
      </section>
    </div>
  );
}
