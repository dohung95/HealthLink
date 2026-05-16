const DoctorSummaryCard = ({ doctor }) => {
    if (!doctor) {
        return (
            <div className="doctor-summary-card empty">
                <i className="bi bi-person-badge"></i>
                <h3>Chưa chọn bác sĩ</h3>
                <p>Thông tin bác sĩ sẽ hiển thị tại đây sau khi bạn chọn.</p>
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