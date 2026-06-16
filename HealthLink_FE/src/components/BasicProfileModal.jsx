import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorService } from '../api/doctorApi';

const BasicProfileModal = ({ show, onClose, userId, role }) => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Lọc lại role dựa trên chuỗi truyền vào để an toàn (có thể là tiếng Việt/Anh)
    const normalizedRole = role ? role.toLowerCase().trim() : '';
    const isDoctor = normalizedRole && !normalizedRole.includes('bệnh nhân') && !normalizedRole.includes('patient');

    useEffect(() => {
        if (!show || !userId) return;

        let isMounted = true;
        setLoading(true);
        setError(null);

        const fetchProfile = async () => {
            try {
                let data = null;
                if (isDoctor) {
                    data = await doctorService.getDoctorById(userId);
                } else {
                    data = await doctorService.getPatientById(userId);
                }

                if (isMounted) {
                    setProfile(data);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
                if (isMounted) {
                    setError("Failed to load profile data.");
                    setLoading(false);
                }
            }
        };

        fetchProfile();

        return () => {
            isMounted = false;
        };
    }, [show, userId, isDoctor]);

    if (!show) return null;

    const renderMetricCard = (icon, label, value, unit = "") => (
        <div className="col text-center p-2 rounded shadow-sm border bg-light m-1">
            <i className={`bi ${icon} fs-4 text-primary`}></i>
            <div className="small text-muted mt-1" style={{ fontSize: '0.75rem' }}>{label}</div>
            <div className="fw-bold d-flex align-items-baseline justify-content-center">
                <span>{value}</span>
                {unit && <span className="ms-1" style={{ fontSize: '0.7rem' }}>{unit}</span>}
            </div>
        </div>
    );

    const renderDossierItem = (icon, title, value, iconColorClass = "text-primary", bgClass = "bg-primary-subtle") => (
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
            <div className="d-flex align-items-center">
                <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${bgClass}`} style={{ width: 40, height: 40 }}>
                    <i className={`bi ${icon} ${iconColorClass}`}></i>
                </div>
                <span className="fw-medium">{title}</span>
            </div>
            <div className="text-end">
                <span className="badge bg-light text-dark border px-2 py-1" style={{ whiteSpace: 'normal', textAlign: 'right', maxWidth: '150px' }}>
                    {value || "None"}
                </span>
            </div>
        </div>
    );

    const renderDoctorProfile = () => {
        if (!profile) return null;
        const avatarUrl = profile.avatarUrl || profile.avatarURL || `https://api.dicebear.com/9.x/initials/svg?seed=${profile.fullName}`;

        return (
            <div className="modal-body p-0">
                <div className="text-center p-4 bg-light border-bottom">
                    <img src={avatarUrl}
                        alt="Avatar"
                        className="rounded-circle shadow-sm mb-3 border border-3 border-white"
                        style={{ width: 100, height: 100, objectFit: 'cover' }}
                        onError={(e) => { e.target.onerror = null; e.target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${profile.fullName}`; }}
                    />
                    <h4 className="fw-bold mb-1">{profile.fullName}</h4>
                    <p className="text-primary fw-medium mb-1">{profile.specialty || "General"}</p>
                    {profile.qualifications && <small className="text-muted d-block">{profile.qualifications}</small>}

                    {profile.averageRating !== undefined && profile.averageRating !== null && (
                        <div className="d-flex align-items-center justify-content-center mt-2">
                            <i className="bi bi-star-fill text-warning me-1"></i>
                            <span className="fw-bold me-2">{Number(profile.averageRating).toFixed(1)}</span>
                            {profile.totalReviews && <span className="text-muted small">({profile.totalReviews} reviews)</span>}
                        </div>
                    )}
                </div>

                <div className="p-3">
                    <div className="row g-0 mb-3">
                        {renderMetricCard('bi-briefcase', 'Experience', profile.yearsOfExperience ? `${profile.yearsOfExperience}+` : 'N/A', 'Yrs')}
                        {renderMetricCard('bi-translate', 'Languages', profile.languageSpoken || 'N/A')}
                        {renderMetricCard('bi-geo-alt', 'Location', profile.location || 'N/A')}
                    </div>

                    {profile.bio && (
                        <div className="mb-3 p-3 bg-light rounded border">
                            <h6 className="d-flex align-items-center fw-bold"><i className="bi bi-person-lines-fill text-primary me-2"></i>About</h6>
                            <p className="small text-muted mb-0" style={{ whiteSpace: 'pre-line' }}>{profile.bio}</p>
                        </div>
                    )}

                    {(profile.clinicName || profile.clinicAddress) && (
                        <div className="p-3 bg-light rounded border">
                            <h6 className="d-flex align-items-center fw-bold"><i className="bi bi-hospital text-primary me-2"></i>Clinic Information</h6>
                            {profile.clinicName && <div className="fw-medium small">{profile.clinicName}</div>}
                            {profile.clinicAddress && <div className="text-muted small mt-1">{profile.clinicAddress}</div>}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderPatientProfile = () => {
        if (!profile) return null;
        const avatarUrl = profile.avatarUrl || profile.avatarURL || `https://api.dicebear.com/9.x/initials/svg?seed=${profile.fullName}`;

        let dobStr = 'Not provided';
        if (profile.dateOfBirth) {
            const date = new Date(profile.dateOfBirth);
            dobStr = date.toLocaleDateString();
        }

        return (
            <div className="modal-body p-0">
                <div className="p-4 bg-light border-bottom d-flex align-items-center">
                    <img src={avatarUrl}
                        alt="Avatar"
                        className="rounded-circle shadow-sm me-3 border border-2 border-white"
                        style={{ width: 64, height: 64, objectFit: 'cover' }}
                        onError={(e) => { e.target.onerror = null; e.target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${profile.fullName}`; }}
                    />
                    <div>
                        <h5 className="fw-bold mb-1">{profile.fullName}</h5>
                        <small className="text-muted d-block" style={{ letterSpacing: '1px' }}>ID: #{profile.userId?.substring(0, 8).toUpperCase()}</small>
                    </div>
                </div>

                <div className="p-3">
                    <div className="row px-2 mb-3">
                        <div className="col-6 mb-2">
                            <small className="text-muted">Date of Birth</small>
                            <div className="fw-medium">{dobStr}</div>
                        </div>
                        <div className="col-6 mb-2">
                            <small className="text-muted">Gender</small>
                            <div className="fw-medium">{profile.gender || 'Not provided'}</div>
                        </div>
                        <div className="col-6 mb-2">
                            <small className="text-muted">Occupation</small>
                            <div className="fw-medium text-truncate">{profile.occupation || 'Not provided'}</div>
                        </div>
                        <div className="col-6 mb-2">
                            <small className="text-muted">Location</small>
                            <div className="fw-medium text-truncate">{[profile.city, profile.country].filter(Boolean).join(', ') || 'Not provided'}</div>
                        </div>
                    </div>

                    <div className="row g-0 mb-3">
                        {renderMetricCard('bi-droplet', 'Blood Type', profile.bloodType || '--')}
                        {renderMetricCard('bi-rulers', 'Height', profile.heightCm ? Number(profile.heightCm).toFixed(1) : '--', 'cm')}
                        {renderMetricCard('bi-speedometer2', 'Weight', profile.weightKg ? Number(profile.weightKg).toFixed(1) : '--', 'kg')}
                    </div>

                    <div className="mb-3 p-3 bg-light rounded border">
                        <h6 className="d-flex align-items-center fw-bold"><i className="bi bi-clock-history text-muted me-2"></i>History Summary</h6>
                        <p className="small text-muted mb-0">{profile.medicalHistorySummary || 'No medical history summary provided.'}</p>
                    </div>

                    <div className="border rounded overflow-hidden">
                        <div className="bg-light p-2 border-bottom fw-bold text-center">Medical Dossier</div>
                        {renderDossierItem('bi-heart-pulse', 'Chronic Conditions', profile.chronicConditions, 'text-primary', 'bg-primary-subtle')}
                        {renderDossierItem('bi-virus', 'Allergies', profile.allergies, profile.allergies ? 'text-danger' : 'text-secondary', profile.allergies ? 'bg-danger-subtle' : 'bg-secondary-subtle')}
                        {renderDossierItem('bi-capsule', 'Medications', profile.currentMedications, 'text-primary', 'bg-primary-subtle')}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
            <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
                <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden">
                        <div className="modal-header text-white border-bottom-0 position-relative d-flex align-items-center justify-content-center py-3" style={{ backgroundColor: '#00b09a' }}>
                            <h5 className="modal-title fw-bold mb-0">{isDoctor ? 'Doctor Profile' : 'Patient Information'}</h5>
                            <button type="button" className="btn-close btn-close-white position-absolute end-0 me-3" onClick={onClose}></button>
                        </div>

                        {loading ? (
                            <div className="modal-body text-center p-5">
                                <div className="spinner-border text-primary mb-3" role="status"></div>
                                <p className="text-muted">Loading profile...</p>
                            </div>
                        ) : error ? (
                            <div className="modal-body text-center p-5">
                                <i className="bi bi-exclamation-circle text-danger fs-1 mb-3 d-block"></i>
                                <p className="text-danger">{error}</p>
                                <button className="btn btn-outline-primary mt-2" onClick={onClose}>Close</button>
                            </div>
                        ) : (
                            <>
                                {isDoctor ? renderDoctorProfile() : renderPatientProfile()}

                                {isDoctor && (
                                    <div className="modal-footer bg-light border-top-0 pt-3 pb-3">
                                        <button
                                            className="btn btn-primary w-100 rounded-pill d-flex align-items-center justify-content-center"
                                            onClick={() => {
                                                onClose();
                                                navigate(`/patient-dashboard/book/${userId}`);
                                            }}
                                        >
                                            <i className="bi bi-calendar-check me-2"></i> Book Appointment
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default BasicProfileModal;
