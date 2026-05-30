import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { doctorScheduleService } from '@api/doctorApi';
import { doctorComplianceService } from '@api/complianceApi';
import WeeklyScheduleBuilder from '@components/doctor/WeeklyScheduleBuilder';
import ScheduleCalendarView from '@components/doctor/ScheduleCalendarView';
import ScheduleExceptionModal from '@components/doctor/ScheduleExceptionModal';
import '@components/Css/doctor/doctor-dashboard/doctor-dashboard.css';
import ComplianceStatusBanner from '@components/doctor/ComplianceStatusBanner';
import ComplianceWarningModal from '@components/doctor/ComplianceWarningModal';

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
      <div className="doctor-schedule-state">
        <div className="spinner-border text-primary" role="status" style={{width:'2rem',height:'2rem'}}>
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="doctor-schedule-state doctor-schedule-state--error">
        <span className="material-symbols-outlined text-error" style={{fontSize:'2rem'}}>error_outline</span>
        <h3 className="doctor-schedule-state__error-title">Error Loading Schedule</h3>
        <p className="doctor-schedule-state__error-desc">{error}</p>
        <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={fetchSchedule} type="button">
          <span className="material-symbols-outlined" style={{fontSize:'0.875rem'}}>refresh</span>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="doctor-schedule-container pt-3">
      <div className="doctor-schedule-action-bar">
        <div className="doctor-schedule-tabs" style={{backgroundColor:'var(--primary-light)'}}>
          <button
            className={`doctor-schedule-tab ${activeTab === 'weekly' ? 'doctor-schedule-tab--active' : ''}`}
            onClick={() => setActiveTab('weekly')}
            type="button"
          >
            <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>calendar_view_week</span>
            Weekly Schedule
          </button>
          <button
            className={`doctor-schedule-tab ${activeTab === 'calendar' ? 'doctor-schedule-tab--active' : ''}`}
            onClick={() => setActiveTab('calendar')}
            type="button"
          >
            <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>calendar_month</span>
            Calendar View
          </button>
        </div>
        <button
          className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
          onClick={() => handleCreateException(new Date())}
          type="button"
        >
          <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>add_circle</span>
          Add Exception
        </button>
      </div>

      <ComplianceStatusBanner key={complianceKey} onValidateClick={handleValidateCompliance} />

      {activeTab === 'weekly' ? (
        <WeeklyScheduleBuilder schedules={scheduleData?.schedules || []} onRefresh={refreshSchedule} />
      ) : (
        <ScheduleCalendarView
          exceptions={scheduleData?.exceptions || []}
          onCreateException={handleCreateException}
          onRefresh={refreshSchedule}
        />
      )}

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
