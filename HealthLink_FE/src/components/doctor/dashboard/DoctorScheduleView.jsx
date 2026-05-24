import React, { useState, useEffect } from 'react';
import { doctorScheduleService } from '../../../api/doctorApi';
import WeeklyScheduleBuilder from './schedule/WeeklyScheduleBuilder';
import ScheduleCalendarView from './schedule/ScheduleCalendarView';
import ScheduleExceptionModal from './schedule/ScheduleExceptionModal';
import { toast } from 'sonner';

const DoctorScheduleView = () => {
  const [activeTab, setActiveTab] = useState('weekly'); // 'weekly' | 'calendar'
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchSchedule();
  }, []);

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

  const handleCreateException = (date) => {
    setSelectedDate(date);
    setShowExceptionModal(true);
  };

  const handleExceptionSuccess = () => {
    setShowExceptionModal(false);
    setSelectedDate(null);
    fetchSchedule();
    toast.success('Exception created successfully');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4" role="alert">
        <h5 className="alert-heading">Error Loading Schedule</h5>
        <p>{error}</p>
        <button className="btn btn-outline-danger" onClick={fetchSchedule}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="doctor-schedule-container p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">My Schedule</h4>
          <p className="text-muted mb-0">Manage your working hours and time off</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => handleCreateException(new Date())}
        >
          <span className="material-symbols-outlined me-2" style={{ fontSize: '18px', verticalAlign: 'middle' }}>
            add_circle
          </span>
          Add Exception
        </button>
      </div>

      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'weekly' ? 'active' : ''}`}
            onClick={() => setActiveTab('weekly')}
          >
            <span className="material-symbols-outlined me-2" style={{ fontSize: '18px', verticalAlign: 'middle' }}>
              calendar_view_week
            </span>
            Weekly Schedule
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <span className="material-symbols-outlined me-2" style={{ fontSize: '18px', verticalAlign: 'middle' }}>
              calendar_month
            </span>
            Calendar View
          </button>
        </li>
      </ul>

      {/* Content */}
      {activeTab === 'weekly' && (
        <WeeklyScheduleBuilder
          schedules={scheduleData?.schedules || []}
          onRefresh={fetchSchedule}
        />
      )}

      {activeTab === 'calendar' && (
        <ScheduleCalendarView
          exceptions={scheduleData?.exceptions || []}
          onCreateException={handleCreateException}
          onRefresh={fetchSchedule}
        />
      )}

      {/* Exception Modal */}
      <ScheduleExceptionModal
        isOpen={showExceptionModal}
        onClose={() => {
          setShowExceptionModal(false);
          setSelectedDate(null);
        }}
        selectedDate={selectedDate}
        onSuccess={handleExceptionSuccess}
      />
    </div>
  );
};

export default DoctorScheduleView;
