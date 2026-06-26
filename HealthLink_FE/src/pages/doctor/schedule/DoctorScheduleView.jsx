import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { doctorScheduleService, doctorService } from '@api/doctorApi';
import { doctorComplianceService } from '@api/complianceApi';
import WeeklyScheduleBuilder from '@components/doctor/WeeklyScheduleBuilder';
import ScheduleCalendarView from '@components/doctor/ScheduleCalendarView';
import '@components/Css/doctor/doctor-dashboard/doctor-dashboard.css';
import ComplianceStatusBanner from '@components/doctor/ComplianceStatusBanner';
import ComplianceWarningModal from '@components/doctor/ComplianceWarningModal';

const DoctorScheduleView = () => {
  const [activeTab, setActiveTab] = useState('weekly');
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [complianceResult, setComplianceResult] = useState(null);
  const [complianceKey, setComplianceKey] = useState(0);
  const [doctorId, setDoctorId] = useState(null);
  const [availableAppointments, setAvailableAppointments] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [requestReason, setRequestReason] = useState('');
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);

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
    fetchDoctorInfo();
  }, []);

  const refreshSchedule = () => {
    fetchSchedule();
    fetchDoctorInfo();
    setComplianceKey((current) => current + 1);
  };

  const getAppointmentTimeValue = (appointment) => {
    return appointment?.appointmentTime || appointment?.consultationStartTime || appointment?.startTime || null;
  };

  const fetchDoctorInfo = async () => {
    try {
      setLoadingRequests(true);
      const doctor = await doctorService.getCurrentDoctor();
      setDoctorId(doctor?.doctorId || doctor?.doctorID || null);

      const doctorAppointments = await doctorService.getDoctorAppointments(doctor?.doctorId || doctor?.doctorID || null);
      const now = new Date();
      const upcoming = (doctorAppointments || [])
        .filter((appointment) => {
          const appointmentTime = getAppointmentTimeValue(appointment);
          const status = (appointment?.status || appointment?.statusName || '').toString().toUpperCase();
          return appointmentTime && new Date(appointmentTime) > now && status === 'SCHEDULED';
        })
        .sort((a, b) => new Date(getAppointmentTimeValue(a)) - new Date(getAppointmentTimeValue(b)));

      setAvailableAppointments(upcoming);
      const requests = await doctorScheduleService.getMyScheduleChangeRequests();
      setChangeRequests(requests || []);
    } catch (err) {
      console.error('Error fetching schedule change request data:', err);
      toast.error(err.response?.data?.message || 'Failed to load schedule change request data');
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSubmitChangeRequest = async () => {
    if (!selectedAppointmentId) {
      toast.error('Please select a future appointment to request a schedule change.');
      return;
    }

    if (!requestReason.trim()) {
      toast.error('Please enter a reason for the schedule change request.');
      return;
    }

    try {
      setCreatingRequest(true);
      await doctorScheduleService.createScheduleChangeRequest({
        appointmentId: selectedAppointmentId,
        reason: requestReason.trim(),
      });

      toast.success('Schedule change request sent to admin.');
      setSelectedAppointmentId(null);
      setRequestReason('');
      await fetchDoctorInfo();
      await fetchSchedule();
    } catch (err) {
      console.error('Error sending schedule change request:', err);
      toast.error(err.response?.data?.message || 'Failed to send schedule change request');
    } finally {
      setCreatingRequest(false);
    }
  };

  const handleAppointmentSelection = (event) => {
    setSelectedAppointmentId(event.target.value ? Number(event.target.value) : null);
  };

  const formatAppointmentTime = (appointment) => {
    const value = getAppointmentTimeValue(appointment);
    if (!value) return 'Unknown';
    return new Date(value).toLocaleString();
  };

  const formatRequestDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadgeClass = (status) => {
    switch ((status || '').toString().toUpperCase()) {
      case 'APPROVED':
        return 'badge bg-success';
      case 'REJECTED':
        return 'badge bg-danger';
      case 'PENDING':
      default:
        return 'badge bg-warning text-dark';
    }
  };

  const requestStatusText = (status) => {
    return status ? status.toString().replace('_', ' ') : 'UNKNOWN';
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
      </div>

      {activeTab === 'weekly' ? (
        <WeeklyScheduleBuilder
          schedules={scheduleData?.schedules || []}
          scheduleData={scheduleData}
          onRefresh={refreshSchedule}
          appointments={availableAppointments}
          changeRequests={changeRequests}
          onCreateChangeRequest={handleSubmitChangeRequest}
          loadingRequests={loadingRequests}
          onRefreshRequests={fetchDoctorInfo}
        />
      ) : (
        <ScheduleCalendarView
          exceptions={scheduleData?.exceptions || []}
          onRefresh={refreshSchedule}
        />
      )}

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
