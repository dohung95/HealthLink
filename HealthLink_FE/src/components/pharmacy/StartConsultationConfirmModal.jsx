export default function StartConsultationConfirmModal({ request, onCancel, onStart }) {
  const requestLabel = request?.displayId || `Request #${request?.requestId || '-'}`;

  return (
    <div className="pharmacy-start-consult-modal" role="presentation">
      <button
        aria-label="Cancel start consultation"
        className="pharmacy-start-consult-modal__backdrop"
        onClick={onCancel}
        type="button"
      />
      <section
        aria-labelledby="pharmacy-start-consult-title"
        aria-modal="true"
        className="pharmacy-start-consult-modal__dialog"
        role="dialog"
      >
        <div className="pharmacy-start-consult-modal__icon">
          <span className="material-symbols-outlined">support_agent</span>
        </div>
        <div className="pharmacy-start-consult-modal__content">
          <h2 id="pharmacy-start-consult-title">Start consultation?</h2>
          <p>Begin consultation for {requestLabel}. This will open the Consult &amp; Order workflow.</p>
        </div>
        <div className="pharmacy-start-consult-modal__actions">
          <button className="btn btn-light btn-sm" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" onClick={onStart} type="button">
            Start
          </button>
        </div>
      </section>
    </div>
  );
}
