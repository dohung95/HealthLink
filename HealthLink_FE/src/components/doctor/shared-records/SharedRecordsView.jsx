import React, { useEffect, useMemo, useState } from 'react';
import { shareApi } from '../../../api/shareRecordApi';
import DocumentViewerModal from '../../DocumentViewerModal';

const SharedRecordsView = ({ doctorId, patientFilter }) => {
    const [sharedRecords, setSharedRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [showViewer, setShowViewer] = useState(false);

    useEffect(() => {
        if (!doctorId) return;

        loadSharedRecords();
    }, [doctorId]);

    const loadSharedRecords = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await shareApi.getSharedWithMe(doctorId);
            setSharedRecords(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading shared records:', err);
            setError('Failed to load shared records');
        } finally {
            setLoading(false);
        }
    };

    const filteredRecords = useMemo(() => {
        return sharedRecords.filter((share) => {
            if (!patientFilter) return true;
            return share.patientId === patientFilter;
        });
    }, [sharedRecords, patientFilter]);

    const handleViewDocument = (document) => {
        setSelectedDocument(document);
        setShowViewer(true);
    };

    const handleCloseViewer = () => {
        setShowViewer(false);
        setSelectedDocument(null);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No expiry';

        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return 'N/A';

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const isExpired = (expiryDate) => {
        if (!expiryDate) return false;
        return new Date(expiryDate) < new Date();
    };

    const getPermissionBadge = (share) => {
        if (isExpired(share.expiryDate)) {
            return 'bg-danger';
        }

        if (share.permissionLevel === 'Download') {
            return 'bg-success';
        }

        return 'bg-info';
    };

    if (!doctorId) {
        return (
            <div className="text-center py-5 text-muted">
                <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                Loading doctor profile...
            </div>
        );
    }

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '320px' }}>
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted mt-3 mb-0">Loading shared records...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
            </div>
        );
    }

    if (filteredRecords.length === 0) {
        return (
            <div className="text-center py-5">
                <div className="mb-4">
                    <i className="bi bi-inbox" style={{ fontSize: '4rem', color: '#cbd5e1' }}></i>
                </div>
                <h5 className="text-secondary mb-2">No Shared Records</h5>
                <p className="text-muted mb-0">
                    No patients have shared their health records with you yet.
                </p>
            </div>
        );
    }

    return (
        <div className="container-fluid p-0">
            <div className="row g-4">
                {filteredRecords.map((share) => {
                    const documents = Array.isArray(share.documents) ? share.documents : [];

                    return (
                        <div key={share.shareId} className="col-12">
                            <div className="card border-0 shadow-sm rounded-4">
                                <div className="card-body p-4">
                                    <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                                        <div>
                                            <h5 className="card-title mb-1 fw-bold">
                                                <i className="bi bi-person-fill text-primary me-2"></i>
                                                {share.patientName || 'Patient'}
                                            </h5>

                                            <p className="text-muted small mb-0">
                                                Shared on {formatDate(share.consentGivenAt)}
                                            </p>
                                        </div>

                                        <span className={`badge ${getPermissionBadge(share)}`}>
                                            {isExpired(share.expiryDate)
                                                ? 'Expired'
                                                : share.permissionLevel || 'View'}
                                        </span>
                                    </div>

                                    <div className="bg-light rounded-4 p-3 mb-3">
                                        <div className="row g-3">
                                            <div className="col-md-4">
                                                <small className="text-muted d-block">Record</small>
                                                <strong>
                                                    {share.recordTitle || `Record #${share.healthRecordId}`}
                                                </strong>
                                            </div>

                                            <div className="col-md-4">
                                                <small className="text-muted d-block">Permission</small>
                                                <strong>{share.permissionLevel || 'View'}</strong>
                                            </div>

                                            <div className="col-md-4">
                                                <small className="text-muted d-block">Expires</small>
                                                <strong className={isExpired(share.expiryDate) ? 'text-danger' : ''}>
                                                    {formatDate(share.expiryDate)}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <h6 className="mb-0 fw-bold">
                                                <i className="bi bi-file-earmark-medical me-2"></i>
                                                Shared Documents
                                            </h6>

                                            <span className="badge bg-secondary">
                                                {documents.length} document(s)
                                            </span>
                                        </div>

                                        {documents.length === 0 ? (
                                            <div className="alert alert-info mb-0">
                                                This record was shared, but no documents are available.
                                            </div>
                                        ) : (
                                            <div className="list-group">
                                                {documents.map((doc) => (
                                                    <div
                                                        key={doc.documentId}
                                                        className="list-group-item d-flex justify-content-between align-items-center gap-3"
                                                    >
                                                        <div className="d-flex align-items-center gap-3 flex-grow-1">
                                                            <i
                                                                className="bi bi-file-earmark-medical text-primary"
                                                                style={{ fontSize: '1.6rem' }}
                                                            ></i>

                                                            <div className="flex-grow-1">
                                                                <div className="fw-bold text-dark d-flex align-items-center flex-wrap gap-2">
                                                                    {doc.category && (
                                                                        <span className="badge bg-info bg-opacity-10 text-info fw-normal">
                                                                            {doc.category}
                                                                        </span>
                                                                    )}

                                                                    <span>
                                                                        {doc.documentName ||
                                                                            doc.fileName ||
                                                                            `Document #${doc.documentId}`}
                                                                    </span>
                                                                </div>

                                                                <small className="text-muted d-flex flex-wrap gap-3 mt-1">
                                                                    {doc.documentDate && (
                                                                        <span>
                                                                            <i className="bi bi-calendar-check me-1"></i>
                                                                            Date Performed: {formatDate(doc.documentDate)}
                                                                        </span>
                                                                    )}

                                                                    {doc.uploadedAt && (
                                                                        <span>
                                                                            <i className="bi bi-cloud-upload me-1"></i>
                                                                            Uploaded: {formatDate(doc.uploadedAt)}
                                                                        </span>
                                                                    )}

                                                                    {doc.documentType && (
                                                                        <span>
                                                                            <i className="bi bi-file-text me-1"></i>
                                                                            {doc.documentType}
                                                                        </span>
                                                                    )}
                                                                </small>
                                                            </div>
                                                        </div>

                                                        {!isExpired(share.expiryDate) && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-primary"
                                                                onClick={() => handleViewDocument(doc)}
                                                            >
                                                                <i className="bi bi-eye me-1"></i>
                                                                View
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
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

export default SharedRecordsView;