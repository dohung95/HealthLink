const ConfirmStep = ({
    selectedDoctor,
    selectedSpecialty,
    selectedSlot,
    consultationType,
    homeVisitInfo,
    symptoms,
    files,
    onBack,
    onConfirm,
    confirming = false,
}) => {
    const formattedDateTime = selectedSlot?.appointmentTime
        ? new Date(selectedSlot.appointmentTime).toLocaleString('en-US')
        : '';


    const rows = [
        ['Doctor', selectedDoctor?.fullName || ''],
        ['Specialty', selectedSpecialty || selectedDoctor?.specialtyName || ''],
        ['Visit Type', consultationType === 'HomeVisit' ? 'Home Visit' : 'Online consultation'],
        ['Date & Time', formattedDateTime],
        ['Symptoms', symptoms || 'None'],
        ['Attached files', files.length > 0 ? `${files.length} file` : 'None'],
    ];

    if (consultationType === 'HomeVisit') {
        rows.push(
            ['Visit Address', homeVisitInfo?.visitAddress || ''],
            ['Contact Phone', homeVisitInfo?.contactPhone || ''],
            ['For', homeVisitInfo?.isForSelf ? 'Myself' : 'Someone else']
        );

        if (homeVisitInfo?.isForSelf === false) {
            rows.push(
                ['Receiver Name', homeVisitInfo?.receiverName || ''],
                ['Receiver Age', homeVisitInfo?.receiverAge || ''],
                ['Relationship', homeVisitInfo?.receiverRelationship || '']
            );
        }
    }
    return (
        <div className="schedule-card">
            <h2>Confirm Booking</h2>
            <p className="schedule-card-subtitle">
                Check the information carefully before confirming your appointment.
            </p>

            <div className="confirm-list">
                {rows.map(([label, value]) => (
                    <div key={label} className="confirm-row">
                        <span>{label}</span>
                        <strong>{value}</strong>
                    </div>
                ))}
            </div>

            <div className="schedule-actions">
                <button type="button" className="btn-outline-soft" onClick={onBack}>
                    ← Back
                </button>

                <button type="button" className="btn-primary-soft" onClick={onConfirm} disabled={confirming}>
                    {confirming ? 'Preparing payment...' : 'Confirm'}
                </button>
            </div>
        </div>
    );
}

export default ConfirmStep;
