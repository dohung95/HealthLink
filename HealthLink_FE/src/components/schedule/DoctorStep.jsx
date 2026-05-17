const DoctorStep = ({ doctors, selectedDoctorId, onSelectDoctor, onBack, onNext }) => {
    return (
        <div className="schedule-card">
            <h2>Choose a doctor</h2>
            <p className="schedule-card-subtitle">
                Select a doctor from the list below.
            </p>

            {doctors.length === 0 ? (
                <div className="empty-block">
                    No doctor found matching the selected specialty.
                </div>
            ) : (
                <div className="doctor-select-list">
                    {doctors.map((doctor) => (
                        <button
                            key={doctor.doctorId}
                            type="button"
                            className={`doctor-select-card ${selectedDoctorId === doctor.doctorId ? 'selected' : ''
                                }`}
                            onClick={() => onSelectDoctor(doctor.doctorId)}
                        >
                            <div className="doctor-avatar">
                                {(doctor.fullName || 'BS')
                                    .split(' ')
                                    .map((word) => word[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()}
                            </div>

                            <div className="doctor-select-info">
                                <h3>{doctor.fullName}</h3>
                                <p>{doctor.specialtyName}</p>
                                {doctor.languageSpoken && (
                                    <small>{doctor.languageSpoken}</small>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <div className="schedule-actions">
                <button type="button" className="btn-outline-soft" onClick={onBack}>
                    Back
                </button>

                <button
                    type="button"
                    className="btn-primary-soft"
                    onClick={onNext}
                    disabled={!selectedDoctorId}
                >
                    Next
                </button>
            </div>
        </div>
    );
}

export default DoctorStep;