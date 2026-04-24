import React, { useState, useEffect } from 'react';
import { shareApi } from '../api/shareRecordApi';
import { healthRecordApi } from '../api/healthRecordApi';
import DocumentViewerModal from './DocumentViewerModal';

const SharedRecordsView = ({ patientFilter }) => {
    const [sharedRecords, setSharedRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [showViewer, setShowViewer] = useState(false);
    const [expandedRecords, setExpandedRecords] = useState(new Set());
    const [recordDetails, setRecordDetails] = useState(new Map());
    const [loadingRecords, setLoadingRecords] = useState(new Set());
    useEffect(() => {
        loadSharedRecords();
    }, []);
    const loadSharedRecords = async () => {
        try {
            setLoading(true);
            const data = await shareApi.getSharedWithMe();
            setSharedRecords(data);
        } catch (err) {
            console.error('Error loading shared records:', err);
            setError('Failed to load shared records');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDocument = (document) => {
        setSelectedDocument(document);
        setShowViewer(true);
    };
    const handleCloseViewer = () => {
        setShowViewer(false);
        setSelectedDocument(null);
    };

    const handleToggleRecord = async (shareId, healthRecordID) => {
        const newExpanded = new Set(expandedRecords);

        if (newExpanded.has(shareId)) {
            // Collapse
            newExpanded.delete(shareId);
            setExpandedRecords(newExpanded);
        } else {
            // Expand
            newExpanded.add(shareId);
            setExpandedRecords(newExpanded);

            // Load record details if not already loaded
            if (!recordDetails.has(healthRecordID)) {
                await loadRecordDetails(healthRecordID, shareId);
            }
        }
    };
    const loadRecordDetails = async (healthRecordID, shareId) => {
        try {
            const newLoadingRecords = new Set(loadingRecords);
            newLoadingRecords.add(shareId);
            setLoadingRecords(newLoadingRecords);
            const recordData = await healthRecordApi.getRecordById(healthRecordID);

            const newRecordDetails = new Map(recordDetails);
            newRecordDetails.set(healthRecordID, recordData);
            setRecordDetails(newRecordDetails);
        } catch (err) {
            console.error('Error loading record details:', err);
        } finally {
            const newLoadingRecords = new Set(loadingRecords);
            newLoadingRecords.delete(shareId);
            setLoadingRecords(newLoadingRecords);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No expiry';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };
    const isExpired = (expiryDate) => {
        if (!expiryDate) return false;
        return new Date(expiryDate) < new Date();
    };
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
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
    if (sharedRecords.length === 0) {
        return (
            <div className="text-center py-5">
                <div className="mb-4">
                    <i className="bi bi-inbox" style={{ fontSize: '4rem', color: '#cbd5e1' }}></i>
                </div>
                <h5 className="text-secondary mb-2">No Shared Records</h5>
                <p className="text-muted">
                    No patients have shared their health records with you yet.
                </p>
            </div>
        );
    }
    return (
        <div className="container-fluid p-0">
            <div className="row g-4">
                {sharedRecords
                    .filter(share => !patientFilter || share.patientID === patientFilter)
                    .map((share) => (
                        <div key={share.shareID} className="col-12">
                            <div className="card border-0 shadow-sm">
                                <div className="card-body">
                                    {/* Header */}
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <h5 className="card-title mb-1">
                                                <i className="bi bi-person-fill text-primary me-2"></i>
                                                {share.patientName || 'Patient'}
                                            </h5>
                                            <p className="text-muted small mb-0">
                                                Shared on {formatDate(share.sharedDate)}
                                            </p>
                                        </div>
                                        <div className="text-end">
                                            <span className={`badge ${isExpired(share.expiryDate)
                                                ? 'bg-danger'
                                                : share.permissionLevel === 'Download'
                                                    ? 'bg-success'
                                                    : 'bg-info'
                                                }`}>
                                                {isExpired(share.expiryDate)
                                                    ? 'Expired'
                                                    : share.permissionLevel}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Record Info */}
                                    <div className="bg-light rounded p-3 mb-3">
                                        <div className="row g-2">
                                            <div className="col-md-4">
                                                <small className="text-muted d-block">Record Type</small>
                                                <strong>{share.recordType || 'Health Record'}</strong>
                                            </div>
                                            <div className="col-md-4">
                                                <small className="text-muted d-block">Permission</small>
                                                <strong>{share.permissionLevel}</strong>
                                            </div>
                                            <div className="col-md-4">
                                                <small className="text-muted d-block">Expires</small>
                                                <strong className={isExpired(share.expiryDate) ? 'text-danger' : ''}>
                                                    {formatDate(share.expiryDate)}
                                                </strong>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-top">
                                            <h6 className="mb-2">
                                                <i className="bi bi-file-medical-fill text-primary me-2"></i>
                                                Medical History Summary
                                            </h6>
                                            <div className="bg-white p-3 rounded border">
                                                {share.medicalHistorySummary ? (
                                                    <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                                                        {share.medicalHistorySummary}
                                                    </p>
                                                ) : (
                                                    <p className="mb-0 text-muted fst-italic">
                                                        <i className="bi bi-info-circle me-2"></i>
                                                        No medical history summary available for this patient.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Documents */}
                                    {share.sharedDocumentIDs && share.sharedDocumentIDs.length > 0 ? (
                                        <div>
                                            <h6 className="mb-2">
                                                <i className="bi bi-file-earmark-medical me-2"></i>
                                                Shared Documents ({share.sharedDocumentIDs.length})
                                            </h6>
                                            <div className="list-group">
                                                {share.documents?.map((doc, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="list-group-item d-flex justify-content-between align-items-center"
                                                        style={{
                                                            transition: 'background-color 0.2s',
                                                            cursor: 'pointer'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                                    >
                                                        {/* Left side - Document info (clickable) */}
                                                        <div
                                                            className="flex-grow-1"
                                                            onClick={() => handleViewDocument(doc)}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <div className="d-flex align-items-center">
                                                                <i className="bi bi-file-pdf text-danger me-3" style={{ fontSize: '1.5rem' }}></i>
                                                                <div className="flex-grow-1">
                                                                    {/* Title với category badge */}
                                                                    <div className="fw-bold text-primary d-flex align-items-center">
                                                                        {doc.category && (
                                                                            <span className="badge bg-info bg-opacity-10 text-info me-2 fw-normal" style={{ fontSize: '0.65rem' }}>
                                                                                {doc.category}
                                                                            </span>
                                                                        )}
                                                                        {doc.fileName || `Document ${idx + 1}`}
                                                                    </div>

                                                                    {/* Document info line */}
                                                                    <small className="text-muted d-flex gap-2" style={{ fontSize: '0.75rem' }}>
                                                                        {/* Document Date */}
                                                                        {doc.documentDate && (
                                                                            <span>
                                                                                <i className="bi bi-calendar-check me-1"></i>
                                                                                {formatDate(doc.documentDate)}
                                                                            </span>
                                                                        )}
                                                                        {/* Upload Date */}
                                                                        {doc.uploadedAt && (
                                                                            <span>
                                                                                <i className="bi bi-cloud-upload me-1"></i>
                                                                                Uploaded: {formatDate(doc.uploadedAt)}
                                                                            </span>
                                                                        )}
                                                                        {/* Document Type */}
                                                                        {doc.documentType && (
                                                                            <span>
                                                                                <i className="bi bi-file-text me-1"></i>
                                                                                {doc.documentType}
                                                                            </span>
                                                                        )}
                                                                    </small>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Right side - Action buttons */}
                                                        {!isExpired(share.expiryDate) && (
                                                            <div className="btn-group btn-group-sm" onClick={(e) => e.stopPropagation()}>
                                                                <button
                                                                    className="btn btn-outline-info"
                                                                    onClick={() => handleViewDocument(doc)}
                                                                    title="View document"
                                                                >
                                                                    <i className="bi bi-eye me-1"></i>
                                                                    View
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )) || (
                                                        <div className="list-group-item text-muted">
                                                            {share.sharedDocumentIDs.length} document(s) shared
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div
                                                className="alert alert-info mb-2 d-flex justify-content-between align-items-center"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleToggleRecord(share.shareID, share.healthRecordID)}
                                            >
                                                <div>
                                                    <i className="bi bi-info-circle me-2"></i>
                                                    <strong>Entire Record Shared</strong> - Click to view all documents
                                                </div>
                                                <i className={`bi bi-chevron-${expandedRecords.has(share.shareID) ? 'up' : 'down'}`}></i>
                                            </div>

                                            {/* Expanded Documents List */}
                                            {expandedRecords.has(share.shareID) && (
                                                <div className="mt-2">
                                                    {loadingRecords.has(share.shareID) ? (
                                                        <div className="text-center py-3">
                                                            <div className="spinner-border spinner-border-sm text-primary" role="status">
                                                                <span className="visually-hidden">Loading...</span>
                                                            </div>
                                                            <p className="text-muted small mt-2">Loading documents...</p>
                                                        </div>
                                                    ) : (
                                                        <div className="list-group">
                                                            {recordDetails.get(share.healthRecordID)?.medicalDocuments?.map((doc, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="list-group-item d-flex justify-content-between align-items-center"
                                                                    style={{
                                                                        transition: 'background-color 0.2s',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                                                >
                                                                    <div
                                                                        className="flex-grow-1"
                                                                        onClick={() => handleViewDocument(doc)}
                                                                        style={{ cursor: 'pointer' }}
                                                                    >
                                                                        <div className="d-flex align-items-center">
                                                                            <i className="bi bi-file-pdf text-danger me-3" style={{ fontSize: '1.5rem' }}></i>
                                                                            <div className="flex-grow-1">
                                                                                {/* Title với category badge */}
                                                                                <div className="fw-bold text-primary d-flex align-items-center">
                                                                                    {doc.category && (
                                                                                        <span className="badge bg-info bg-opacity-10 text-info me-2 fw-normal" style={{ fontSize: '0.65rem' }}>
                                                                                            {doc.category}
                                                                                        </span>
                                                                                    )}
                                                                                    {doc.fileName || `Document ${idx + 1}`}
                                                                                </div>

                                                                                {/* Document info line */}
                                                                                <small className="text-muted d-flex gap-2" style={{ fontSize: '0.75rem' }}>
                                                                                    {/* Document Date */}
                                                                                    {doc.documentDate && (
                                                                                        <span>
                                                                                            <i className="bi bi-calendar-check me-1"></i>
                                                                                            {formatDate(doc.documentDate)}
                                                                                        </span>
                                                                                    )}
                                                                                    {/* Upload Date */}
                                                                                    {doc.uploadedAt && (
                                                                                        <span>
                                                                                            <i className="bi bi-cloud-upload me-1"></i>
                                                                                            Uploaded: {formatDate(doc.uploadedAt)}
                                                                                        </span>
                                                                                    )}
                                                                                    {/* Document Type */}
                                                                                    {doc.documentType && (
                                                                                        <span>
                                                                                            <i className="bi bi-file-text me-1"></i>
                                                                                            {doc.documentType}
                                                                                        </span>
                                                                                    )}
                                                                                </small>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {!isExpired(share.expiryDate) && (
                                                                        <button
                                                                            className="btn btn-sm btn-outline-info"
                                                                            onClick={() => handleViewDocument(doc)}
                                                                            title="View document"
                                                                        >
                                                                            <i className="bi bi-eye me-1"></i>
                                                                            View
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )) || (
                                                                    <div className="list-group-item text-muted text-center">
                                                                        No documents found in this record
                                                                    </div>
                                                                )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
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