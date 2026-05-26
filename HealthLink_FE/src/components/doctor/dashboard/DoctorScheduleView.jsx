import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { doctorScheduleService } from '../../../api/doctorApi';
import { doctorComplianceService } from '../../../api/complianceApi';
import WeeklyScheduleBuilder from './schedule/WeeklyScheduleBuilder';
import ScheduleCalendarView from './schedule/ScheduleCalendarView';
import ScheduleExceptionModal from './schedule/ScheduleExceptionModal';
import ComplianceStatusBanner from './compliance/ComplianceStatusBanner';
import ComplianceWarningModal from './compliance/ComplianceWarningModal';

const DoctorScheduleView = () => {
  const [activeTab, setActiveTab] = useState('weekly');
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [complianceResult, setComplianceResult] = useState(null);
  const [complianceKey, setComplianceKey] = useState(0);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await doctorScheduleService.getMySchedule();
      setScheduleData(data);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError(err.response?.data?.message || 'Failed to load schedule');
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const refreshSchedule = () => {
    fetchSchedule();
    setComplianceKey((current) => current + 1);
  };

  const handleCreateException = (date) => {
    setSelectedDate(date);
    setShowExceptionModal(true);
  };

  const handleExceptionSuccess = () => {
    setShowExceptionModal(false);
    setSelectedDate(null);
    refreshSchedule();
    toast.success('Exception created successfully');
  };

  const handleValidateCompliance = async () => {
    try {
      const result = await doctorComplianceService.validateSchedule();
      setComplianceResult(result);
      setShowComplianceModal(true);
    } catch (err) {
      console.error('Error validating compliance:', err);
      toast.error('Failed to validate schedule compliance');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-surface-border bg-white">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-error-container bg-white p-5 text-error" role="alert">
        <h3 className="mb-2 text-lg font-bold">Error Loading Schedule</h3>
        <p className="mb-4 text-sm">{error}</p>
        <button className="rounded border border-error px-4 py-2 text-sm font-semibold text-error hover:bg-error-container/30" onClick={fetchSchedule} type="button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <button
          className="flex h-10 w-max items-center justify-center gap-2 rounded bg-primary-container px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary"
          onClick={() => handleCreateException(new Date())}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Add Exception
        </button>
      </header>

      <ComplianceStatusBanner key={complianceKey} onValidateClick={handleValidateCompliance} />

      <section className="flex flex-col gap-4">
        <div className="flex gap-5 border-b border-surface-border">
          <button
            className={`border-b-2 pb-3 text-xs font-bold tracking-wide transition ${activeTab === 'weekly' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-main'}`}
            onClick={() => setActiveTab('weekly')}
            type="button"
          >
            WEEKLY SCHEDULE
          </button>
          <button
            className={`border-b-2 pb-3 text-xs font-bold tracking-wide transition ${activeTab === 'calendar' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-main'}`}
            onClick={() => setActiveTab('calendar')}
            type="button"
          >
            CALENDAR VIEW
          </button>
        </div>

        {activeTab === 'weekly' ? (
          <WeeklyScheduleBuilder schedules={scheduleData?.schedules || []} onRefresh={refreshSchedule} />
        ) : (
          <ScheduleCalendarView
            exceptions={scheduleData?.exceptions || []}
            onCreateException={handleCreateException}
            onRefresh={refreshSchedule}
          />
        )}
      </section>

      <ScheduleExceptionModal
        isOpen={showExceptionModal}
        onClose={() => {
          setShowExceptionModal(false);
          setSelectedDate(null);
        }}
        selectedDate={selectedDate}
        onSuccess={handleExceptionSuccess}
      />

      <ComplianceWarningModal
        isOpen={showComplianceModal}
        onClose={() => {
          setShowComplianceModal(false);
          setComplianceResult(null);
        }}
        validationResult={complianceResult}
        onAddMoreHours={() => {
          setShowComplianceModal(false);
          setActiveTab('weekly');
        }}
        onSaveAnyway={() => {
          setShowComplianceModal(false);
          setComplianceResult(null);
          toast.info('Schedule saved but remains inactive until compliance is met');
        }}
      />
    </div>
  );
};

export default DoctorScheduleView;
