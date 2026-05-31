import React, { useEffect, useMemo } from 'react';
import Modal from 'react-bootstrap/Modal';

const DocumentViewerModal = ({
  show,
  onHide,
  document: doc,
  apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8096',
}) => {
  useEffect(() => {
    if (!show) return;
    const handler = (e) => { if (e.key === 'Escape') onHide(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [show, onHide]);

  const fileExt = useMemo(() => {
    const name = doc?.documentName || doc?.fileName || '';
    return name.split('.').pop()?.toLowerCase() || '';
  }, [doc]);

  const fileType = useMemo(() => {
    if (['pdf'].includes(fileExt)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExt)) return 'image';
    return 'unknown';
  }, [fileExt]);

  const viewUrl = useMemo(() => {
    if (!doc?.fileLocation) return '';
    if (doc.fileLocation.startsWith('http')) return doc.fileLocation;
    return `${apiBaseUrl}${doc.fileLocation}`;
  }, [doc, apiBaseUrl]);

  const docName = doc?.documentName || doc?.fileName || 'Document';

  if (!doc) return null;

  return (
    <>
      <style>
        {`
          .document-viewer-modal {
            z-index: 9999 !important;
          }
          .document-viewer-modal .modal-backdrop {
            z-index: 9998 !important;
          }
          .dv-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1.25rem;
            border-bottom: 1px solid var(--doctor-border-light);
            background: var(--doctor-surface);
          }
          .dv-header__icon {
            width: 2.25rem;
            height: 2.25rem;
            border-radius: var(--doctor-radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 1.1rem;
          }
          .dv-header__icon--pdf { background: rgba(220,38,38,0.1); color: var(--doctor-error); }
          .dv-header__icon--image { background: rgba(2,132,199,0.1); color: var(--doctor-info); }
          .dv-header__icon--unknown { background: var(--doctor-primary-soft); color: var(--doctor-primary); }
          .dv-header__title {
            flex: 1;
            font-size: 0.9375rem;
            font-weight: 700;
            color: var(--doctor-text);
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .dv-header__actions {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-shrink: 0;
          }
          .dv-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.375rem 0.85rem;
            border-radius: var(--doctor-radius-sm);
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s var(--doctor-ease);
            border: 1px solid transparent;
          }
          .dv-btn--view {
            color: var(--doctor-primary);
            background: var(--doctor-primary-soft);
            border-color: var(--doctor-primary-border);
          }
          .dv-btn--view:hover {
            background: var(--doctor-primary);
            color: #fff;
            border-color: var(--doctor-primary);
          }
          .dv-btn--close {
            color: var(--doctor-text-secondary);
            background: var(--doctor-surface);
            border-color: var(--doctor-border);
          }
          .dv-btn--close:hover {
            background: var(--doctor-surface-hover);
            border-color: var(--doctor-border);
          }
          .dv-btn--close:active {
            transform: scale(0.96);
          }
          .dv-btn--download {
            color: #fff;
            background: var(--doctor-primary);
            border-color: var(--doctor-primary);
          }
          .dv-btn--download:hover {
            background: var(--doctor-primary-hover);
          }
          .dv-body {
            height: 70vh;
            background: #525659;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .dv-body iframe {
            width: 100%;
            height: 100%;
            border: none;
          }
          .dv-body img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: var(--doctor-radius-md);
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          }
          .dv-unsupported {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            padding: 2rem;
            text-align: center;
          }
          .dv-unsupported__icon {
            font-size: 3rem;
            color: var(--doctor-text-muted);
          }
          .dv-unsupported__title {
            font-size: 0.9375rem;
            font-weight: 700;
            color: var(--doctor-text);
            margin: 0;
          }
          .dv-unsupported__desc {
            font-size: 0.8125rem;
            color: var(--doctor-text-muted);
            margin: 0;
            max-width: 24rem;
            line-height: 1.5;
          }
          .dv-download-link {
            color: var(--doctor-primary);
            font-weight: 600;
            text-decoration: underline;
            cursor: pointer;
          }
          .dv-download-link:hover {
            color: var(--doctor-primary-hover);
          }
        `}
      </style>
      <Modal
        show={show}
        onHide={onHide}
        size="xl"
        centered
        className="document-viewer-modal"
      >
        <div className="dv-header">
          <div className={`dv-header__icon dv-header__icon--${fileType}`}>
            <i className={`bi ${fileType === 'pdf' ? 'bi-filetype-pdf' : fileType === 'image' ? 'bi-filetype-jpg' : 'bi-file-earmark-medical'}`} />
          </div>
          <h3 className="dv-header__title">{docName}</h3>
          <div className="dv-header__actions">
            {fileType !== 'unknown' && (
              <button
                className="dv-btn dv-btn--view"
                onClick={() => window.open(viewUrl, '_blank', 'noopener')}
                type="button"
              >
                <i className="bi bi-box-arrow-up-right" />
                View
              </button>
            )}
            <button
              className="dv-btn dv-btn--close"
              onClick={onHide}
              type="button"
            >
              Close
            </button>
          </div>
        </div>

        <div className="dv-body">
          {fileType === 'pdf' && (
            <iframe
              src={viewUrl}
              title={docName}
            />
          )}

          {fileType === 'image' && (
            <img
              src={viewUrl}
              alt={docName}
            />
          )}

          {fileType === 'unknown' && (
            <div className="dv-unsupported">
              <div className="dv-unsupported__icon">
                <i className="bi bi-file-earmark-x" />
              </div>
              <h4 className="dv-unsupported__title">Preview not available</h4>
              <p className="dv-unsupported__desc">
                {fileExt.toUpperCase()} files cannot be previewed in the browser.
              </p>
              <button
                className="dv-btn dv-btn--download"
                onClick={() => {
                  const token = localStorage.getItem('token');
                  const dlUrl = `${apiBaseUrl}/api/HealthRecord/document/${doc.documentId}?token=${encodeURIComponent(token || '')}`;
                  const link = window.document.createElement('a');
                  link.href = dlUrl;
                  link.download = docName;
                  link.target = '_blank';
                  window.document.body.appendChild(link);
                  link.click();
                  window.document.body.removeChild(link);
                }}
                type="button"
              >
                <i className="bi bi-download" />
                Download File
              </button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default DocumentViewerModal;
