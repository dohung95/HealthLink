import { useEffect, useState } from 'react';
import { appointmentService } from '../api/appointmentApi';
import { toast } from 'sonner';

const RescheduleAppointmentModal = ({
    isOpen,
    appointment,
    onClose,
    onRescheduled
}) => {
    const [homeVisitSlots, setHomeVisitSlots] = useState([]);
    const [onlineDates, setOnlineDates] = useState([]);

    const isHomeVisit =
        String(appointment?.consultationType || '')
            .toLowerCase()
            .replace(/[\s_-]/g, '') === 'homevisit';
    const [date, setDate] = useState('');
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const today = new Date().toISOString().split('T')[0];

    const maxDate = (() => {
        const max = new Date();
        max.setDate(max.getDate() + 30);
        return max.toISOString().split('T')[0];
    })();

    const [onlineDatePage, setOnlineDatePage] = useState(0);

    const ONLINE_DATES_PER_PAGE = 7;

    // Reset state khi mở modal
    useEffect(() => {
        if (!isOpen || !appointment) return;

        setDate('');
        setSlots([]);
        setHomeVisitSlots([]);
        setOnlineDates([]);
        setSelectedSlot(null);
    }, [isOpen, appointment]);

    // Home visit reschedule slots
    useEffect(() => {
        if (!isOpen || !appointment || !isHomeVisit) return;

        const loadHomeVisitSlots = async () => {
            setLoadingSlots(true);
            setSelectedSlot(null);

            try {
                const data =
                    await appointmentService.getHomeVisitRescheduleSlots(
                        appointment.appointmentId
                    );

                const nextSlots = Array.isArray(data) ? data : [];

                setHomeVisitSlots(nextSlots);
                setDate(nextSlots[0]?.bookingDate || '');
            } catch (error) {
                console.error(
                    'Failed to load HomeVisit reschedule slots:',
                    error
                );

                setHomeVisitSlots([]);
                setDate('');

                toast.error(
                    error.response?.data?.message ||
                    'Unable to load HomeVisit slots.'
                );
            } finally {
                setLoadingSlots(false);
            }
        };

        loadHomeVisitSlots();
    }, [isOpen, appointment?.appointmentId, isHomeVisit]);

    // Những ngày Online thực sự có slot trống
    useEffect(() => {
        if (
            !isOpen ||
            !appointment ||
            isHomeVisit
        ) {
            return;
        }

        const loadOnlineDates = async () => {
            setLoadingSlots(true);
            setSelectedSlot(null);

            try {
                const data =
                    await appointmentService
                        .getOnlineRescheduleDates(
                            appointment.appointmentId
                        );

                const nextDates =
                    Array.isArray(data) ? data : [];

                setOnlineDates(nextDates);
                setOnlineDatePage(0);
                setDate(nextDates[0] || '');
            } catch (error) {
                console.error(
                    'Failed to load Online reschedule dates:',
                    error
                );

                setOnlineDates([]);
                setDate('');

                toast.error(
                    error.response?.data?.message ||
                    'Unable to load Online reschedule dates.'
                );
            } finally {
                setLoadingSlots(false);
            }
        };

        loadOnlineDates();
    }, [
        isOpen,
        appointment?.appointmentId,
        isHomeVisit,
    ]);

    // Online reschedule slots
    useEffect(() => {
        if (!isOpen || !appointment || !date || isHomeVisit) {
            return;
        }

        const loadSlots = async () => {
            setLoadingSlots(true);

            try {
                const data = await appointmentService.getAvailableSlots(
                    appointment.doctorId,
                    date,
                    appointment.consultationType
                );

                setSlots(data.slots || []);
                setSelectedSlot(null);
            } catch (error) {
                console.error('Failed to load reschedule slots:', error);
                toast.error(
                    error.response?.data?.message || 'Unable to load available slots.'
                );
                setSlots([]);
            } finally {
                setLoadingSlots(false);
            }
        };

        loadSlots();
    }, [isOpen, appointment, date, isHomeVisit]);

    if (!isOpen || !appointment) return null;

    const handleSelectSlot = (slot) => {
        const sameSlot = isHomeVisit
            ? selectedSlot?.bookingDate ===
            slot.bookingDate &&
            selectedSlot?.startTime ===
            slot.startTime &&
            selectedSlot?.endTime ===
            slot.endTime
            : selectedSlot?.startTime ===
            slot.startTime;

        if (!isHomeVisit && !slot.selectable) {
            return;
        }

        if (sameSlot) {
            setSelectedSlot(null);
            return;
        }

        setSelectedSlot(slot);
    };

    const handleSubmit = async () => {
        if (!selectedSlot) {
            toast.warning('Please select a new time slot.');
            return;
        }

        const rawStartTime =
            String(selectedSlot.startTime || '');

        const normalizedStartTime =
            rawStartTime.length === 5
                ? `${rawStartTime}:00`
                : rawStartTime.split('.')[0];

        const newAppointmentTime =
            `${date}T${normalizedStartTime}`;

        setSubmitting(true);

        try {
            await appointmentService.rescheduleAppointment(
                appointment.appointmentId,
                {
                    newAppointmentTime
                }
            );

            toast.success('Appointment rescheduled successfully.');
            onRescheduled();
            onClose();
        } catch (error) {
            console.error('Failed to reschedule appointment:', error);
            toast.error(
                error.response?.data?.message || 'Unable to reschedule appointment.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const homeVisitDates = [
        ...new Set(
            homeVisitSlots.map(slot => slot.bookingDate)
        )
    ];

    // danh sách ngày và slot hiển thị homevisit
    const displayedSlots = isHomeVisit
        ? homeVisitSlots.filter(
            slot => slot.bookingDate === date
        )
        : slots;

    const onlineDatePageCount = Math.max(
        1,
        Math.ceil(
            onlineDates.length /
            ONLINE_DATES_PER_PAGE
        )
    );

    const onlinePageStart =
        onlineDatePage * ONLINE_DATES_PER_PAGE;

    const visibleOnlineDates = onlineDates.slice(
        onlinePageStart,
        onlinePageStart + ONLINE_DATES_PER_PAGE
    );

    const changeOnlineDatePage = (nextPage) => {
        const safePage = Math.max(
            0,
            Math.min(
                onlineDatePageCount - 1,
                nextPage
            )
        );

        const firstIndex =
            safePage * ONLINE_DATES_PER_PAGE;

        setOnlineDatePage(safePage);
        setDate(onlineDates[firstIndex] || '');
        setSelectedSlot(null);
    };

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content border-0 shadow">
                    <div className="modal-header">
                        <div>
                            <h5 className="modal-title mb-1">Reschedule Appointment</h5>
                            <small className="text-muted">
                                Dr. {appointment.doctorName} · {appointment.consultationType}
                            </small>
                        </div>

                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                            disabled={submitting}
                        ></button>
                    </div>

                    <div className="modal-body">
                        <div className="mb-4">
                            <label className="form-label fw-semibold">
                                Choose new date
                            </label>

                            {isHomeVisit ? (
                                homeVisitDates.length === 0 ? (
                                    <div className="alert alert-light border mb-0">
                                        No available HomeVisit dates.
                                    </div>
                                ) : (
                                    <div className="d-flex flex-wrap gap-2">
                                        {homeVisitDates.map((item) => {
                                            const selected = date === item;

                                            const dateLabel = new Date(
                                                `${item}T00:00:00`
                                            ).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                            });

                                            const slotCount = homeVisitSlots.filter(
                                                (slot) =>
                                                    slot.bookingDate === item
                                            ).length;

                                            return (
                                                <button
                                                    key={item}
                                                    type="button"
                                                    className={`btn ${selected
                                                        ? 'btn-primary'
                                                        : 'btn-outline-primary'
                                                        }`}
                                                    onClick={() => {
                                                        setDate(item);
                                                        setSelectedSlot(null);
                                                    }}
                                                    disabled={submitting}
                                                >
                                                    <div className="fw-semibold">
                                                        {dateLabel}
                                                    </div>

                                                    <small>
                                                        {slotCount}{' '}
                                                        {slotCount === 1
                                                            ? 'slot'
                                                            : 'slots'}
                                                    </small>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )
                            ) : onlineDates.length === 0 ? (
                                <div className="alert alert-light border mb-0">
                                    No available Online dates.
                                </div>
                            ) : (
                                <>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm"
                                            disabled={
                                                submitting ||
                                                onlineDatePage === 0
                                            }
                                            onClick={() =>
                                                changeOnlineDatePage(
                                                    onlineDatePage - 1
                                                )
                                            }
                                        >
                                            Previous
                                        </button>

                                        <span className="small text-muted">
                                            Page {onlineDatePage + 1}
                                            {' / '}
                                            {onlineDatePageCount}
                                        </span>

                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm"
                                            disabled={
                                                submitting ||
                                                onlineDatePage >=
                                                onlineDatePageCount - 1
                                            }
                                            onClick={() =>
                                                changeOnlineDatePage(
                                                    onlineDatePage + 1
                                                )
                                            }
                                        >
                                            Next
                                        </button>
                                    </div>

                                    <div className="d-flex flex-wrap gap-2">
                                        {visibleOnlineDates.map((item) => {
                                            const selected =
                                                date === item;

                                            const dateLabel = new Date(
                                                `${item}T00:00:00`
                                            ).toLocaleDateString(
                                                'en-US',
                                                {
                                                    weekday: 'short',
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                }
                                            );

                                            return (
                                                <button
                                                    key={item}
                                                    type="button"
                                                    className={`btn ${selected
                                                            ? 'btn-primary'
                                                            : 'btn-outline-primary'
                                                        }`}
                                                    disabled={submitting}
                                                    onClick={() => {
                                                        setDate(item);
                                                        setSelectedSlot(null);
                                                    }}
                                                >
                                                    {dateLabel}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        <div>
                            <label className="form-label fw-semibold">Available slots</label>

                            {loadingSlots ? (
                                <div className="py-4 text-center text-muted">
                                    <div className="spinner-border spinner-border-sm me-2"></div>
                                    Loading slots...
                                </div>
                            ) : displayedSlots.length === 0 ? (
                                <div className="alert alert-light border mb-0">
                                    No available slots for this date.
                                </div>
                            ) : (
                                <div className="d-flex flex-wrap gap-2">
                                    {displayedSlots.map((slot) => {
                                        const isSelected = isHomeVisit
                                            ? selectedSlot?.bookingDate ===
                                            slot.bookingDate &&
                                            selectedSlot?.startTime ===
                                            slot.startTime &&
                                            selectedSlot?.endTime ===
                                            slot.endTime
                                            : selectedSlot?.startTime ===
                                            slot.startTime;

                                        const slotDate =
                                            slot.bookingDate || date;

                                        const slotDateTime = new Date(
                                            `${slotDate}T${slot.startTime}`
                                        );

                                        const isPastSlot =
                                            slotDateTime < new Date();

                                        const selectable = isHomeVisit
                                            ? true
                                            : slot.selectable === true;

                                        const slotKey = isHomeVisit
                                            ? [
                                                slot.bookingDate,
                                                slot.scheduleId,
                                                slot.startTime,
                                                slot.endTime,
                                            ].join('-')
                                            : slot.startTime;

                                        return (
                                            <button
                                                key={slotKey}
                                                type="button"
                                                className={`btn ${isSelected
                                                    ? 'btn-primary'
                                                    : isPastSlot
                                                        ? 'btn-outline-secondary opacity-50'
                                                        : selectable
                                                            ? 'btn-outline-primary'
                                                            : 'btn-outline-secondary'
                                                    }`}
                                                disabled={
                                                    submitting ||
                                                    isPastSlot ||
                                                    !selectable
                                                }
                                                onClick={() => {
                                                    if (
                                                        isPastSlot ||
                                                        !selectable
                                                    ) {
                                                        return;
                                                    }

                                                    handleSelectSlot(slot);
                                                }}
                                            >
                                                <div className="fw-semibold">
                                                    {isHomeVisit
                                                        ? `${slot.startTime} - ${slot.endTime}`
                                                        : slot.startTime}
                                                </div>

                                                {isHomeVisit &&
                                                    slot.totalBlockMinutes > 0 && (
                                                        <small className="d-block">
                                                            {slot.totalBlockMinutes}{' '}
                                                            min total
                                                        </small>
                                                    )}

                                                {!isHomeVisit &&
                                                    !isPastSlot &&
                                                    !slot.selectable && (
                                                        <small className="d-block">
                                                            {slot.status}
                                                        </small>
                                                    )}

                                                {isPastSlot && (
                                                    <small className="d-block">
                                                        Past
                                                    </small>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSubmit}
                            disabled={!selectedSlot || submitting}
                        >
                            {submitting ? 'Saving...' : 'Confirm Reschedule'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RescheduleAppointmentModal;