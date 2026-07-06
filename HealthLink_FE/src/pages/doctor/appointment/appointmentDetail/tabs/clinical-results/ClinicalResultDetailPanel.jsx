import React, { useState, useRef, useEffect } from 'react';
import DocumentViewerModal from '@components/DocumentViewerModal';
import ConfirmModal from '@components/ConfirmModal';

const FLAG_COLORS = {
  CRITICAL: { bg: '#fce4ec', text: '#c62828' },
  HIGH: { bg: '#fff3e0', text: '#e65100' },
  LOW: { bg: '#fff3e0', text: '#e65100' },
  NORMAL: { bg: '#e8f5e9', text: '#2e7d32' },
  UNKNOWN: { bg: '#f5f5f5', text: '#757575' },
};

const STATUS_COLORS = {
  PUBLISHED: { bg: '#bbf7d0', text: '#15803d' },
  DRAFT: { bg: '#f1f5f9', text: '#475569' },
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

export default function ClinicalResultDetailPanel({ result, canManage, onEdit, onDelete, onPublish }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const overflowRef = useRef(null);

  useEffect(() => {
    if (!overflowOpen) return;
    const handleClickOutside = (e) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target)) {
        setOverflowOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOverflowOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [overflowOpen]);

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
  const statusStyle = STATUS_COLORS[result.clinicalStatus] || STATUS_COLORS.DRAFT;

  return (
    <div className="cr-detail-panel">
      <div className="cr-detail-panel__header">
        <div className="cr-detail-panel__meta">
          {result.labFacilityName && <span>{result.labFacilityName}</span>}
          {result.documentDate && (
            <span>{new Date(result.documentDate).toLocaleDateString()}</span>
          )}
        </div>
        <div className="cr-detail-panel__header-actions">
          {result.category && (
            <span className="cr-badge cr-badge--category">{result.category}</span>
          )}
          <span className="cr-badge cr-badge--status" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>{result.clinicalStatus || 'DRAFT'}</span>
          {canManage && result.clinicalStatus !== 'PUBLISHED' && (
            <div className="cr-detail-panel__overflow" ref={overflowRef}>
              <button
                type="button"
                className="cr-detail-panel__overflow-toggle"
                title="Actions"
                onClick={() => setOverflowOpen(prev => !prev)}
              >
                <i className="bi bi-three-dots"></i>
              </button>
              {overflowOpen && (
                <div className="cr-detail-panel__overflow-menu">
                  <button
                    type="button"
                    className="cr-detail-panel__overflow-item"
                    onClick={() => { setOverflowOpen(false); onEdit(result); }}
                  >
                    <i className="bi bi-pencil"></i> Edit
                  </button>
                  {onPublish && result.clinicalStatus === 'DRAFT' && (
                    <button
                      type="button"
                      className="cr-detail-panel__overflow-item"
                      onClick={() => {
                        setOverflowOpen(false);
                        setConfirmAction('publish');
                      }}
                    >
                      <i className="bi bi-send"></i> Publish
                    </button>
                  )}
                  {onDelete && result.clinicalStatus !== 'PUBLISHED' && (
                    <button
                      type="button"
                      className="cr-detail-panel__overflow-item cr-detail-panel__overflow-item--danger"
                      onClick={() => {
                        setOverflowOpen(false);
                        setConfirmAction('delete');
                      }}
                    >
                      <i className="bi bi-trash3"></i> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="cr-detail-panel__title">
        {result.testName || result.documentName || 'Clinical Result'}
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
            <div className="cr-detail-panel__section-label">Attachment</div>
          </div>
          <div className="cr-detail-panel__card-body">
            {showImageInline ? (
              <div className="cr-detail-panel__image-preview">
                <img
                  src={fileUrl}
                  alt={result.documentName || result.testName || 'Attachment'}
                  onClick={() => setViewerOpen(true)}
                />
                {viewerOpen && (
                  <DocumentViewerModal
                    show={viewerOpen}
                    onHide={() => setViewerOpen(false)}
                    document={result}
                  />
                )}
                <div className="cr-attach-credit">
                  <i className="bi bi-arrows-angle-expand"></i>
                  <span>{result.documentName || result.fileLocation?.split('/').pop() || 'View full size'}</span>
                </div>
              </div>
            ) : (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cr-attach-link"
              >
                <span className="cr-attach-link__icon">
                  <i className="bi bi-file-earmark-text"></i>
                </span>
                <span className="cr-attach-link__info">
                  <span className="cr-attach-link__name">
                    {result.documentName || result.fileLocation?.split('/').pop() || 'View file'}
                  </span>
                  <span className="cr-attach-link__hint">
                    <i className="bi bi-box-arrow-up-right"></i> Open in new tab
                  </span>
                </span>
              </a>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmAction === 'publish'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { setConfirmAction(null); onPublish(result); }}
        title="Publish Clinical Result"
        message="This result will be visible to the patient. Continue?"
        confirmText="Publish"
        iconClass="bi-send"
        variant="primary"
      />
      <ConfirmModal
        isOpen={confirmAction === 'delete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { setConfirmAction(null); onDelete(result); }}
        title="Delete Clinical Result"
        message="Delete this draft? This cannot be undone."
        confirmText="Delete"
        iconClass="bi-trash3"
        variant="danger"
      />
    </div>
  );
}
