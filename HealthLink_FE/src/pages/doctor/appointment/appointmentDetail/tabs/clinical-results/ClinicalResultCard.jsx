import React from 'react';

const STATUS_COLORS = {
  PUBLISHED: { bg: '#bbf7d0', text: '#15803d' },
  DRAFT: { bg: '#f1f5f9', text: '#475569' },
};

const FLAG_COLORS = {
  CRITICAL: { bg: '#fce4ec', text: '#c62828' },
  HIGH: { bg: '#fff3e0', text: '#e65100' },
  LOW: { bg: '#fff3e0', text: '#e65100' },
  NORMAL: { bg: '#e8f5e9', text: '#2e7d32' },
  UNKNOWN: { bg: '#f5f5f5', text: '#757575' },
};

function getStatusStyle(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.DRAFT;
}

function getFlagStyle(flag) {
  return FLAG_COLORS[flag] || FLAG_COLORS.UNKNOWN;
}

function getFileUrl(fileLocation) {
  if (!fileLocation) return null;
  if (fileLocation.startsWith('http')) return fileLocation;
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8096';
  return `${base}${fileLocation}`;
}

function parseRows(structuredResultsJson) {
  if (!structuredResultsJson) return [];
  try {
    const parsed = JSON.parse(structuredResultsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ClinicalResultCard({ result, onEdit, onPublish, canManage }) {
  const rows = parseRows(result.structuredResultsJson);
  const abnormalCount = rows.filter(
    (r) => r.flag === 'LOW' || r.flag === 'HIGH' || r.flag === 'CRITICAL'
  ).length;
  const statusStyle = getStatusStyle(result.clinicalStatus || 'DRAFT');
  const canPublish =
    canManage &&
    result.visibilityStatus === 'DRAFT' &&
    (rows.length > 0 || result.testResults || result.fileLocation || result.doctorAssessment);

  return (
    <div className="cr-result-card">
      <div className="cr-result-card__header">
        <div className="cr-result-card__badges">
          {result.category && (
            <span className="cr-badge cr-badge--category">{result.category}</span>
          )}
          <span
            className="cr-badge cr-badge--status"
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
          >
            {result.clinicalStatus || 'DRAFT'}
          </span>
        </div>
        {canManage && (
          <div className="cr-result-card__actions">
            <button
              type="button"
              className="cr-btn-icon"
              title="Edit"
              onClick={() => onEdit(result)}
            >
              <i className="bi bi-pencil"></i>
            </button>
            {canPublish && (
              <button
                type="button"
                className="cr-btn-icon cr-btn-icon--publish"
                title="Publish"
                onClick={() => onPublish(result.documentId)}
              >
                <i className="bi bi-send"></i>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="cr-result-card__title">
        {result.testName || result.documentName || 'Clinical Result'}
      </div>

      {rows.length > 0 ? (
        <div className="cr-result-card__metrics">
          {rows.map((row, i) => {
            const flagStyle = getFlagStyle(row.flag);
            return (
              <div key={i} className="cr-result-card__metric-row">
                <span className="cr-metric-name">{row.testName || `Test ${i + 1}`}</span>
                <span className="cr-metric-value">
                  <strong>{row.resultValue}</strong>
                  {row.unit && <span className="cr-metric-unit">{row.unit}</span>}
                </span>
                {row.referenceRange && (
                  <span className="cr-metric-ref"> ref: {row.referenceRange}</span>
                )}
                {row.flag && (
                  <span
                    className="cr-flag-chip"
                    style={{ backgroundColor: flagStyle.bg, color: flagStyle.text }}
                  >
                    {row.flag}
                  </span>
                )}
              </div>
            );
          })}
          {abnormalCount > 0 && (
            <div className="cr-result-card__abnormal-count">
              <i className="bi bi-exclamation-triangle"></i> {abnormalCount} abnormal value{abnormalCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      ) : result.testResults ? (
        <div className="cr-result-card__metrics">
          <div className="cr-result-card__metric-row">
            <span className="cr-metric-name">{result.testName || 'Result'}</span>
            <span className="cr-metric-value">
              <strong>{result.testResults}</strong>
              {result.resultUnit && <span className="cr-metric-unit">{result.resultUnit}</span>}
            </span>
          </div>
        </div>
      ) : null}

      {result.doctorAssessment && (
        <div className="cr-result-card__section">
          <div className="cr-section-label">Assessment</div>
          <div className="cr-text-block">{result.doctorAssessment}</div>
        </div>
      )}
      {result.patientSummary && (
        <div className="cr-result-card__section cr-result-card__section--muted">
          <div className="cr-section-label">Patient summary</div>
          <div className="cr-text-block cr-text-block--sm">{result.patientSummary}</div>
        </div>
      )}

      <div className="cr-result-card__footer">
        {(result.labFacilityName || result.documentDate) && (
          <div className="cr-result-card__meta">
            {result.labFacilityName && <span>{result.labFacilityName}</span>}
            {result.documentDate && (
              <span>{new Date(result.documentDate).toLocaleDateString()}</span>
            )}
          </div>
        )}
        {result.fileLocation && (
          <a
            href={getFileUrl(result.fileLocation)}
            target="_blank"
            rel="noopener noreferrer"
            className="cr-link"
          >
            <i className="bi bi-eye"></i> View file
          </a>
        )}
      </div>
    </div>
  );
}
