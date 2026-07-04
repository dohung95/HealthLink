import React, { useState } from 'react';
import DocumentViewerModal from '@components/DocumentViewerModal';

const FLAG_COLORS = {
  CRITICAL: { bg: '#fce4ec', text: '#c62828' },
  HIGH: { bg: '#fff3e0', text: '#e65100' },
  LOW: { bg: '#fff3e0', text: '#e65100' },
  NORMAL: { bg: '#e8f5e9', text: '#2e7d32' },
  UNKNOWN: { bg: '#f5f5f5', text: '#757575' },
};

function getFileUrl(fileLocation) {
  if (!fileLocation) return null;
  if (fileLocation.startsWith('http')) return fileLocation;
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8096';
  return `${base}${fileLocation}`;
}

function isImageFile(fileLocation) {
  return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileLocation);
}

export default function ClinicalResultDetailPanel({ result, canManage, onEdit, onDelete }) {
  const [viewerOpen, setViewerOpen] = useState(false);

  if (!result) {
    return (
      <div className="cr-detail-panel cr-detail-panel--empty">
        <div className="cr-detail-empty">
          <i className="bi bi-clipboard2-pulse cr-detail-empty__icon"></i>
          <h5 className="cr-detail-empty__heading">Select a result</h5>
          <p className="cr-detail-empty__text">
            Click a result from the left panel to view its full details here.
          </p>
        </div>
      </div>
    );
  }

  const rows = (() => {
    try {
      const parsed = JSON.parse(result.structuredResultsJson || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const abnormalCount = rows.filter(
    (r) => r.flag === 'LOW' || r.flag === 'HIGH' || r.flag === 'CRITICAL'
  ).length;

  const fileUrl = getFileUrl(result.fileLocation);
  const showImageInline = result.fileLocation && isImageFile(result.fileLocation);

  return (
    <div className="cr-detail-panel">
      <div className="cr-detail-panel__header">
        <div className="cr-detail-panel__badges">
          {result.category && (
            <span className="cr-badge cr-badge--category">{result.category}</span>
          )}
          <span className="cr-badge cr-badge--status">{result.clinicalStatus || 'DRAFT'}</span>
          {result.visibilityStatus === 'DRAFT' && (
            <span className="cr-badge cr-badge--draft">Draft</span>
          )}
        </div>
        {canManage && (
          <button
            type="button"
            className="cr-btn-icon"
            title="Edit"
            onClick={() => onEdit(result)}
          >
            <i className="bi bi-pencil"></i>
          </button>
        )}
        {result.clinicalStatus !== 'PUBLISHED' && canManage && (
          <button
            type="button"
            className="cr-btn-icon cr-btn-icon--danger"
            title="Delete"
            onClick={() => {
              if (window.confirm('Delete this draft? This cannot be undone.')) {
                onDelete?.(result);
              }
            }}
          >
            <i className="bi bi-trash3"></i>
          </button>
        )}
      </div>

      <div className="cr-detail-panel__title">
        {result.testName || result.documentName || 'Clinical Result'}
      </div>

      <div className="cr-detail-panel__meta">
        {result.labFacilityName && <span>{result.labFacilityName}</span>}
        {result.documentDate && (
          <span>{new Date(result.documentDate).toLocaleDateString()}</span>
        )}
      </div>

      <div className="cr-detail-panel__divider" />

      {rows.length > 0 ? (
        <div className="cr-detail-panel__metrics">
          <div className="cr-detail-panel__section-label">Results</div>
          <table className="cr-metrics-table">
            <thead>
              <tr>
                <th>Test</th>
                <th>Value</th>
                <th>Ref range</th>
                <th>Unit</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const flagStyle = FLAG_COLORS[row.flag] || FLAG_COLORS.UNKNOWN;
                return (
                  <tr key={i} className={row.flag === 'CRITICAL' || row.flag === 'HIGH' ? 'cr-metrics-table__row--alert' : ''}>
                    <td>{row.testName || `Test ${i + 1}`}</td>
                    <td className="cr-metrics-table__value" style={{ color: flagStyle.text }}><strong>{row.resultValue}</strong></td>
                    <td className="cr-metrics-table__ref">{row.referenceRange || '-'}</td>
                    <td className="cr-metrics-table__unit">{row.unit || '-'}</td>
                    <td>
                      <span
                        className="cr-flag-chip"
                        style={{ backgroundColor: flagStyle.bg, color: flagStyle.text }}
                      >
                        {row.flag}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {abnormalCount > 0 && (
            <div className="cr-detail-panel__abnormal">
              <i className="bi bi-exclamation-triangle"></i> {abnormalCount} abnormal value{abnormalCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      ) : result.testResults ? (
        <div className="cr-detail-panel__single-result">
          <div className="cr-detail-panel__section-label">Result</div>
          <div className="cr-detail-panel__single-value">
            <strong>{result.testResults}</strong>
            {result.resultUnit && <span className="cr-metric-unit">{result.resultUnit}</span>}
          </div>
        </div>
      ) : null}

      <div className="cr-detail-panel__divider" />

      {result.doctorAssessment && (
        <div className="cr-detail-panel__card">
          <div className="cr-detail-panel__card-header">
            <div className="cr-detail-panel__section-label">Assessment</div>
          </div>
          <div className="cr-detail-panel__card-body">
            <p className="cr-detail-panel__text">{result.doctorAssessment}</p>
          </div>
        </div>
      )}
      {result.patientSummary && (
        <div className="cr-detail-panel__card">
          <div className="cr-detail-panel__card-header">
            <div className="cr-detail-panel__section-label">Patient summary</div>
          </div>
          <div className="cr-detail-panel__card-body">
            <p className="cr-detail-panel__text cr-detail-panel__text--sm">{result.patientSummary}</p>
          </div>
        </div>
      )}

      {result.fileLocation && (
        <div className="cr-detail-panel__card">
          <div className="cr-detail-panel__card-header">
            <div className="cr-detail-panel__section-label">Documents</div>
          </div>
          <div className="cr-detail-panel__card-body">
            <div className="cr-detail-panel__file">
              {showImageInline ? (
                <div className="cr-detail-panel__image-preview">
                  <img
                    src={fileUrl}
                    alt="Result attachment"
                    onClick={() => setViewerOpen(true)}
                  />
                  {viewerOpen && (
                    <DocumentViewerModal
                      show={viewerOpen}
                      onHide={() => setViewerOpen(false)}
                      document={result}
                    />
                  )}
                </div>
              ) : (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cr-link"
                >
                  <i className="bi bi-eye"></i> View file
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
