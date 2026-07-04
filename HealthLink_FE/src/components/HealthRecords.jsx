import React, { useEffect, useState } from 'react';
import { healthRecordApi } from '../api/healthRecordApi';
import DocumentViewerModal from './DocumentViewerModal';
import "../components/Css/HealthRecords.css"
import { toast } from 'sonner';
import Loading from './Loading';
import { getProfile } from '../api/account';
import { useAuth } from '../context/AuthContext';
import { moderateImageFile, isImageFile } from '../utils/imageModeration';
import RichTextEditor from '../utils/ckeditor/RichTextEditor';

const HealthRecords = ({ embedded = false }) => {
    const HEALTH_RECORD_PAGE_SIZE = 5;
    const { token } = useAuth();
    const [patientId, setPatientId] = useState('');
    // State for Documents
    const [records, setRecords] = useState([]);
    const [expandedRecordId, setExpandedRecordId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: HEALTH_RECORD_PAGE_SIZE,
        totalItems: 0,
        totalPages: 0,
    });
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [files, setFiles] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(false);

    // State for Medical History
    const [loading, setLoading] = useState(true);

    // States for upload form
    const [documentCategory, setDocumentCategory] = useState('');
    const [description, setDescription] = useState('');
    const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
    const [uploading, setUploading] = useState(false);
    // States for filters & search
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [showViewer, setShowViewer] = useState(false);

    useEffect(() => {
        if (!token) return;

        const initializePage = async () => {
            try {
                setLoading(true);

                const profile = await getProfile(token);
                setPatientId(profile.userId);

                await loadData(profile.userId, 1);
            } catch (error) {
                console.error('Failed to initialize health records page:', error);
                toast.error('Unable to load health records.');
            } finally {
                setLoading(false);
            }
        };

        initializePage();
    }, [token]);

    useEffect(() => {
        if (!patientId) return;

        loadData(patientId, 1);
    }, [fromDate, toDate, sortBy]);

    const loadData = async (
        currentPatientId = patientId,
        page = currentPage
    ) => {
        if (!currentPatientId) return;

        setLoadingDocs(true);

        try {
            const docsData = await healthRecordApi.getMyRecords(
                currentPatientId,
                page,
                HEALTH_RECORD_PAGE_SIZE,
                {
                    fromDate,
                    toDate,
                    sort: sortBy,
                }
            );

            setRecords(docsData.items || []);

            setPagination({
                page: docsData.page || page,
                pageSize: docsData.pageSize || HEALTH_RECORD_PAGE_SIZE,
                totalItems: docsData.totalItems || 0,
                totalPages: docsData.totalPages || 0,
            });

            setCurrentPage(docsData.page || page);
        } catch (error) {
            console.error('Error loading health records:', error);
            toast.error('Unable to load health records.');
        } finally {
            setLoadingDocs(false);
        }
    };

    const handlePageChange = async (page) => {
        if (
            page < 1 ||
            page > pagination.totalPages ||
            page === currentPage
        ) {
            return;
        }

        await loadData(patientId, page);
    };

    const getPageNumbers = () => {
        const total = pagination.totalPages;

        if (total <= 7) {
            return Array.from({ length: total }, (_, index) => index + 1);
        }

        const pages = [1];

        const start = Math.max(2, currentPage - 1);
        const end = Math.min(total - 1, currentPage + 1);

        if (start > 2) {
            pages.push('left-ellipsis');
        }

        for (let page = start; page <= end; page++) {
            pages.push(page);
        }

        if (end < total - 1) {
            pages.push('right-ellipsis');
        }

        pages.push(total);

        return pages;
    };

    const handleViewDocument = (document) => {
        setSelectedDocument(document);
        setShowViewer(true);
    };

    const handleToggleRecord = (recordId) => {
        setExpandedRecordId((prev) =>
            prev === recordId ? null : recordId
        );
    };

    const handleCloseViewer = () => {
        setShowViewer(false);
        setSelectedDocument(null);
    };

    // --- HANDLE UPLOAD FILE ---
    const handleFileChange = async (e) => {
        const rawFiles = Array.from(e.target.files || []);
        const acceptedFiles = [];

        for (const file of rawFiles) {
            try {
                let result = null;

                if (isImageFile(file)) {
                    toast.info(`Scanning ${file.name}...`);

                    result = await moderateImageFile(file);

                    if (!result.safe) {
                        toast.error(`${file.name} was blocked because it may contain explicit sensitive content.`);
                        continue;
                    }

                    if (result.warning) {
                        toast.warning(`${file.name} may be sensitive. Please make sure this is a valid medical document.`);
                    }
                }

                acceptedFiles.push({
                    file,
                    name: file.name,
                    size: file.size,
                    moderationWarning: result?.warning || false,
                    moderationReason: result?.reason || '',
                });
            } catch (error) {
                console.error('Image moderation error:', error);
                toast.error(`Cannot scan ${file.name}. Please try another file.`);
            }
        }

        setFiles(acceptedFiles);
        e.target.value = '';
    };

    const handleSubmitUpload = async (e) => {
        e.preventDefault();

        if (uploading) return;

        if (files.length === 0) {
            toast.warning('Please select at least one file.');
            return;
        }

        if (!documentDate) {
            toast.warning('Please select the date performed.');
            return;
        }

        const selectedPerformedDate = new Date(`${documentDate}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedPerformedDate > today) {
            toast.warning('Date performed cannot be in the future.');
            return;
        }

        try {
            setUploading(true);
            for (let i = 0; i < files.length; i++) {
                await healthRecordApi.uploadDocumentAutoRecord(
                    patientId,
                    files[i].file,
                    documentCategory,
                    description,
                    documentDate
                );
            }

            toast.success('Uploaded successfully!');

            setShowUploadForm(false);
            setFiles([]);
            setDocumentCategory('');
            setDescription('');

            await loadData(patientId, 1);
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error(
                'Upload failed: ' +
                (error.response?.data?.message || error.message)
            );
        } finally {
            setUploading(false);
        }
    };

    const getFileUrl = (fileLocation) => {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8096';

        if (!fileLocation) return '';

        if (fileLocation.startsWith('http')) {
            return fileLocation;
        }

        return `${apiBaseUrl}${fileLocation}`;
    };

    if (loading) {
        if (embedded) {
            return (
                <div className="dashboard-inline-loading">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2 text-muted">Loading health records...</p>
                </div>
            );
        }

        return <Loading />;
    }

    const formatRecordDate = (dateValue) => {
        if (!dateValue) return 'Unknown date';

        return new Date(dateValue).toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <div className={embedded ? 'dashboard-embedded-page' : 'Background_Doctors'}>
            <style>
                {`
                .nav-pills .nav-link.active {
                    color: #ffffff !important;
                }
            `}
            </style>
            <div className={embedded ? 'container-fluid px-0' : 'container'}>
                {/* --- HEADER --- */}
                <div className="d-flex align-items-center justify-content-center mb-5 animate__animated animate__fadeInDown">
                    <div className="bg-primary text-white rounded-4 shadow-sm d-flex align-items-center justify-content-center me-3" style={{ width: 56, height: 56 }}>
                        <i className="bi bi-heart-pulse fs-3"></i>
                    </div>
                    <div className="text-center">
                        <h2 className="mb-0 fw-bold text-dark">My Health Records</h2>
                        <p className="text-muted mb-0 small">Manage your medical history and personal documents</p>
                    </div>
                </div>

                {/* --- 1. DOCUMENT UPLOAD SECTION --- */}
                <div className="d-flex justify-content-between align-items-center mb-4 animate__animated animate__fadeIn">
                    <h4 className="fw-bold text-dark m-0">Medical Documents</h4>

                    <button
                        className={`btn ${showUploadForm ? 'btn-danger' : 'btn-primary'} rounded-pill shadow-sm px-4 fw-medium`}
                        onClick={() => setShowUploadForm(!showUploadForm)}
                    >
                        <i className={`bi ${showUploadForm ? 'bi-x-lg' : 'bi-cloud-upload'} me-2`}></i>
                        {showUploadForm ? 'Close Form' : 'Upload Documents'}
                    </button>
                </div>

                {showUploadForm && (
                    <div className="card border-0 shadow-sm bg-white rounded-4 mb-5 animate__animated animate__slideInDown">
                        <div className="card-body p-4">
                            <form onSubmit={handleSubmitUpload}>

                                <div className="row g-4">
                                    {/* Left Column: Basic Info */}
                                    <div className="col-lg-5 border-end-lg">
                                        <h6 className="fw-bold text-secondary mb-3">Document Info</h6>

                                        <div className="mb-3">
                                            <label className="form-label small fw-bold text-muted text-uppercase">Category <span className="text-danger">*</span></label>
                                            <select className="form-select bg-light border-0 py-2" value={documentCategory} onChange={e => setDocumentCategory(e.target.value)} required>
                                                <option value="">-- Choose Category --</option>
                                                <option value="X-Ray">🩻 X-Ray</option>
                                                <option value="CT-Scan">🔬 CT Scan</option>
                                                <option value="MRI">🧲 MRI</option>
                                                <option value="Ultrasound">📡 Ultrasound</option>
                                                <option value="Blood-Test">💉 Blood Test</option>
                                                <option value="Lab-Report">🧪 Lab Report</option>
                                                <option value="Prescription">💊 Prescription</option>
                                                <option value="Consultation-Notes">📝 Notes</option>
                                                <option value="Other">📄 Other</option>
                                            </select>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label small fw-bold text-muted text-uppercase">Date Performed <span className="text-danger">*</span></label>
                                            <input type="date" className="form-control bg-light border-0 py-2" value={documentDate} max={new Date().toISOString().split('T')[0]} onChange={e => setDocumentDate(e.target.value)} required />
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label small fw-bold text-muted text-uppercase">Attachments <span className="text-danger">*</span></label>
                                            <input type="file" className="form-control bg-light border-0" multiple accept="image/*,.pdf" onChange={handleFileChange} />
                                            <div className="form-text small"><i className="bi bi-info-circle me-1"></i>Supports: PDF, JPG, PNG (Max 10MB)</div>

                                            {/* File Preview List */}
                                            {files.length > 0 && (
                                                <div className="mt-3 bg-light rounded p-2 border border-dashed">
                                                    <small className="text-success fw-bold d-block mb-1">✓ Selected {files.length} file(s):</small>
                                                    <ul className="mb-0 ps-3 small text-muted">
                                                        {Array.from(files).map((f, i) => (
                                                            <li key={i}>
                                                                {f.name} ({(f.size / 1024).toFixed(0)} KB)

                                                                {f.moderationWarning && (
                                                                    <div className="moderation-warning mt-2">
                                                                        <i className="bi bi-exclamation-triangle me-1"></i>
                                                                        {f.moderationReason || 'This image may be sensitive. Please make sure this is a valid medical document.'}
                                                                    </div>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Column: Details & Results */}
                                    <div className="col-lg-7">
                                        <h6 className="fw-bold text-secondary mb-3">Details & Results</h6>

                                        <div className="mb-3">
                                            <label className="form-label small fw-bold text-muted text-uppercase">Description / Notes</label>
                                            <RichTextEditor
                                                value={description}
                                                onChange={setDescription}
                                                placeholder="E.g., Chest X-ray due to persistent cough..."
                                            />
                                        </div>

                                        <div className="d-flex justify-content-end gap-3 mt-4 pt-3 border-top">
                                            <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowUploadForm(false)}>Cancel</button>
                                            <button
                                                type="submit"
                                                className="btn btn-success rounded-pill px-4 fw-bold shadow-sm"
                                                disabled={uploading}
                                            >
                                                <i className="bi bi-cloud-arrow-up me-2"></i>
                                                {uploading ? 'Uploading...' : 'Upload Now'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* --- 3. DOCUMENT LIST & FILTER --- */}
                <div className="card border-0 shadow-sm rounded-4 mb-5 animate__animated animate__fadeInUp">
                    {/* Filter Toolbar */}
                    <div className="card-header bg-white p-3 border-bottom-0">
                        <div className="row g-2 align-items-center">
                            <div className="col-md-3">
                                <label className="form-label small text-muted mb-1">From date</label>
                                <input
                                    type="date"
                                    className="form-control bg-light border-0 rounded-pill"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    max={toDate || new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label small text-muted mb-1">To date</label>
                                <input
                                    type="date"
                                    className="form-control bg-light border-0 rounded-pill"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    min={fromDate || undefined}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label small text-muted mb-1">Sort</label>
                                <select
                                    className="form-select bg-light border-0 rounded-pill"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                </select>
                            </div>

                            <div className="col-md-3 d-flex align-items-end justify-content-end">
                                {(fromDate || toDate || sortBy !== 'newest') && (
                                    <button
                                        className="btn btn-link text-danger text-decoration-none small"
                                        onClick={() => {
                                            setFromDate('');
                                            setToDate('');
                                            setSortBy('newest');
                                        }}
                                    >
                                        <i className="bi bi-x-circle"></i> Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Document Grid */}
                    <div className="card-body bg-light rounded-bottom-4 p-4">
                        {loadingDocs ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary"></div>
                            </div>
                        ) : records.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <i className="bi bi-folder2-open fs-1 d-block mb-2 opacity-50"></i>
                                <p>No health records found.</p>
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {records.map((record) => {
                                    const isExpanded = expandedRecordId === record.healthRecordId;

                                    return (
                                        <div
                                            key={record.healthRecordId}
                                            className="card border-0 shadow-sm rounded-4"
                                        >
                                            <div className="card-body p-3">
                                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div
                                                            className="bg-primary bg-opacity-10 text-primary rounded-3 d-flex align-items-center justify-content-center"
                                                            style={{ width: 46, height: 46 }}
                                                        >
                                                            <i className="bi bi-folder2-open fs-4"></i>
                                                        </div>

                                                        <div>
                                                            <div className="fw-bold text-dark">
                                                                {formatRecordDate(record.recordDate)}
                                                            </div>

                                                            <div className="text-muted small">
                                                                Record #{record.healthRecordId}
                                                                {' '}—{' '}
                                                                {record.documents?.length || 0} document(s)
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-primary btn-sm rounded-pill px-3"
                                                        onClick={() => handleToggleRecord(record.healthRecordId)}
                                                    >
                                                        {isExpanded ? 'Hide Documents' : 'View Documents'}
                                                    </button>
                                                </div>

                                                {isExpanded && (
                                                    <div className="mt-3 pt-3 border-top">
                                                        <h6 className="fw-bold mb-3">
                                                            Included Documents
                                                        </h6>

                                                        {!record.documents || record.documents.length === 0 ? (
                                                            <p className="text-muted mb-0">
                                                                No documents in this record.
                                                            </p>
                                                        ) : (
                                                            <div className="d-flex flex-column gap-2">
                                                                {record.documents.map((doc) => (
                                                                    <div
                                                                        key={doc.documentId}
                                                                        className="border rounded-3 bg-light p-3 d-flex justify-content-between align-items-center flex-wrap gap-2"
                                                                    >
                                                                        <div className="d-flex align-items-start gap-3">
                                                                            <div className="text-primary fs-4">
                                                                                <i className="bi bi-file-earmark-medical"></i>
                                                                            </div>

                                                                             <div>
                                                                                 <div className="d-flex align-items-center gap-2 flex-wrap">
                                                                                     <span className="badge bg-info-subtle text-info-emphasis">
                                                                                         {doc.category || 'Other'}
                                                                                     </span>

                                                                                     <span className="fw-semibold text-dark">
                                                                                         {doc.documentName}
                                                                                     </span>
                                                                                 </div>

                                                                                 <div className="text-muted small mt-1">
                                                                                     <i className="bi bi-calendar3 me-1"></i>
                                                                                     Date Performed:{' '}
                                                                                     {doc.documentDate
                                                                                         ? formatRecordDate(doc.documentDate)
                                                                                         : 'Not provided'}
                                                                                 </div>

                                                                                  {(doc.testName || doc.testResults || doc.resultUnit || doc.referenceRange || doc.testStatus || doc.labFacilityName || doc.structuredResultsJson || doc.patientSummary) && (
                                                                                      <div className="health-record-result-meta">
                                                                                          {doc.testName && <span>{doc.testName}</span>}
                                                                                          {doc.testResults && <strong>{doc.testResults}{doc.resultUnit ? ` ${doc.resultUnit}` : ''}</strong>}
                                                                                          {doc.referenceRange && <span>Reference: {doc.referenceRange}</span>}
                                                                                          {doc.testStatus && <span>Status: {doc.testStatus}</span>}
                                                                                          {doc.labFacilityName && <span>Lab: {doc.labFacilityName}</span>}
                                                                                          {(() => { try { const r = JSON.parse(doc.structuredResultsJson); if (Array.isArray(r) && r.length) { return r.map((row, i) => <div key={i} style={{fontSize:'0.75rem',display:'flex',gap:'0.5rem',margin:'0.125rem 0'}}><span style={{fontWeight:500}}>{row.testName}</span><span style={{color:'#0f766e'}}>{row.resultValue}{row.unit ? ` ${row.unit}` : ''}</span></div>); } } catch {} return null; })()}
                                                                                          {doc.patientSummary && <div style={{marginTop:'0.25rem',fontSize:'0.75rem',color:'#475569',fontStyle:'italic',borderLeft:'2px solid #0d9488',paddingLeft:'0.5rem'}}>{doc.patientSummary}</div>}
                                                                                      </div>
                                                                                  )}
                                                                             </div>
                                                                         </div>

                                                                         {doc.fileLocation ? (
                                                                             <button
                                                                                 type="button"
                                                                                 className="btn btn-primary btn-sm rounded-pill px-3"
                                                                                 onClick={() => handleViewDocument(doc)}
                                                                             >
                                                                                 <i className="bi bi-eye me-1"></i>
                                                                                 View
                                                                             </button>
                                                                         ) : null}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {pagination.totalPages > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-4 flex-wrap gap-2">
                                <small className="text-muted">
                                    Showing page {pagination.page} of {pagination.totalPages}
                                    {' '}({pagination.totalItems} health records)
                                </small>

                                <nav aria-label="Health records pagination">
                                    <ul className="pagination pagination-sm mb-0">
                                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                            >
                                                Previous
                                            </button>
                                        </li>

                                        {getPageNumbers().map((page) => (
                                            typeof page === 'string' ? (
                                                <li key={page} className="page-item disabled">
                                                    <span className="page-link">...</span>
                                                </li>
                                            ) : (
                                                <li
                                                    key={page}
                                                    className={`page-item ${page === currentPage ? 'active' : ''}`}
                                                >
                                                    <button
                                                        className="page-link"
                                                        onClick={() => handlePageChange(page)}
                                                    >
                                                        {page}
                                                    </button>
                                                </li>
                                            )
                                        ))}

                                        <li className={`page-item ${currentPage === pagination.totalPages ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === pagination.totalPages}
                                            >
                                                Next
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- MODALS --- */}
                {/* Document Viewer Modal */}
                {selectedDocument && (
                    <DocumentViewerModal
                        show={showViewer}
                        onHide={handleCloseViewer}
                        document={selectedDocument}
                    />
                )}
            </div>
        </div>
    );
};

export default HealthRecords;