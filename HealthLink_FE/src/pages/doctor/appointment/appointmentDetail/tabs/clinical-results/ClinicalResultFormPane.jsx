import React from 'react';

const CATEGORY_OPTIONS = [
  'Blood Test',
  'Imaging',
  'Urine Test',
  'Pathology',
  'Microbiology',
  'Other',
];

const FLAG_OPTIONS = [
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

function emptyRow() {
  return { testName: '', resultValue: '', unit: '', referenceRange: '', flag: 'UNKNOWN', confidence: null };
}

export default function ClinicalResultFormPane({
  form,
  onChange,
  onSaveDraft,
  onPublish,
  saving,
  editingId,
  appointmentId,
  file,
  onFileSelect,
}) {
  const rows = form.structuredResultsJson
    ? (() => { try { return JSON.parse(form.structuredResultsJson); } catch { return []; } })()
    : [];

  const setForm = (key, value) => onChange({ ...form, [key]: value });

  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setForm('structuredResultsJson', JSON.stringify(updated));
  };

  const addRow = () => {
    setForm('structuredResultsJson', JSON.stringify([...rows, emptyRow()]));
  };

  const removeRow = (index) => {
    const updated = rows.filter((_, i) => i !== index);
    setForm('structuredResultsJson', JSON.stringify(updated));
  };

  const hasFile = file || form.existingFileLocation;
  const hasStructuredRow = rows.some((r) => r.testName && r.resultValue);
  const hasAssessment = form.doctorAssessment?.trim();
  const isValid = form.category?.trim() && form.testName?.trim();
  const canPublish = isValid && (hasFile || hasStructuredRow || hasAssessment);

  return (
    <div className="cr-form-pane">
      <div className="cr-form-pane__scroll">
        <div className="cr-manual-helper">
          <div className="cr-manual-helper__icon">
            <i className="bi bi-clipboard2-pulse"></i>
          </div>
          <div>
            <div className="cr-manual-helper__title">Manual result entry</div>
            <p className="cr-manual-helper__text">
              Enter key values from the uploaded report. Patients only see results after you publish them.
            </p>
          </div>
        </div>

        <div className="cr-form-group">
          <label className="cr-form-label">Category</label>
          <select
            className="cr-form-select"
            value={form.category || ''}
            onChange={(e) => setForm('category', e.target.value)}
          >
            <option value="">Select category</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="cr-form-group">
          <label className="cr-form-label">Test / Report name</label>
          <input
            className="cr-form-input"
            value={form.testName || ''}
            onChange={(e) => setForm('testName', e.target.value)}
            placeholder="e.g. Complete Blood Count"
          />
        </div>

        <div className="cr-form-group">
          <div className="cr-form-label-row">
            <label className="cr-form-label">Structured results</label>
            <button type="button" className="cr-form-add-row" onClick={addRow}>
              <i className="bi bi-plus-circle"></i> Add row
            </button>
          </div>
          {rows.map((row, i) => (
            <div key={i} className="cr-structured-row">
              <div className="cr-structured-row__fields">
                <input
                  className="cr-form-input cr-form-input--sm"
                  placeholder="Test"
                  value={row.testName}
                  onChange={(e) => handleRowChange(i, 'testName', e.target.value)}
                />
                <input
                  className="cr-form-input cr-form-input--sm"
                  placeholder="Value"
                  value={row.resultValue}
                  onChange={(e) => handleRowChange(i, 'resultValue', e.target.value)}
                />
                <input
                  className="cr-form-input cr-form-input--xs"
                  placeholder="Unit"
                  value={row.unit}
                  onChange={(e) => handleRowChange(i, 'unit', e.target.value)}
                />
                <input
                  className="cr-form-input cr-form-input--xs"
                  placeholder="Ref range"
                  value={row.referenceRange}
                  onChange={(e) => handleRowChange(i, 'referenceRange', e.target.value)}
                />
                <select
                  className="cr-form-select cr-form-select--xs"
                  value={row.flag || 'UNKNOWN'}
                  onChange={(e) => handleRowChange(i, 'flag', e.target.value)}
                >
                  {FLAG_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <button type="button" className="cr-form-remove-row" onClick={() => removeRow(i)}>
                <i className="bi bi-x"></i>
              </button>
            </div>
          ))}
        </div>

        <div className="cr-form-row">
          <div className="cr-form-group">
            <label className="cr-form-label">Lab facility</label>
            <input
              className="cr-form-input"
              value={form.labFacilityName || ''}
              onChange={(e) => setForm('labFacilityName', e.target.value)}
            />
          </div>
          <div className="cr-form-group">
            <label className="cr-form-label">Document date</label>
            <input
              type="date"
              className="cr-form-input"
              value={form.documentDate || ''}
              onChange={(e) => setForm('documentDate', e.target.value)}
            />
          </div>
        </div>

        <div className="cr-form-group">
          <label className="cr-form-label">Doctor assessment</label>
          <textarea
            className="cr-form-textarea"
            rows={3}
            value={form.doctorAssessment || ''}
            onChange={(e) => setForm('doctorAssessment', e.target.value)}
            placeholder="Clinical interpretation and notes..."
          />
        </div>

        <div className="cr-form-group">
          <label className="cr-form-label">Patient summary</label>
          <textarea
            className="cr-form-textarea"
            rows={2}
            value={form.patientSummary || ''}
            onChange={(e) => setForm('patientSummary', e.target.value)}
            placeholder="Simplified explanation for the patient..."
          />
        </div>

      </div>

      <div className="cr-form-pane__footer">
        <button
          type="button"
          className="cr-btn-secondary"
          onClick={() => onSaveDraft(false)}
          disabled={saving || !isValid}
        >
          {saving ? 'Saving...' : 'Save draft'}
        </button>
        <button
          type="button"
          className="cr-btn-primary"
          onClick={() => onPublish()}
          disabled={saving || !canPublish}
        >
          {saving ? 'Publishing...' : 'Publish'}
        </button>
      </div>
    </div>
  );
}
