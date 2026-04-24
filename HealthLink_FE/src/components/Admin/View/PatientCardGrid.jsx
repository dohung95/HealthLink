import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

export default function PatientCardGrid({ patients, onViewPatient, formatDate }) {
    return (
        <div className="row g-3">
            {patients.map((patient) => (
                <div key={patient.patientID} className="col-12 col-md-6 col-lg-4">
                    <div
                        className="admin-card h-100"
                        style={{
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: '1px solid #e0f2fe',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf9 100%)'
                        }}
                        onClick={() => onViewPatient(patient)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 160, 139, 0.12)';
                            e.currentTarget.style.borderColor = '#00a08b';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = '#e0f2fe';
                        }}
                    >
                        <div className="card-body p-4">
                            {/* Header with Avatar */}
                            <div className="d-flex align-items-start gap-3 mb-3">
                                <div
                                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                    style={{
                                        width: '56px',
                                        height: '56px',
                                        background: 'linear-gradient(135deg, #00a08b 0%, #00c4ac 100%)',
                                        color: 'white',
                                        fontSize: '22px',
                                        fontWeight: '600',
                                        boxShadow: '0 4px 12px rgba(0, 160, 139, 0.2)'
                                    }}
                                >
                                    {patient.fullName.charAt(0)}
                                </div>
                                <div className="flex-grow-1">
                                    <h6 className="mb-1" style={{ fontWeight: '600', color: '#0f172a', fontSize: '15px' }}>
                                        {patient.fullName}
                                    </h6>
                                    <p className="mb-0" style={{ fontSize: '12px', color: '#64748b' }}>
                                        ID: {patient.patientID.substring(0, 12)}
                                    </p>
                                </div>
                            </div>

                            {/* Patient Info */}
                            <div className="mb-3" style={{ fontSize: '13px' }}>
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <i className="bi bi-envelope" style={{ color: '#00a08b', width: '16px' }}></i>
                                    <span style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {patient.email}
                                    </span>
                                </div>
                                <div className="d-flex gap-3">
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="bi bi-person" style={{ color: '#00a08b', width: '16px' }}></i>
                                        <span style={{ color: '#475569' }}>{patient.gender || 'N/A'}</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="bi bi-calendar3" style={{ color: '#00a08b', width: '16px' }}></i>
                                        <span style={{ color: '#475569' }}>{formatDate(patient.dateOfBirth)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Section */}
                            <div
                                className="row pt-3 text-center"
                                style={{ borderTop: '1px solid #e0f2fe', margin: '0' }}
                            >
                                <div className="col-4 border-end" style={{ borderColor: '#e0f2fe' }}>
                                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#00a08b' }}>
                                        {patient.totalRecords || 0}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Records
                                    </div>
                                </div>
                                <div className="col-4 border-end" style={{ borderColor: '#e0f2fe' }}>
                                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#00c4ac' }}>
                                        {patient.totalDocuments || 0}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Documents
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px', lineHeight: '1.2' }}>
                                        Last Updated
                                    </div>
                                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>
                                        {formatDate(patient.lastUpdated)}
                                    </div>
                                </div>
                            </div>

                            {/* View Button */}
                            <div className="mt-3">
                                <button
                                    className="btn btn-sm w-100"
                                    style={{
                                        background: 'linear-gradient(135deg, #00a08b 0%, #00c4ac 100%)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 16px',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.02)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 160, 139, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewPatient(patient);
                                    }}
                                >
                                    <i className="bi bi-eye me-2"></i>
                                    View Medical History
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
