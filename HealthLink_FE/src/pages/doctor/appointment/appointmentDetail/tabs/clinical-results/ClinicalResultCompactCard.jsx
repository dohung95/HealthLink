import React from 'react';

export default function ClinicalResultCompactCard({ result, isSelected, onSelect }) {
  const abnormalCount = (() => {
    try {
      const rows = JSON.parse(result.structuredResultsJson || '[]');
      return Array.isArray(rows)
        ? rows.filter((r) => r.flag === 'LOW' || r.flag === 'HIGH' || r.flag === 'CRITICAL').length
        : 0;
    } catch {
      return 0;
    }
  })();

  const statusColors = {
    COLLECTED: { bg: '#e0f2fe', text: '#0369a1' },
    SENT_TO_LAB: { bg: '#ede9fe', text: '#6d28d9' },
    PENDING_RESULT: { bg: '#fef3c7', text: '#b45309' },
    RESULT_READY: { bg: '#d1fae5', text: '#047857' },
    PUBLISHED: { bg: '#bbf7d0', text: '#15803d' },
    CANCELLED: { bg: '#fce4ec', text: '#c62828' },
    DRAFT: { bg: '#f1f5f9', text: '#475569' },
  };
  const statusStyle = statusColors[result.clinicalStatus] || statusColors.DRAFT;

  return (
    <div
      className={`cr-compact-card ${isSelected ? 'cr-compact-card--selected' : ''}`}
      onClick={() => onSelect(result)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(result); }}
    >
      <div className="cr-compact-card__top">
        <div className="cr-compact-card__badges">
          {result.category && (
            <span className="cr-badge cr-badge--category">{result.category}</span>
          )}
          <span
            className="cr-badge cr-badge--status"
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
          >
            {result.clinicalStatus || 'DRAFT'}
          </span>
          {result.visibilityStatus === 'DRAFT' && (
            <span className="cr-badge cr-badge--draft">Draft</span>
          )}
        </div>
      </div>

      <div className="cr-compact-card__title">
        {result.testName || result.documentName || 'Clinical Result'}
      </div>

      {abnormalCount > 0 && (
        <div className="cr-compact-card__abnormal">
          <i className="bi bi-exclamation-triangle"></i> {abnormalCount} abnormal value{abnormalCount > 1 ? 's' : ''}
        </div>
      )}

      <div className="cr-compact-card__meta">
        {result.labFacilityName && <span>{result.labFacilityName}</span>}
        {result.documentDate && (
          <span>{new Date(result.documentDate).toLocaleDateString()}</span>
        )}
      </div>

      {result.doctorAssessment && (
        <div className="cr-compact-card__assessment">
          <span className="cr-compact-card__label">Assessment</span>
          <p className="cr-compact-card__text">{result.doctorAssessment}</p>
        </div>
      )}
      {result.patientSummary && (
        <div className="cr-compact-card__summary">
          <span className="cr-compact-card__label">Summary</span>
          <p className="cr-compact-card__text cr-compact-card__text--sm">{result.patientSummary}</p>
        </div>
      )}
    </div>
  );
}
