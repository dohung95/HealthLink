const formatCurrency = (value) =>
    Number(value || 0).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
    });

const DoctorSelectionModeStep = ({
    mode,
    manualSelectionFee = 0,
    recommendedDoctor,
    loadingRecommendedDoctor = false,
    onSelectMode,
    onBack,
    onNext,
}) => {
    return (
        <div className="schedule-card">
            <h2>Choose Doctor Selection</h2>
            <p className="schedule-card-subtitle">
                Let the system assign a suitable doctor, or choose one manually with an extra fee.
            </p>

            <div className="visit-type-grid">
                <button
                    type="button"
                    className={`visit-type-card ${mode === 'AUTO_ASSIGNED' ? 'active' : ''}`}
                    onClick={() => onSelectMode('AUTO_ASSIGNED')}
                >
                    <i className="bi bi-stars"></i>
                    <strong>System chooses doctor</strong>
                    <span>
                        The fastest way to book. Instantly assigned to a qualified specialist on duty.
                    </span>

                    {recommendedDoctor && mode === 'AUTO_ASSIGNED' && (
                        <small>
                            Recommended: {recommendedDoctor.doctorName}
                        </small>
                    )}
                </button>

                <button
                    type="button"
                    className={`visit-type-card ${mode === 'MANUAL_SELECTED' ? 'active' : ''}`}
                    onClick={() => onSelectMode('MANUAL_SELECTED')}
                >
                    <i className="bi bi-person-check"></i>
                    <strong>I choose doctor myself</strong>
                    <span>
                        Browse and select a specific doctor.
                    </span>
                    <small>
                        Extra fee: {formatCurrency(manualSelectionFee)}
                    </small>
                </button>
            </div>

            <div className="schedule-actions">
                <button type="button" className="btn-outline-soft" onClick={onBack}>
                    Back
                </button>

                <button
                    type="button"
                    className="btn-primary-soft"
                    onClick={onNext}
                    disabled={!mode || loadingRecommendedDoctor}
                >
                    {loadingRecommendedDoctor ? 'Finding doctor...' : 'Next'}
                </button>
            </div>
        </div>
    );
};

export default DoctorSelectionModeStep;