import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Button, ProgressBar } from 'react-bootstrap';
import { parseCV, isGeminiAvailable, getFileAcceptString } from '../../services/cvParserService';
import './Css/CVImportModal.css';

const CVImportModal = ({ show, onHide, onImport, type = 'doctor' }) => {
    const [file, setFile] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [error, setError] = useState('');
    const [parsedData, setParsedData] = useState(null);
    const [confidence, setConfidence] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [geminiAvailable, setGeminiAvailable] = useState(false);

    useEffect(() => {
        setGeminiAvailable(isGeminiAvailable());
    }, [show]);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileSelect = (selectedFile) => {
        setError('');
        setParsedData(null);
        setConfidence(null);

        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (!allowedTypes.includes(selectedFile.type)) {
            setError('Unsupported file type. Please upload PDF, DOCX, or image file.');
            return;
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
            setError('File size must be less than 10MB.');
            return;
        }

        setFile(selectedFile);
    };

    const handleFileInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleParse = async () => {
        if (!file) {
            setError('Please select a file first.');
            return;
        }

        if (!geminiAvailable) {
            setError('AI service is not configured.');
            return;
        }

        setParsing(true);
        setError('');

        const result = await parseCV(file, type);

        setParsing(false);

        if (result.success) {
            setParsedData(result.data);
            setConfidence(result.confidence);
        } else {
            setError(result.error);
        }
    };

    const handleConfirmImport = () => {
        if (parsedData) {
            const filteredData = {};
            Object.keys(parsedData).forEach(key => {
                if (parsedData[key] !== null && parsedData[key] !== undefined && parsedData[key] !== '') {
                    filteredData[key] = parsedData[key];
                }
            });
            onImport(filteredData);
            handleClose();
        }
    };

    const handleClose = () => {
        setFile(null);
        setParsedData(null);
        setConfidence(null);
        setError('');
        setParsing(false);
        onHide();
    };

    const getConfidenceColor = (score) => {
        if (score >= 0.8) return 'success';
        if (score >= 0.5) return 'warning';
        return 'danger';
    };

    const getConfidenceLabel = (score) => {
        if (score >= 0.8) return 'High';
        if (score >= 0.5) return 'Medium';
        if (score > 0) return 'Low';
        return 'N/A';
    };

    const renderFieldPreview = (label, value, fieldKey) => {
        const score = confidence?.[fieldKey] || 0;
        return (
            <div className="preview-field" key={fieldKey}>
                <div className="preview-field-header">
                    <span className="preview-field-label">{label}</span>
                    <span className={`confidence-badge ${getConfidenceColor(score)}`}>
                        {getConfidenceLabel(score)}
                    </span>
                </div>
                <div className="preview-field-value">
                    {value || <span className="empty-value">Not found</span>}
                </div>
            </div>
        );
    };

    const renderDoctorPreview = () => (
        <div className="parsed-data-preview">
            <h5><i className="bi bi-person"></i> Extracted Information</h5>
            <div className="preview-grid">
                {renderFieldPreview('Full Name', parsedData.fullName, 'fullName')}
                {renderFieldPreview('Email', parsedData.email, 'email')}
                {renderFieldPreview('Phone', parsedData.phoneNumber, 'phoneNumber')}
                {renderFieldPreview('Qualifications', parsedData.qualifications, 'qualifications')}
                {renderFieldPreview('Specialty', parsedData.specialty, 'specialty')}
                {renderFieldPreview('Experience (Years)', parsedData.yearsOfExperience, 'yearsOfExperience')}
                {renderFieldPreview('Languages', parsedData.languageSpoken, 'languageSpoken')}
                {renderFieldPreview('Clinic Name', parsedData.clinicName, 'clinicName')}
            </div>
            {parsedData.bio && (
                <div className="preview-bio">
                    <span className="preview-field-label">Bio</span>
                    <p>{parsedData.bio}</p>
                </div>
            )}
        </div>
    );

    const renderPharmacyPreview = () => (
        <div className="parsed-data-preview">
            <h5><i className="bi bi-building"></i> Extracted Information</h5>
            <div className="preview-grid">
                {renderFieldPreview('Pharmacy Name', parsedData.pharmacyName, 'pharmacyName')}
                {renderFieldPreview('Email', parsedData.email, 'email')}
                {renderFieldPreview('Phone', parsedData.phoneNumber, 'phoneNumber')}
                {renderFieldPreview('License Number', parsedData.licenseNumber, 'licenseNumber')}
                {renderFieldPreview('Address', parsedData.address, 'address')}
                {renderFieldPreview('City', parsedData.city, 'city')}
                {renderFieldPreview('District', parsedData.district, 'district')}
            </div>
            {parsedData.description && (
                <div className="preview-bio">
                    <span className="preview-field-label">Description</span>
                    <p>{parsedData.description}</p>
                </div>
            )}
        </div>
    );

    return (
        <Modal
            show={show}
            onHide={handleClose}
            size="lg"
            centered
            className={`cv-import-modal${type === 'pharmacy' ? ' cv-import-modal-pharmacy' : ''}`}
        >
            <Modal.Header closeButton className="cv-modal-header">
                <Modal.Title>
                    <i className="bi bi-file-text"></i>
                    Quick Fill with AI
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="cv-modal-body">
                {!geminiAvailable && (
                    <div className="cv-warning-message">
                        <i className="bi bi-exclamation-triangle"></i>
                        AI service is not available. Please contact administrator.
                    </div>
                )}

                {!parsedData && (
                    <>
                        <div
                            className={`drop-zone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            {file ? (
                                <div className="selected-file">
                                    <i className="bi bi-file-earmark-check"></i>
                                    <span>{file.name}</span>
                                    <button
                                        type="button"
                                        className="remove-file-btn"
                                        onClick={() => setFile(null)}
                                    >
                                        <i className="bi bi-x"></i>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <i className="bi bi-cloud-arrow-up"></i>
                                    <p>Drop your CV/Resume here</p>
                                    <span className="or-text">or</span>
                                    <label className="browse-btn">
                                        Browse Files
                                        <input
                                            type="file"
                                            accept={getFileAcceptString()}
                                            onChange={handleFileInputChange}
                                            hidden
                                            disabled={!geminiAvailable}
                                        />
                                    </label>
                                    <span className="supported-formats">
                                        PDF, DOCX, JPG, PNG (max 10MB)
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="parse-action">
                            <Button
                                onClick={handleParse}
                                disabled={!file || !geminiAvailable || parsing}
                                className="parse-btn"
                            >
                                {parsing ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm"></span>
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-stars"></i>
                                        Extract Information
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}

                {error && (
                    <div className="cv-error-message">
                        <i className="bi bi-exclamation-circle"></i>
                        {error}
                    </div>
                )}

                {parsedData && (
                    <>
                        <div className="overall-confidence">
                            <span>Confidence:</span>
                            <ProgressBar
                                now={(confidence?.overall || 0) * 100}
                                variant={getConfidenceColor(confidence?.overall || 0)}
                            />
                            <span>{Math.round((confidence?.overall || 0) * 100)}%</span>
                        </div>
                        {type === 'doctor' ? renderDoctorPreview() : renderPharmacyPreview()}
                        <div className="preview-notice">
                            <i className="bi bi-info-circle"></i>
                            You can edit any field after importing.
                        </div>
                    </>
                )}
            </Modal.Body>

            <Modal.Footer className="cv-modal-footer">
                <Button variant="secondary" onClick={handleClose}>
                    Cancel
                </Button>
                {parsedData && (
                    <Button onClick={handleConfirmImport} className="confirm-import-btn">
                        <i className="bi bi-check2"></i>
                        Apply to Form
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default CVImportModal;
