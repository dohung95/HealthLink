import React from 'react';

const FIELD_LABELS = {
  notes: 'Consultation Notes',
  prescription: 'Prescription Draft',
  followup: 'Follow-up',
};

const UnsavedChangesBar = ({ dirtyFields, isDirty, lastSavedAt }) => {
  if (!isDirty) return null;

  const fieldLabels = [...dirtyFields].map((f) => FIELD_LABELS[f] || f);

  return (
    <div className="unsaved-changes-bar">
      <div className="unsaved-changes-bar__content">
        <span className="unsaved-changes-bar__icon material-symbols-outlined">edit_note</span>
        <span className="unsaved-changes-bar__text">
          Unsaved changes: {fieldLabels.join(', ')}
        </span>
        {lastSavedAt && (
          <span className="unsaved-changes-bar__time">
            Last saved: {lastSavedAt.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
};

export default UnsavedChangesBar;
