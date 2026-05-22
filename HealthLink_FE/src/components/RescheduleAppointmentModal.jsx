import { useEffect, useState } from 'react';
import { appointmentService } from '../api/appointmentApi';
import { toast } from 'sonner';

const RescheduleAppointmentModal = ({
    isOpen,
    appointment,
    onClose,
    onRescheduled
}) => {
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

    useEffect(() => {
        if (!isOpen || !appointment) return;

        const currentDate = appointment.appointmentTime?.split('T')[0] || today;

        setDate(currentDate);
        setSlots([]);
        setSelectedSlot(null);
    }, [isOpen, appointment]);

    useEffect(() => {
        if (!isOpen || !appointment || !date) return;

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
    }, [isOpen, appointment, date]);

    if (!isOpen || !appointment) return null;

    const handleSelectSlot = (slot) => {
        if (!slot.selectable) return;

        // click lại slot đang chọn => hủy chọn
        if (selectedSlot?.startTime === slot.startTime) {
            setSelectedSlot(null);
            return;
        }

        // chỉ cho phép 1 slot
        setSelectedSlot(slot);
    };

    const handleSubmit = async () => {
        if (!selectedSlot) {
            toast.warning('Please select a new time slot.');
            return;
        }

        const newAppointmentTime = `${date}T${selectedSlot.startTime}:00`;

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
                            <label className="form-label fw-semibold">Choose new date</label>
                            <input
                                type="date"
                                className="form-control"
                                value={date}
                                min={today}
                                max={maxDate}
                                onChange={(e) => setDate(e.target.value)}
                            />
                            <small className="text-muted">
                                You can reschedule within the next 30 days.
                            </small>
                        </div>

                        <div>
                            <label className="form-label fw-semibold">Available slots</label>

                            {loadingSlots ? (
                                <div className="py-4 text-center text-muted">
                                    <div className="spinner-border spinner-border-sm me-2"></div>
                                    Loading slots...
                                </div>
                            ) : slots.length === 0 ? (
                                <div className="alert alert-light border mb-0">
                                    No available slots for this date.
                                </div>
                            ) : (
                                <div className="d-flex flex-wrap gap-2">
                                    {slots.map((slot) => {
                                        const isSelected =
                                            selectedSlot?.startTime === slot.startTime;

                                        const slotDateTime = new Date(`${date}T${slot.startTime}`);
                                        const isPastSlot = slotDateTime < new Date();

                                        const statusClass = slot.status?.toLowerCase();

                                        return (
                                            <button
                                                key={slot.startTime}
                                                type="button"
                                                className={`btn ${isSelected
                                                    ? 'btn-primary'
                                                    : isPastSlot
                                                        ? 'btn-outline-secondary opacity-50'
                                                        : slot.selectable
                                                            ? 'btn-outline-primary'
                                                            : 'btn-outline-secondary'
                                                    }`}
                                                disabled={isPastSlot || !slot.selectable}
                                                onClick={() => {
                                                    if (isPastSlot) return;
                                                    handleSelectSlot(slot);
                                                }}
                                            >
                                                {slot.startTime}
                                                {isPastSlot && ' (Past)'}
                                                {!isPastSlot && !slot.selectable && ` (${slot.status})`}
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