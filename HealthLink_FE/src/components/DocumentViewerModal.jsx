import React from 'react';
import Modal from 'react-bootstrap/Modal';
const DocumentViewerModal = ({
    show,
    onHide,
    document,
    apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7267'
}) => {
    if (!document) return null;
    // Determine file type
    const getFileExtension = (fileName) => {
        return fileName?.split('.').pop()?.toLowerCase() || '';
    };
    const getFileType = () => {
        const ext = getFileExtension(document.documentName);
        if (['pdf'].includes(ext)) return 'pdf';
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext)) return 'image';
        if (['doc', 'docx'].includes(ext)) return 'word';
        if (['xls', 'xlsx'].includes(ext)) return 'excel';
        return 'unknown';
    };
    const getFileTypeIcon = () => {
        const type = getFileType();
        switch (type) {
            case 'pdf': return 'bi-file-pdf text-danger';
            case 'image': return 'bi-file-image text-success';
            case 'word': return 'bi-file-word text-primary';
            case 'excel': return 'bi-file-excel text-success';
            default: return 'bi-file-earmark text-secondary';
        }
    };
    const getViewUrl = () => {
        const token = localStorage.getItem('token');
        return `${apiBaseUrl}/api/HealthRecord/document/${document.documentID}?token=${encodeURIComponent(token)}`;
    };
    const onDownload = (documentID, fileName) => {
        const token = localStorage.getItem('token');
        const downloadUrl = `${apiBaseUrl}/api/HealthRecord/document/${documentID}?token=${encodeURIComponent(token)}`;

        // Create temporary link and trigger download
        const link = window.document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName || 'document';
        link.target = '_blank';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
    };
    const fileType = getFileType();
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
                    .modal-backdrop.show {
                        z-index: 9998 !important;
                    }
                `}
            </style>
            <Modal
                show={show}
                onHide={onHide}
                size="xl"
                centered
                backdrop="static"
                className="document-viewer-modal"
                backdropClassName="modal-backdrop-custom"
            >
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="d-flex align-items-center">
                        <i className={`bi ${getFileTypeIcon()} me-2`} style={{ fontSize: '1.5rem' }}></i>
                        <div>
                            <div>{document.documentName || document.fileName || 'Document'}</div>
                            {document.fileSize && (
                                <small className="text-muted fw-normal">
                                    {(document.fileSize / 1024).toFixed(2)} KB
                                </small>
                            )}
                        </div>
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body style={{ height: '80vh', padding: 0, backgroundColor: '#f8f9fa' }}>
                    {/* PDF Viewer */}
                    {fileType === 'pdf' && (
                        <iframe
                            src={getViewUrl()}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                backgroundColor: '#525659'
                            }}
                            title={document.documentName}
                        />
                    )}

                    {/* Image Viewer */}
                    {fileType === 'image' && (
                        <div className="d-flex justify-content-center align-items-center h-100 p-4">
                            <img
                                src={getViewUrl()}
                                alt={document.documentName}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                    borderRadius: '8px'
                                }}
                            />
                        </div>
                    )}

                    {/* Unsupported File Type */}
                    {fileType === 'unknown' && (
                        <div className="d-flex flex-column justify-content-center align-items-center h-100 text-center p-5">
                            <i className="bi bi-file-earmark-x" style={{ fontSize: '5rem', color: '#cbd5e1' }}></i>
                            <h4 className="mt-4 mb-3">Preview Not Available</h4>
                            <p className="text-muted mb-4">
                                This file type ({getFileExtension(document.documentName).toUpperCase()}) cannot be previewed in the browser.
                                <br />
                                Please download the file to view its contents.
                            </p>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={() => {
                                    onDownload(document.documentID, document.documentName);
                                    onHide();
                                }}
                            >
                                <i className="bi bi-download me-2"></i>
                                Download File
                            </button>
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer className="bg-light">
                    <div className="d-flex justify-content-between align-items-center w-100">
                        <div className="text-muted small">
                            <div className="mb-2">
                                <i className="bi bi-calendar3 me-2"></i>
                                Uploaded: {document.uploadedAt
                                    ? new Date(document.uploadedAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })
                                    : 'Unknown'
                                }
                            </div>
                            {document.documentDate && (
                                <div className="mb-2">
                                    <i className="bi bi-calendar-event me-2"></i>
                                    Date Performed: <strong>
                                        {new Date(document.documentDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </strong>
                                </div>
                            )}
                            {document.category && (
                                <div className="mb-2">
                                    <i className="bi bi-folder me-2"></i>
                                    Category: <strong>{document.category}</strong>
                                </div>
                            )}
                            {document.description && (
                                <div className="bg-light rounded p-3 mt-3" style={{
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    overflowX: 'hidden'
                                }}>
                                    <small className="text-muted d-block mb-1">
                                        <i className="bi bi-chat-left-text me-2"></i>
                                        <strong>Notes:</strong>
                                    </small>
                                    <p className="mb-0 text-dark" style={{
                                        wordBreak: 'break-word',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {document.description}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="d-flex gap-2">
                            {fileType !== 'unknown' && (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => onDownload(document.documentID, document.fileName)}
                                >
                                    <i className="bi bi-download me-2"></i>
                                    Download
                                </button>
                            )}
                            <button className="btn btn-secondary" onClick={onHide}>
                                Close
                            </button>
                        </div>
                    </div>
                </Modal.Footer>
            </Modal>
        </>
    );
};
export default DocumentViewerModal;