import React from 'react';
import { createPortal } from 'react-dom';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const isImage = (doc) => {
  const mime = (doc.mimeType || doc.fileType || '').toLowerCase();
  return mime.startsWith('image/');
};

export default function DocumentPreviewModal({ document: doc, onClose }) {
  if (!doc) return null;

  const isImg = isImage(doc);
  const src = doc.fileUrl || doc.url || doc.documentUrl;
  const name = doc.documentName || doc.fileName || 'Document';
  const type = doc.documentType || doc.category || doc.fileType || 'Unknown';
  const size = formatFileSize(doc.fileSize);
  const date = formatDate(doc.documentDate || doc.uploadedAt || doc.createdAt);
  const description = doc.description || doc.notes || '';

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '700px', padding: 0, overflow: 'hidden' }}>
        <button className="btn-close" onClick={onClose}
          style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 1, border: 'none', background: 'rgba(0,0,0,0.1)', borderRadius: '50%', width: '32px', height: '32px', fontSize: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ×
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', padding: '1rem' }}>
            {isImg && src ? (
              <img src={src} alt={name} style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '4px' }} />
            ) : (
              <i className="bi bi-file-earmark-text" style={{ fontSize: '4rem', color: 'var(--doctor-text-muted)' }} />
            )}
          </div>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{name}</h3>
            <div className="document-preview-detail">
              <span className="document-preview-detail__label">Type</span>
              <span className="document-preview-detail__value">{type}</span>
            </div>
            {size && (
              <div className="document-preview-detail">
                <span className="document-preview-detail__label">Size</span>
                <span className="document-preview-detail__value">{size}</span>
              </div>
            )}
            <div className="document-preview-detail">
              <span className="document-preview-detail__label">Date</span>
              <span className="document-preview-detail__value">{date}</span>
            </div>
            {description && (
              <div className="document-preview-detail" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                <span className="document-preview-detail__label">Description</span>
                <span className="document-preview-detail__value" style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>{description}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
