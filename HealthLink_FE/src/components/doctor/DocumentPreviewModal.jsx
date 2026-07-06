import React, { useState, useRef, useCallback, useEffect } from 'react';
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

const getFileExt = (doc) => {
  const loc = doc?.fileLocation || '';
  const ext = loc.split('.').pop()?.toLowerCase();
  if (ext) return ext;
  const name = doc?.documentName || doc?.fileName || '';
  return name.split('.').pop()?.toLowerCase() || '';
};

const isImage = (doc) => {
  const mime = (doc.mimeType || doc.fileType || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  const ext = getFileExt(doc);
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
};

const isPdf = (doc) => {
  const mime = (doc.mimeType || '').toLowerCase();
  if (mime === 'application/pdf') return true;
  return getFileExt(doc) === 'pdf';
};

const isOfficeDoc = (doc) => {
  const ext = getFileExt(doc);
  return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);
};

const getFileIcon = (doc) => {
  const ext = getFileExt(doc);
  const map = {
    pdf: 'bi-filetype-pdf',
    doc: 'bi-filetype-docx',
    docx: 'bi-filetype-docx',
    xls: 'bi-filetype-xlsx',
    xlsx: 'bi-filetype-xlsx',
    ppt: 'bi-filetype-pptx',
    pptx: 'bi-filetype-pptx',
  };
  return map[ext] || 'bi-file-earmark-text';
};

export default function DocumentPreviewModal({ document: doc, onClose }) {
  if (!doc) return null;

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8096';
  const src = doc.fileLocation
    ? (doc.fileLocation.startsWith('http') ? doc.fileLocation : `${apiBaseUrl}${doc.fileLocation}`)
    : '';
  const name = doc.documentName || doc.fileName || 'Document';
  const type = doc.documentType || doc.category || doc.fileType || 'Unknown';
  const size = formatFileSize(doc.fileSize);
  const date = formatDate(doc.documentDate || doc.uploadedAt || doc.createdAt);
  const description = doc.description || doc.notes || '';
  const img = isImage(doc);
  const pdf = isPdf(doc);
  const office = isOfficeDoc(doc);
  const fileExt = getFileExt(doc);
  const hasPreview = img || pdf || office;
  const officeViewUrl = office && src
    ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(src)}`
    : '';

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, panX: 0, panY: 0 });
  const imgContainerRef = useRef(null);

  useEffect(() => {
    const el = imgContainerRef.current;
    if (!img || !el) return;
    const handler = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.25 : 0.25;
      setZoom(z => Math.max(0.5, Math.min(5, +(z + delta).toFixed(2))));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [img]);

  const zoomIn = useCallback(() => {
    setZoom(z => Math.min(5, +(z + 0.25).toFixed(2)));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDownload = async () => {
    if (!src) return;
    try {
      const resp = await fetch(src);
      if (!resp.ok) throw new Error('fetch failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, '_blank');
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: hasPreview || img ? '1000px' : '700px', padding: 0, overflow: 'hidden', background: '#fff', borderRadius: '16px', width: '100%', maxHeight: '90vh' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1rem', borderBottom: '1px solid var(--doctor-border)',
          background: 'var(--doctor-surface)',
        }}>
          <h3 style={{
            margin: 0, fontSize: '0.9375rem', fontWeight: 700, flex: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {name}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {src && (
              <button onClick={handleDownload} type="button"
                style={{
                  border: '1px solid var(--doctor-border)', background: 'var(--doctor-surface)',
                  borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--doctor-text-secondary)', fontSize: '1rem',
                }}
                title="Download file">
                <i className="bi bi-download" />
              </button>
            )}
            <button onClick={onClose} type="button"
              style={{
                border: 'none', background: 'rgba(0,0,0,0.05)', borderRadius: '50%',
                width: '32px', height: '32px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem', color: 'var(--doctor-text-secondary)',
              }}>
              ×
            </button>
          </div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: hasPreview || img ? '2fr 1fr' : '1fr 1fr',
          minHeight: img ? '550px' : hasPreview ? '450px' : '300px',
        }}>
          <div style={{
            position: 'relative', overflow: 'hidden', background: '#f5f5f5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {img && src ? (
              <div ref={imgContainerRef} style={{
                width: '100%', height: '100%', position: 'absolute', inset: 0,
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img src={src} alt={name} draggable={false}
                  style={{
                    maxWidth: '100%', maxHeight: '700px',
                    objectFit: 'contain',
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                    userSelect: 'none',
                    transition: isDragging ? 'none' : 'transform 0.12s ease',
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp} />
                {zoom !== 1 && (
                  <div style={{
                    position: 'absolute', bottom: '0.75rem', left: '50%',
                    transform: 'translateX(-50%)', zIndex: 2,
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
                    borderRadius: '8px', padding: '0.375rem 0.625rem',
                    userSelect: 'none',
                  }}>
                    <button onClick={zoomOut} type="button"
                      style={{
                        border: 'none', background: 'transparent', color: '#fff',
                        cursor: 'pointer', fontSize: '1.125rem', lineHeight: 1,
                        padding: '0 0.25rem', display: 'flex',
                      }}>−</button>
                    <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600, minWidth: '2.5rem', textAlign: 'center' }}>
                      {Math.round(zoom * 100)}%
                    </span>
                    <button onClick={zoomIn} type="button"
                      style={{
                        border: 'none', background: 'transparent', color: '#fff',
                        cursor: 'pointer', fontSize: '1.125rem', lineHeight: 1,
                        padding: '0 0.25rem', display: 'flex',
                      }}>+</button>
                    <span style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.3)' }} />
                    <button onClick={resetView} type="button"
                      style={{
                        border: 'none', background: 'transparent', color: '#fff',
                        cursor: 'pointer', fontSize: '0.6875rem', padding: '0 0.25rem',
                        opacity: 0.8,
                      }}>Reset</button>
                  </div>
                )}
              </div>
            ) : pdf && src ? (
              <embed src={src} type="application/pdf" width="100%" height="100%"
                style={{ border: 'none', borderRadius: '4px' }} />
            ) : office && src ? (
              <iframe src={officeViewUrl} title={name}
                width="100%" height="100%" style={{ border: 'none', borderRadius: '4px', background: '#fff' }} />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <i className={getFileIcon(doc)}
                  style={{ fontSize: '4rem', color: 'var(--doctor-text-muted)', display: 'block', marginBottom: '0.5rem' }} />
                {fileExt && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--doctor-text-muted)', textTransform: 'uppercase' }}>
                    {fileExt}
                  </span>
                )}
              </div>
            )}
          </div>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
