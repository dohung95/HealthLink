import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { medicineReminderApi, MEDICINE_REMINDER_TIMINGS } from '../../api/medicineReminderApi';
import '../Css/MedicineReminder.css';

const TIMING_LABELS = {
  MORNING: 'Morning',
  AFTERNOON: 'Afternoon',
  EVENING: 'Evening',
};

const todayIso = () => new Date().toISOString().slice(0, 10);

function MedicineReminderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTiming = MEDICINE_REMINDER_TIMINGS.includes(searchParams.get('timing'))
    ? searchParams.get('timing')
    : 'MORNING';
  const [activeTiming, setActiveTiming] = useState(initialTiming);
  const [settings, setSettings] = useState(null);
  const [draftSettings, setDraftSettings] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState('');

  const selectedTime = useMemo(() => {
    if (!settings) return '';
    const key = `${activeTiming.toLowerCase()}Time`;
    return settings[key] || '';
  }, [activeTiming, settings]);

  const loadData = async (timing = activeTiming) => {
    setLoading(true);
    setError('');
    try {
      const [settingsData, checklistData] = await Promise.all([
        medicineReminderApi.getSettings(),
        medicineReminderApi.getTodayChecklist(timing),
      ]);
      setSettings(settingsData);
      setDraftSettings(settingsData);
      setChecklist(checklistData);
    } catch (err) {
      console.error('Failed to load medicine reminder data:', err);
      setError('Could not load medicine reminders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeTiming);
  }, [activeTiming]);

  const handleTimingChange = (timing) => {
    setActiveTiming(timing);
    setSearchParams({ timing });
  };

  const handleCheck = async (item, checked) => {
    if (!checklist) return;
    setError('');
    try {
      const updated = await medicineReminderApi.updateIntakeCheck({
        prescriptionItemId: item.prescriptionItemId,
        timing: activeTiming,
        intakeDate: checklist.date || todayIso(),
        checked,
      });
      setChecklist(updated);
    } catch (err) {
      console.error('Failed to update intake check:', err);
      setError('Could not update this medicine. Please try again.');
    }
  };

  const handleComplete = async () => {
    setError('');
    try {
      const updated = await medicineReminderApi.completeTiming(activeTiming);
      setChecklist(updated);
    } catch (err) {
      console.error('Failed to complete timing:', err);
      setError('Could not mark all medicines as taken.');
    }
  };

  const handleSettingChange = (field, value) => {
    setDraftSettings((current) => ({ ...current, [field]: value }));
  };

  const handleSaveSettings = async (event) => {
    event.preventDefault();
    setSavingSettings(true);
    setError('');
    try {
      const updated = await medicineReminderApi.updateSettings(draftSettings);
      setSettings(updated);
      setDraftSettings(updated);
      await loadData(activeTiming);
    } catch (err) {
      console.error('Failed to save reminder settings:', err);
      setError('Reminder times must be valid and distinct.');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="medicine-reminder-page">
      <div className="medicine-reminder-header">
        <div>
          <h2>Medicine Reminder</h2>
          <p>Manage today&apos;s medicine checklist by timing.</p>
        </div>
        {settings && (
          <span className={`medicine-reminder-status ${settings.enabled ? 'enabled' : 'disabled'}`}>
            {settings.enabled ? 'Notifications on' : 'Notifications off'}
          </span>
        )}
      </div>

      {error && <div className="medicine-reminder-alert">{error}</div>}

      <div className="medicine-reminder-tabs" role="tablist" aria-label="Medicine reminder timings">
        {MEDICINE_REMINDER_TIMINGS.map((timing) => (
          <button
            key={timing}
            type="button"
            className={`medicine-reminder-tab ${activeTiming === timing ? 'active' : ''}`}
            onClick={() => handleTimingChange(timing)}
          >
            <span>{TIMING_LABELS[timing]}</span>
            <strong>{settings?.[`${timing.toLowerCase()}Time`] || '--:--'}</strong>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="medicine-reminder-panel skeleton">Loading medicine reminders...</div>
      ) : (
        <div className="medicine-reminder-grid">
          <section className="medicine-reminder-panel">
            <div className="medicine-reminder-summary">
              <div>
                <p className="eyebrow">Today</p>
                <h3>{TIMING_LABELS[activeTiming]} medicines</h3>
                <span>{selectedTime}</span>
              </div>
              <div className="progress-pill">
                {checklist?.checkedCount || 0}/{checklist?.totalCount || 0}
              </div>
            </div>

            {checklist?.totalCount > 0 ? (
              <>
                <div className="medicine-reminder-list">
                  {checklist.prescriptions.map((prescription) => (
                    <div className="medicine-prescription-group" key={prescription.prescriptionHeaderId}>
                      <div className="medicine-prescription-title">
                        <strong>Prescription #{prescription.prescriptionHeaderId}</strong>
                        <span>{prescription.doctorName || 'Doctor'}</span>
                      </div>
                      {prescription.items.map((item) => (
                        <label className="medicine-check-row" key={item.prescriptionItemId}>
                          <input
                            type="checkbox"
                            checked={Boolean(item.checked)}
                            onChange={(event) => handleCheck(item, event.target.checked)}
                          />
                          <span>
                            <strong>{item.medicationName}</strong>
                            <small>{[item.dosage, item.quantity && `${item.quantity} ${item.unit || ''}`, item.instructions].filter(Boolean).join(' - ')}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
                {!checklist.complete && (
                  <button type="button" className="medicine-primary-btn" onClick={handleComplete}>
                    Mark all as taken
                  </button>
                )}
                {checklist.complete && (
                  <div className="medicine-complete-state">All {TIMING_LABELS[activeTiming].toLowerCase()} medicines are marked as taken.</div>
                )}
              </>
            ) : (
              <div className="medicine-empty-state">No medicines scheduled for this timing.</div>
            )}
          </section>

          <section className="medicine-reminder-panel">
            <h3>Reminder settings</h3>
            {draftSettings && (
              <form className="medicine-settings-form" onSubmit={handleSaveSettings}>
                <label>
                  Morning
                  <input type="time" value={draftSettings.morningTime || ''} onChange={(event) => handleSettingChange('morningTime', event.target.value)} />
                </label>
                <label>
                  Afternoon
                  <input type="time" value={draftSettings.afternoonTime || ''} onChange={(event) => handleSettingChange('afternoonTime', event.target.value)} />
                </label>
                <label>
                  Evening
                  <input type="time" value={draftSettings.eveningTime || ''} onChange={(event) => handleSettingChange('eveningTime', event.target.value)} />
                </label>
                <label className="medicine-toggle-row">
                  <input type="checkbox" checked={Boolean(draftSettings.enabled)} onChange={(event) => handleSettingChange('enabled', event.target.checked)} />
                  Enable notifications
                </label>
                <button type="submit" className="medicine-secondary-btn" disabled={savingSettings}>
                  {savingSettings ? 'Saving...' : 'Save settings'}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default MedicineReminderPage;
