const formatUsd = (value) =>
  Number(value || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

const HomeVisitDoctorStep = ({
  doctors,
  selectedDoctorId,
  onSelectDoctor,
  onBack,
  onNext,
}) => {
  return (
    <div className="schedule-card home-visit-doctor-card">
      <h2>Choose a home visit doctor</h2>

      {doctors.length === 0 ? (
        <div className="empty-block">
          No doctor can serve this location. Please adjust the map pin.
        </div>
      ) : (
        <div className="home-visit-doctor-list">
          {doctors.map((doctor) => (
            <button
              key={doctor.doctorId}
              type="button"
              className={`home-visit-doctor-option ${selectedDoctorId === doctor.doctorId ? 'selected' : ''}`}
              onClick={() => onSelectDoctor(doctor)}
            >
              <div className="home-visit-doctor-main">
                <strong>{doctor.fullName}</strong>
                <span>{doctor.specialtyName}</span>
              </div>

              <div className="home-visit-doctor-meta">
                <span>{doctor.distanceKm} km</span>
                <span>{doctor.estimatedTravelMinutes} min</span>
              </div>

              <div className="home-visit-doctor-fees">
                <span>Doctor fee <b>{formatUsd(doctor.consultationFee)}</b></span>
                <span>Home visit <b>{formatUsd(doctor.homeVisitTotal)}</b></span>
                <span className="total">
                  Temporary total <b>{formatUsd(doctor.temporaryTotal)}</b>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="schedule-actions">
        <button type="button" className="btn-outline-soft" onClick={onBack}>Back</button>
        <button
          type="button"
          className="btn-primary-soft"
          disabled={!selectedDoctorId}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default HomeVisitDoctorStep;
