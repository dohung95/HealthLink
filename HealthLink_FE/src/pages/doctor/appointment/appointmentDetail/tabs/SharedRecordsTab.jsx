import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { shareApi } from '@api/shareRecordApi';
import DocumentViewerModal from '@components/DocumentViewerModal';
import '@components/Css/doctor/doctor-dashboard/doctor-dashboard.css';

const getDocumentIcon = (doc) => {
  const type = (doc.documentType || doc.fileType || '').toLowerCase();
  const name = (doc.documentName || doc.fileName || '').toLowerCase();
  if (type.includes('pdf') || name.includes('.pdf')) return { icon: 'bi-filetype-pdf', cls: 'sr-doc-icon--pdf' };
  if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg') || name.match(/\.(png|jpg|jpeg|gif|webp)$/)) return { icon: 'bi-filetype-jpg', cls: 'sr-doc-icon--image' };
  if (type.includes('doc') || name.includes('.doc')) return { icon: 'bi-filetype-doc', cls: 'sr-doc-icon--doc' };
  return { icon: 'bi-file-earmark-medical', cls: 'sr-doc-icon--default' };
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const isExpired = (expiryDate) => {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
};

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const SkeletonState = () => (
  <div className="sr-loading-state">
    <div className="sr-skeleton">
      <div className="sr-skeleton__meta" />
      <div className="sr-skeleton__docs">
        <div className="sr-skeleton__doc-row" />
        <div className="sr-skeleton__doc-row" />
      </div>
    </div>
  </div>
);

const SharedRecordsTab = ({ doctorId, patientId, appointmentId }) => {
  const [sharedRecords, setSharedRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  const loadSharedRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await shareApi.getSharedWithMe(doctorId, appointmentId);
      setSharedRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading shared records:', err);
      setError('Unable to load shared records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [doctorId, appointmentId]);

  useEffect(() => {
    if (!doctorId) return;
    loadSharedRecords();
  }, [doctorId, loadSharedRecords]);

  const filteredRecords = useMemo(() => {
    if (appointmentId) return sharedRecords;
    if (!patientId) return sharedRecords;
    return sharedRecords.filter((share) => share.patientId === patientId);
  }, [sharedRecords, patientId, appointmentId]);

  const allDocuments = useMemo(() => {
    const docs = [];
    filteredRecords.forEach((share) => {
      const documents = Array.isArray(share.documents) ? share.documents : [];
      documents.forEach((doc) => {
        docs.push({ ...doc, _share: share });
      });
    });
    return docs;
  }, [filteredRecords]);

  const handleViewDocument = useCallback((doc) => {
    setSelectedDocument(doc);
    setShowViewer(true);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setShowViewer(false);
    setSelectedDocument(null);
  }, []);

  if (!doctorId) {
    return (
      <div className="sr-doctor-loading">
        <span className="spinner-border spinner-border-sm" role="status" />
        Loading doctor profile...
      </div>
    );
  }

  if (loading) {
    return <SkeletonState />;
  }

  if (error) {
    return (
      <div className="sr-error-state">
        <div className="sr-error-state__icon">
          <i className="bi bi-exclamation-triangle" />
        </div>
        <h4 className="sr-error-state__title">Something went wrong</h4>
        <p className="sr-error-state__desc">{error}</p>
        <button className="sr-btn-retry" onClick={loadSharedRecords} type="button">
          <i className="bi bi-arrow-clockwise" />
          Retry
        </button>
      </div>
    );
  }

  if (filteredRecords.length === 0) {
    return (
      <div className="sr-empty-state">
        <div className="sr-empty-state__icon">
          <i className="bi bi-folder2-open" />
        </div>
        <h4 className="sr-empty-state__title">No shared documents for this appointment</h4>
        <p className="sr-empty-state__desc">
          The patient has not shared any health records for this appointment.
        </p>
      </div>
    );
  }

  const firstShare = filteredRecords[0];
  const showMeta = filteredRecords.length === 1 || appointmentId;
  const shareMeta = showMeta ? firstShare : null;
  const expired = isExpired(shareMeta?.expiryDate);

  return (
    <div className="sr-focused-view">
      {shareMeta && (
        <div className="sr-permission-line">
          <div className={`sr-permission-line__item${expired ? ' sr-permission-line__item--danger' : ' sr-permission-line__item--accent'}`}>
            <i className={expired ? 'bi bi-shield-exclamation' : 'bi bi-shield-check'} />
            {expired ? 'Expired' : (shareMeta.permissionLevel || 'View')}
          </div>
          {shareMeta.expiryDate && (
            <div className={`sr-permission-line__item${expired ? ' sr-permission-line__item--danger' : ''}`}>
              <i className="bi bi-clock" />
              {expired ? 'Expired' : `Expires ${formatDate(shareMeta.expiryDate)}`}
            </div>
          )}
          {!expired && shareMeta.consentGivenAt && (
            <div className="sr-permission-line__item">
              <i className="bi bi-calendar3" />
              Shared {formatDate(shareMeta.consentGivenAt)}
            </div>
          )}
        </div>
      )}

      <div className="sr-doc-list">
        {allDocuments.map((doc) => {
          const docIcon = getDocumentIcon(doc);
          const share = doc._share;
          const docExpired = isExpired(share?.expiryDate);

          return (
            <div key={doc.documentId} className="sr-doc-item">
              <div className={`sr-doc-icon ${docIcon.cls}`}>
                <i className={`bi ${docIcon.icon}`} />
              </div>

              <div className="sr-doc-info">
                <div className="sr-doc-name">
                  {doc.documentName || doc.fileName || `Document #${doc.documentId}`}
                </div>
                <div className="sr-doc-meta">
                  {doc.category && (
                    <span className="sr-doc-meta__category">{doc.category}</span>
                  )}
                  {doc.documentDate && (
                    <span>
                      <i className="bi bi-calendar-check" />
                      {formatDate(doc.documentDate)}
                    </span>
                  )}
                  {doc.documentType && (
                    <span>
                      <i className="bi bi-file-text" />
                      {doc.documentType}
                    </span>
                  )}
                  {formatFileSize(doc.fileSize) && (
                    <span>
                      <i className="bi bi-database" />
                      {formatFileSize(doc.fileSize)}
                    </span>
                  )}
                </div>
              </div>

              {!docExpired && (
                <button
                  className="sr-btn-view"
                  onClick={() => handleViewDocument(doc)}
                  type="button"
                >
                  View
                </button>
              )}
            </div>
          );
        })}
      </div>

      <DocumentViewerModal
        show={showViewer}
        onHide={handleCloseViewer}
        document={selectedDocument}
      />
    </div>
  );
};

export default SharedRecordsTab;
