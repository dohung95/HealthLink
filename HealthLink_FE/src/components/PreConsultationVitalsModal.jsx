import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { vitalSignApi } from '../api/vitalSignApi';
import RichTextEditor from '../utils/ckeditor/RichTextEditor';

const initialForm = {
    heartRate: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    temperature: '',
    oxygenSaturation: '',
    respiratoryRate: '',
    source: 'HomeDevice',
    deviceName: '',
    notes: '',
};

const toNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    return Number(value);
};

const PreConsultationVitalsModal = ({
    isOpen,
    appointment,
    patientId,
    onClose,
    onSaved,
}) => {
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);
    const [showPulseGuide, setShowPulseGuide] = useState(false);
    const [showBloodPressureGuide, setShowBloodPressureGuide] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setForm(initialForm);
        setShowPulseGuide(false);
        setShowBloodPressureGuide(false);
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (field, value) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const validateForm = () => {
        const heartRate = Number(form.heartRate);

        if (!heartRate) {
            toast.warning('Heart rate / pulse is required.');
            return false;
        }

        if (heartRate < 30 || heartRate > 220) {
            toast.warning('Heart rate must be between 30 and 220 bpm.');
            return false;
        }

        const sys = form.bloodPressureSystolic
            ? Number(form.bloodPressureSystolic)
            : null;

        const dia = form.bloodPressureDiastolic
            ? Number(form.bloodPressureDiastolic)
            : null;

        if ((sys && !dia) || (!sys && dia)) {
            toast.warning('Please enter both systolic and diastolic blood pressure.');
            return false;
        }

        if (sys && (sys < 70 || sys > 250)) {
            toast.warning('Systolic blood pressure must be between 70 and 250 mmHg.');
            return false;
        }

        if (dia && (dia < 40 || dia > 150)) {
            toast.warning('Diastolic blood pressure must be between 40 and 150 mmHg.');
            return false;
        }

        if (sys && dia && dia >= sys) {
            toast.warning('Diastolic pressure must be lower than systolic pressure.');
            return false;
        }

        const temperature = form.temperature ? Number(form.temperature) : null;

        if (temperature && (temperature < 30 || temperature > 45)) {
            toast.warning('Temperature must be between 30 and 45°C.');
            return false;
        }

        const spo2 = form.oxygenSaturation
            ? Number(form.oxygenSaturation)
            : null;

        if (spo2 && (spo2 < 50 || spo2 > 100)) {
            toast.warning('SpO2 must be between 50 and 100%.');
            return false;
        }

        const respiratoryRate = form.respiratoryRate
            ? Number(form.respiratoryRate)
            : null;

        if (respiratoryRate && (respiratoryRate < 5 || respiratoryRate > 60)) {
            toast.warning('Respiratory rate must be between 5 and 60 breaths/min.');
            return false;
        }

        return true;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!validateForm()) return;

        try {
            setSaving(true);

            const payload = {
                patientId,
                appointmentId: appointment?.appointmentId,
                heartRate: toNumberOrNull(form.heartRate),
                bloodPressureSystolic: toNumberOrNull(form.bloodPressureSystolic),
                bloodPressureDiastolic: toNumberOrNull(form.bloodPressureDiastolic),
                temperature: toNumberOrNull(form.temperature),
                oxygenSaturation: toNumberOrNull(form.oxygenSaturation),
                respiratoryRate: toNumberOrNull(form.respiratoryRate),
                source: form.source || 'Manual',
                deviceName: form.source === 'Manual' ? null : form.deviceName || null,
                notes: form.notes || null,
            };

            await vitalSignApi.createVitalSign(payload);

            toast.success('Pre-consultation vitals saved.');
            onSaved?.();
        } catch (error) {
            console.error('Failed to save vital signs:', error);

            toast.error(
                error.response?.data?.message ||
                error.response?.data ||
                error.message ||
                'Could not save vital signs.'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="vitals-popup-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vitals-popup-title"
        >
            <style>{`
    .vitals-popup-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(15, 23, 42, 0.58);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
    }

    .vitals-popup-card {
        width: min(920px, 100%);
        max-height: calc(100vh - 48px);
        overflow-y: auto;
        background: #ffffff;
        border-radius: 24px;
        box-shadow: 0 24px 80px rgba(15, 23, 42, 0.35);
        animation: vitalsPopupIn 0.18s ease-out;
    }

    @keyframes vitalsPopupIn {
        from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .vitals-popup-card .modal-header {
        position: sticky;
        top: 0;
        z-index: 2;
        background: #ffffff;
        border-bottom: 1px solid #e5e7eb;
        border-top-left-radius: 24px;
        border-top-right-radius: 24px;
    }

    .vitals-popup-card .modal-footer {
        position: sticky;
        bottom: 0;
        z-index: 2;
        background: #ffffff;
        border-top: 1px solid #e5e7eb;
        border-bottom-left-radius: 24px;
        border-bottom-right-radius: 24px;
    }
`}</style>
            <div className="vitals-popup-card">
                <div className="modal-header">
                    <div>
                        <h5 id="vitals-popup-title" className="modal-title fw-bold">
                            Pre-consultation vitals
                        </h5>
                        <p className="text-muted small mb-0">
                            Please enter your latest readings before starting the consultation.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn-close"
                        onClick={onClose}
                        disabled={saving}
                    />
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="alert alert-info small">
                            <div className="fw-semibold mb-1">
                                Instructions before starting the consultation
                            </div>

                            <ul className="mb-0 ps-3">
                                <li>
                                    If you have a home blood pressure monitor, please enter the readings shown on the device:
                                    <strong> SYS</strong>, <strong>DIA</strong> and <strong>Pulse</strong>.
                                </li>
                                <li>
                                    If you do not have a monitor, you can still measure your pulse manually: sit still, count your pulse
                                    for 30 seconds, then multiply by two to get beats/minute.
                                </li>
                                <li>
                                    SpO2 and temperature are optional, only enter if you have a suitable measuring device.
                                </li>
                            </ul>

                            <div className="mt-2 text-muted">
                                These readings are for the doctor's reference before the consultation, not a diagnosis.
                            </div>
                        </div>

                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label fw-semibold">
                                    Measurement method <span className="text-danger">*</span>
                                </label>

                                <div className="d-flex flex-column gap-2">
                                    <label className="border rounded-3 p-3 cursor-pointer bg-light">
                                        <div className="d-flex align-items-start gap-2">
                                            <input
                                                type="radio"
                                                name="measurementSource"
                                                value="HomeDevice"
                                                checked={form.source === 'HomeDevice'}
                                                onChange={(e) => handleChange('source', e.target.value)}
                                                className="mt-1"
                                            />

                                            <div>
                                                <div className="fw-semibold">
                                                    Measured by home device
                                                </div>
                                                <div className="text-muted small">
                                                    Example: blood pressure monitor, SpO2 monitor, thermometer, smartwatch/smartband.
                                                </div>
                                            </div>
                                        </div>
                                    </label>

                                    <label className="border rounded-3 p-3 cursor-pointer bg-light">
                                        <div className="d-flex align-items-start gap-2">
                                            <input
                                                type="radio"
                                                name="measurementSource"
                                                value="Manual"
                                                checked={form.source === 'Manual'}
                                                onChange={(e) => handleChange('source', e.target.value)}
                                                className="mt-1"
                                            />

                                            <div>
                                                <div className="fw-semibold">
                                                    Measured manually
                                                </div>
                                                <div className="text-muted small">
                                                    Use when you do not have a monitor. You can manually count your pulse for 30 seconds and then multiply by two.
                                                </div>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-semibold">
                                    Device name, if any
                                </label>

                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder={
                                        form.source === 'HomeDevice'
                                            ? 'Example: Omron blood pressure monitor, pulse oximeter...'
                                            : 'Leave empty if measured manually'
                                    }
                                    value={form.deviceName}
                                    onChange={(e) => handleChange('deviceName', e.target.value)}
                                    disabled={form.source === 'Manual'}
                                />

                                {form.source === 'Manual' && (
                                    <div className="form-text">
                                        Device name is not needed when measuring manually.
                                    </div>
                                )}
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-semibold">
                                    Heart rate / Pulse <span className="text-danger">*</span>
                                </label>

                                <div className="input-group">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={form.heartRate}
                                        onChange={(e) => handleChange('heartRate', e.target.value)}
                                        min="30"
                                        max="220"
                                        required
                                    />

                                    <span className="input-group-text">bpm</span>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-link btn-sm p-0 mt-1 text-decoration-none"
                                    onClick={() => setShowPulseGuide((prev) => !prev)}
                                >
                                    {showPulseGuide ? 'Hide pulse guide' : 'How to measure pulse manually?'}
                                </button>

                                {showPulseGuide && (
                                    <div className="alert alert-light border small mt-2 mb-0">
                                        <div className="fw-semibold mb-1">
                                            Manual pulse counting
                                        </div>

                                        <ol className="mb-0 ps-3">
                                            <li>Sit still and rest for a few minutes.</li>
                                            <li>Place two fingers on your wrist or side of your neck.</li>
                                            <li>Count your pulse for 30 seconds.</li>
                                            <li>Multiply the number by 2 to get beats per minute.</li>
                                        </ol>

                                        <div className="mt-2 text-muted">
                                            Example: 38 beats in 30 seconds = 76 bpm.
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-semibold">
                                    Blood pressure
                                </label>

                                <div className="input-group">
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="SYS"
                                        value={form.bloodPressureSystolic}
                                        onChange={(e) =>
                                            handleChange('bloodPressureSystolic', e.target.value)
                                        }
                                    />

                                    <span className="input-group-text">/</span>

                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="DIA"
                                        value={form.bloodPressureDiastolic}
                                        onChange={(e) =>
                                            handleChange('bloodPressureDiastolic', e.target.value)
                                        }
                                    />

                                    <span className="input-group-text">mmHg</span>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-link btn-sm p-0 mt-1 text-decoration-none"
                                    onClick={() => setShowBloodPressureGuide((prev) => !prev)}
                                >
                                    {showBloodPressureGuide
                                        ? 'Hide blood pressure guide'
                                        : 'Where can I find SYS/DIA/Pulse?'}
                                </button>

                                {showBloodPressureGuide && (
                                    <div className="alert alert-light border small mt-2 mb-0">
                                        <div className="fw-semibold mb-1">
                                            Using a home blood pressure monitor
                                        </div>

                                        <ul className="mb-0 ps-3">
                                            <li>
                                                <strong>SYS</strong>: systolic blood pressure.
                                            </li>
                                            <li>
                                                <strong>DIA</strong>: diastolic blood pressure.
                                            </li>
                                            <li>
                                                <strong>Pulse</strong>: heart rate, enter it in the Heart rate field.
                                            </li>
                                        </ul>

                                        <div className="mt-2 text-muted">
                                            If you do not have a blood pressure monitor, leave blood pressure empty
                                            and only enter your pulse.
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-semibold">
                                    SpO2
                                </label>

                                <div className="input-group">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={form.oxygenSaturation}
                                        onChange={(e) =>
                                            handleChange('oxygenSaturation', e.target.value)
                                        }
                                        min="50"
                                        max="100"
                                    />

                                    <span className="input-group-text">%</span>
                                </div>

                                <div className="form-text">
                                    Optional. Enter if measured by pulse oximeter or smartwatch.
                                </div>
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-semibold">
                                    Temperature
                                </label>

                                <div className="input-group">
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="form-control"
                                        value={form.temperature}
                                        onChange={(e) => handleChange('temperature', e.target.value)}
                                        min="30"
                                        max="45"
                                    />

                                    <span className="input-group-text">°C</span>
                                </div>

                                <div className="form-text">
                                    Optional. Enter if measured by thermometer.
                                </div>
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-semibold">
                                    Respiratory rate
                                </label>

                                <div className="input-group">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={form.respiratoryRate}
                                        onChange={(e) =>
                                            handleChange('respiratoryRate', e.target.value)
                                        }
                                        min="5"
                                        max="60"
                                    />

                                    <span className="input-group-text">breaths/min</span>
                                </div>

                                <div className="form-text">
                                    Optional. Count breaths for 30 seconds, then multiply by 2.
                                </div>
                            </div>

                            <div className="col-md-12">
                                <label className="form-label fw-semibold">
                                    Notes
                                </label>

                                <RichTextEditor
                                    value={form.notes}
                                    onChange={(value) => handleChange('notes', value)}
                                    placeholder="Example: measured after resting for 5 minutes, felt dizzy, mild chest discomfort..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer border-0">
                        <button
                            type="button"
                            className="btn btn-light"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save and continue'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PreConsultationVitalsModal;