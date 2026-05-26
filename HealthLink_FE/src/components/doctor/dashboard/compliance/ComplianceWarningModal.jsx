import React from 'react';

const formatMonth = (monthStr) => {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const ComplianceWarningModal = ({
  isOpen,
  onClose,
  validationResult,
  onAddMoreHours,
  onSaveAnyway,
}) => {
  if (!isOpen || !validationResult) return null;

  const {
    compliant,
    complianceMonth,
    requiredHours,
    scheduledHours,
    hoursShortfall,
    compliancePercentage,
    scheduleActive,
    message,
    warnings = [],
    suggestions = [],
  } = validationResult;

  const percentage = Math.min(compliancePercentage || 0, 100);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className={`flex items-center justify-between px-5 py-4 ${compliant ? 'bg-success text-white' : 'bg-warning text-text-main'}`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">{compliant ? 'check_circle' : 'warning'}</span>
            <h2 className="mb-0 text-lg font-bold">{compliant ? 'Schedule Validated' : 'Schedule Compliance Warning'}</h2>
          </div>
          <button className="rounded p-1 hover:bg-white/20" onClick={onClose} type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid gap-4 p-5">
          <div className={`rounded border p-3 text-sm ${compliant ? 'border-success/30 bg-success/10 text-success' : 'border-warning/30 bg-warning/10 text-text-main'}`}>
            {message}
          </div>

          <section>
            <h3 className="mb-2 text-sm font-bold text-text-muted">{formatMonth(complianceMonth)} Status</h3>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span><strong>{scheduledHours}</strong> / {requiredHours} hours</span>
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${compliant ? 'bg-success text-white' : 'bg-warning text-text-main'}`}>
                {percentage.toFixed(0)}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-container">
              <div className={`h-full rounded-full ${compliant ? 'bg-success' : 'bg-warning'}`} style={{ width: `${percentage}%` }} />
            </div>
          </section>

          {!compliant && hoursShortfall > 0 ? (
            <div className="flex items-center gap-2 rounded border border-error-container bg-error-container/40 p-3 text-sm text-error">
              <span className="material-symbols-outlined">schedule</span>
              <span>You need <strong>{parseFloat(hoursShortfall).toFixed(1)} more hours</strong> to meet the requirement.</span>
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <ListBlock icon="error" items={warnings} title="Warnings" tone="text-error" />
          ) : null}

          {suggestions.length > 0 ? (
            <ListBlock icon="lightbulb" items={suggestions} title="Suggestions" tone="text-primary" />
          ) : null}

          <div className={`flex gap-3 rounded border p-3 ${scheduleActive ? 'border-success/30' : 'border-error-container'}`}>
            <span className={`material-symbols-outlined ${scheduleActive ? 'text-success' : 'text-error'}`}>
              {scheduleActive ? 'toggle_on' : 'toggle_off'}
            </span>
            <div>
              <p className="mb-0 text-sm font-bold text-text-main">Schedule Status: {scheduleActive ? 'Active' : 'Inactive'}</p>
              <p className="mb-0 text-xs text-text-muted">
                {scheduleActive ? 'Patients can book appointments with you.' : 'Patients cannot book appointments until you meet the minimum hours.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-surface-border px-5 py-4">
          {compliant ? (
            <button className="rounded bg-success px-4 py-2 text-sm font-semibold text-white" onClick={onClose} type="button">
              Great, Close
            </button>
          ) : (
            <>
              <button className="rounded border border-surface-border px-4 py-2 text-sm font-semibold text-text-main hover:bg-surface-container" onClick={onSaveAnyway} type="button">
                Save Anyway (Inactive)
              </button>
              <button className="flex items-center gap-2 rounded bg-primary-container px-4 py-2 text-sm font-semibold text-white hover:bg-primary" onClick={onAddMoreHours} type="button">
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Add More Hours
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

const ListBlock = ({ icon, items, title, tone }) => (
  <section>
    <h3 className={`mb-2 flex items-center gap-1 text-sm font-bold ${tone}`}>
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {title}
    </h3>
    <ul className="mb-0 grid gap-1 pl-0">
      {items.map((item) => (
        <li className="flex gap-1 text-sm text-text-muted" key={item}>
          <span className="material-symbols-outlined text-[14px]">arrow_right</span>
          {item}
        </li>
      ))}
    </ul>
  </section>
);

export default ComplianceWarningModal;
