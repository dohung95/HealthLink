const SpecialtyStep = ({specialties, selectedSpecialty, onSelectSpecialty, onNext}) => {
    return ( 
        <div className="schedule-card">
      <h2>Choose specialty</h2>
      <p className="schedule-card-subtitle">
        Choose the specialty that best suits your needs.
      </p>

      <div className="specialty-grid">
        {specialties.map((specialty) => (
          <button
            key={specialty}
            type="button"
            className={`specialty-card ${
              selectedSpecialty === specialty ? 'selected' : ''
            }`}
            onClick={() => onSelectSpecialty(specialty)}
          >
            <i className="bi bi-hospital"></i>
            <span>{specialty}</span>
          </button>
        ))}
      </div>

      <div className="schedule-actions">
        <button
          type="button"
          className="btn-primary-soft"
          onClick={onNext}
          disabled={!selectedSpecialty}
        >
          Next
        </button>
      </div>
    </div>
     );
}
 
export default SpecialtyStep;