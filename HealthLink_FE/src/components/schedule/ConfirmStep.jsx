import { useState } from 'react';

const formatCurrency = (value) =>
    Number(value || 0).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
    });

const stripHtml = (html) => {
    if (!html) return '';

    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
};

const ConfirmStep = ({
    selectedDoctor,
    selectedSpecialty,
    selectedSlot,
    consultationType,
    homeVisitInfo,
    symptoms,
    files,
    selectedHomeVisitServices = [],
    homeVisitEstimate,
    doctorSelectionMode = 'AUTO_ASSIGNED',
    manualSelectionFee = 0,
    recommendedDoctor,
    wantsManualDoctor = false,
    onToggleManualDoctor,
    onBack,
    onConfirm,
    confirming = false,
}) => {
    const [showServiceDetails, setShowServiceDetails] = useState(false);

    const buildHomeVisitDateTime = (session) => {
        if (!session?.bookingDate || !session?.startTime) return '';

        const start = session.startTime?.slice(0, 5);
        const end = session.endTime?.slice(0, 5);

        const dateTime = new Date(`${session.bookingDate}T${start}:00`);
        const dateLabel = Number.isNaN(dateTime.getTime())
            ? session.bookingDate
            : dateTime.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });

        return end ? `${dateLabel}, ${start} - ${end}` : `${dateLabel}, ${start}`;
    };

    const formattedDateTime =
        consultationType === 'HomeVisit'
            ? buildHomeVisitDateTime(homeVisitInfo?.selectedSession)
            : selectedSlot?.appointmentTime
                ? new Date(selectedSlot.appointmentTime).toLocaleString('en-US')
                : '';

    const rows = [
        ['Doctor', selectedDoctor?.fullName || ''],
        ['Specialty', selectedSpecialty || selectedDoctor?.specialtyName || ''],
        ['Visit Type', consultationType === 'HomeVisit' ? 'Home Visit' : 'Online consultation'],
        ['Date & Time', formattedDateTime],
    ];

    rows.push(
        ['Symptoms', stripHtml(symptoms) || 'None'],
        ['Attached files', files.length > 0 ? `${files.length} file` : 'None'],
    );

    if (consultationType !== 'HomeVisit') {
        const onlineDoctorFee = Number(selectedDoctor?.consultationFee || 0);
        const manualFee = doctorSelectionMode === 'MANUAL_SELECTED'
            ? Number(manualSelectionFee || 0)
            : 0;

        rows.push(
            ['Doctor selection', doctorSelectionMode === 'MANUAL_SELECTED'
                ? 'Manual selected'
                : 'System recommended'],
            ['Consultation fee', formatCurrency(onlineDoctorFee)]
        );

        if (manualFee > 0) {
            rows.push(['Manual selection fee', formatCurrency(manualFee)]);
        }

        rows.push(['Total', formatCurrency(onlineDoctorFee + manualFee)]);
    }

    const doctorFee = consultationType === 'HomeVisit'
        ? Number(selectedDoctor?.homeVisitConsultationFee ?? selectedDoctor?.consultationFee ?? 0)
        : Number(selectedDoctor?.consultationFee || 0);
    const homeVisitBaseFee = Number(homeVisitEstimate?.homeVisitFee || 0);
    const travelFee = Number(homeVisitEstimate?.travelFee || 0);
    const homeVisitTotal = Number(homeVisitEstimate?.homeVisitTotal || 0);

    const servicesTotal = selectedHomeVisitServices.reduce(
        (sum, item) => sum + Number(item.price || 0),
        0
    );

    const grandTotal =
        consultationType === 'HomeVisit'
            ? doctorFee + homeVisitTotal + servicesTotal
            : doctorFee;

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

        rows.push(
            ['Doctor consultation fee', formatCurrency(doctorFee)],
            ['Base home visit fee', formatCurrency(homeVisitBaseFee)],
            ['Additional distance fee', formatCurrency(travelFee)],
            ['Home visit travel total', formatCurrency(homeVisitTotal)],
            ['Services total', formatCurrency(servicesTotal)],
            ['Total', formatCurrency(grandTotal)]
        );
    }
    return (
        <div className="schedule-card">
            <h2>Confirm Booking</h2>
            <p className="schedule-card-subtitle">
                Check the information carefully before confirming your appointment.
            </p>

            {consultationType !== 'HomeVisit' && recommendedDoctor && (
                <div className="recommended-doctor-box">
                    <strong>
                        {doctorSelectionMode === 'MANUAL_SELECTED'
                            ? 'Manual selected doctor'
                            : 'System recommended doctor'}
                    </strong>
                    <p>Dr. {selectedDoctor?.fullName || recommendedDoctor.doctorName}</p>
                </div>
            )}

            <div className="confirm-list">
                {rows.map(([label, value]) => (
                    <div key={label} className="confirm-row">
                        <span>{label}</span>

                        {label === 'Services total' && selectedHomeVisitServices.length > 0 ? (
                            <div className="confirm-service-total-value">
                                <strong>{value}</strong>
                                <button
                                    type="button"
                                    onClick={() => setShowServiceDetails(true)}
                                >
                                    View details
                                </button>
                            </div>
                        ) : (
                            <strong>{value}</strong>
                        )}
                    </div>
                ))}
            </div>

            {showServiceDetails && (
                <div className="confirm-modal-backdrop" role="dialog" aria-modal="true">
                    <div className="confirm-service-modal">
                        <div className="confirm-service-modal-header">
                            <div>
                                <span>Selected services</span>
                                <strong>{formatCurrency(servicesTotal)}</strong>
                            </div>

                            <button
                                type="button"
                                aria-label="Close service details"
                                onClick={() => setShowServiceDetails(false)}
                            >
                                ×
                            </button>
                        </div>

                        <ul className="confirm-service-modal-list">
                            {selectedHomeVisitServices.map((item) => (
                                <li key={item.serviceId}>
                                    <span>{item.serviceName}</span>
                                    <strong>{formatCurrency(item.price)}</strong>
                                </li>
                            ))}
                        </ul>

                        <button
                            type="button"
                            className="btn-primary-soft confirm-service-modal-action"
                            onClick={() => setShowServiceDetails(false)}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

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
