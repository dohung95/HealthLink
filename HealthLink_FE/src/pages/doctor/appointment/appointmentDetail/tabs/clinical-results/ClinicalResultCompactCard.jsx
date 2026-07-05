import React from 'react';

export default function ClinicalResultCompactCard({ result, isSelected, onSelect, order }) {
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
    PUBLISHED: { bg: '#bbf7d0', text: '#15803d' },
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
      {order != null && (
        <div className="cr-compact-card__order-badge">{order}</div>
      )}
      <div className="cr-compact-card__top">
        <div className="cr-compact-card__meta">
          {result.labFacilityName && <span>{result.labFacilityName}</span>}
          {result.documentDate && (
            <span>{new Date(result.documentDate).toLocaleDateString()}</span>
          )}
        </div>
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
        </div>
      </div>

      <div className="cr-compact-card__title-row">
        <div className="cr-compact-card__title">
          {result.testName || result.documentName || 'Clinical Result'}
        </div>
        {abnormalCount > 0 && (
          <div className="cr-compact-card__abnormal">
            <i className="bi bi-exclamation-triangle"></i> {abnormalCount} abnormal value{abnormalCount > 1 ? 's' : ''}
          </div>
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
