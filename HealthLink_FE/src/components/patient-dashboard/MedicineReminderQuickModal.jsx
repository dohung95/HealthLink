import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { medicineReminderApi } from '../../api/medicineReminderApi';
import '../Css/MedicineReminder.css';

function MedicineReminderQuickModal({ show, timing, onClose }) {
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show || !timing) return;
    const loadChecklist = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await medicineReminderApi.getTodayChecklist(timing);
        setChecklist(data);
      } catch (err) {
        console.error('Failed to load quick medicine checklist:', err);
        setError('Could not load medicines.');
      } finally {
        setLoading(false);
      }
    };
    loadChecklist();
  }, [show, timing]);

  if (!show) return null;

  const handleCheck = async (item, checked) => {
    if (!checklist) return;
    try {
      const updated = await medicineReminderApi.updateIntakeCheck({
        prescriptionItemId: item.prescriptionItemId,
        timing,
        intakeDate: checklist.date,
        checked,
      });
      setChecklist(updated);
    } catch (err) {
      console.error('Failed to update quick medicine checklist:', err);
      setError('Could not update this medicine.');
    }
  };

  const handleComplete = async () => {
    try {
      const updated = await medicineReminderApi.completeTiming(timing);
      setChecklist(updated);
    } catch (err) {
      console.error('Failed to complete quick medicine checklist:', err);
      setError('Could not mark medicines as taken.');
    }
  };

  const openFullPage = () => {
    navigate(`/patient-dashboard/reminders?timing=${timing}`);
    onClose();
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={onClose}></div>
      <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }} onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered" onClick={(event) => event.stopPropagation()}>
          <div className="modal-content medicine-quick-modal">
            <div className="modal-header">
              <h5 className="modal-title">{timing?.toLowerCase()} medicines</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              {error && <div className="medicine-reminder-alert">{error}</div>}
              {loading && <div className="medicine-empty-state">Loading medicines...</div>}
              {!loading && checklist?.totalCount > 0 && (
                <div className="medicine-reminder-list">
                  <p className="medicine-modal-count">
                    {checklist.prescriptions.length} prescriptions - {checklist.totalCount} medicines
                  </p>
                  {checklist.prescriptions.flatMap((prescription) => prescription.items).map((item) => (
                    <label className="medicine-check-row" key={item.prescriptionItemId}>
                      <input
                        type="checkbox"
                        checked={Boolean(item.checked)}
                        onChange={(event) => handleCheck(item, event.target.checked)}
                      />
                      <span>
                        <strong>{item.medicationName}</strong>
                        <small>{[item.dosage, item.quantity && `${item.quantity} ${item.unit || ''}`].filter(Boolean).join(' - ')}</small>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {!loading && checklist?.totalCount === 0 && (
                <div className="medicine-empty-state">No medicines scheduled for this timing.</div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={openFullPage}>
                Open full reminder page
              </button>
              {checklist?.totalCount > 0 && !checklist.complete && (
                <button type="button" className="btn btn-primary" onClick={handleComplete}>
                  Mark all as taken
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default MedicineReminderQuickModal;
