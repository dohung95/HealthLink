const DoctorSummaryCard = ({ doctor }) => {
    if (!doctor) {
        return (
            <div className="doctor-summary-card empty">
                <i className="bi bi-person-badge"></i>
                <h3>No doctor selected</h3>
                <p>Doctor's information will be displayed here after you select.</p>
            </div>
        );
    }

    const initials = (doctor.fullName || 'BS')
        .split(' ')
        .map((word) => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    return (
        <div className="doctor-summary-card">
            <div className="doctor-summary-header">
                <div className="doctor-summary-avatar">{initials}</div>

                <div>
                    <h3>{doctor.fullName}</h3>
                    <p>{doctor.specialtyName}</p>
                </div>
            </div>

            <div className="doctor-summary-list">
                {doctor.languageSpoken && (
                    <div>
                        <span>Languages spoken</span>
                        <strong>{doctor.languageSpoken}</strong>
                    </div>
                )}

                {doctor.location && (
                    <div>
                        <span>Location</span>
                        <strong>{doctor.location}</strong>
                    </div>
                )}

                {doctor.clinicName && (
                    <div>
                        <span>Clinic</span>
                        <strong>{doctor.clinicName}</strong>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DoctorSummaryCard;