import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doctorService } from '../../api/doctorApi';
import { appointmentService } from '../../api/appointmentApi';
import { notificationApi } from '../../api/notificationApi';
import signalRService from '../../services/signalrService';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../components/doctor/Css/DoctorDashboard.css';
import DoctorAppointmentDetail from '../../components/doctor/appointment/DoctorAppointmentDetail';
import DoctorAppointmentsView from '../../components/doctor/dashboard/DoctorAppointmentsView';
import DoctorPatientDetailView from '../../components/doctor/patient/DoctorPatientDetailView';
import DoctorPatientsView from '../../components/doctor/dashboard/DoctorPatientsView';
import DoctorPrescriptionsView from '../../components/doctor/dashboard/DoctorPrescriptionsView';
import DoctorProfileView from '../../components/doctor/dashboard/DoctorProfileView';
import DoctorScheduleView from '../../components/doctor/dashboard/DoctorScheduleView';

const NAV_ITEMS = [
  {
    key: 'appointments',
    label: 'Appointments',
    icon: 'calendar_today',
    wide: true,
  },
  {
    key: 'patients',
    label: 'Patients',
    icon: 'groups',
    wide: true,
  },
  {
    key: 'prescriptions',
    label: 'Prescriptions',
    icon: 'medication',
    wide: true,
  },
  {
    key: 'schedule',
    label: 'Schedule',
    icon: 'event_note',
    wide: true,
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'person_outline',
    wide: false,
  },
];

const APPOINTMENT_DETAIL_VIEW = 'appointmentDetail';
const PATIENT_DETAIL_VIEW = 'patientDetail';

const normalizeAppointmentDetail = (detail, appointmentId) => ({
  ...detail,
  appointmentID: detail?.appointmentID ?? detail?.appointmentId ?? appointmentId,
  appointmentId: detail?.appointmentId ?? detail?.appointmentID ?? appointmentId,
  doctorID: detail?.doctorID ?? detail?.doctorId,
  doctorId: detail?.doctorId ?? detail?.doctorID,
  patient: {
    patientID: detail?.patientId ?? detail?.patientID,
    patientId: detail?.patientId ?? detail?.patientID,
    fullName: detail?.patientName,
  },
});

const getInitials = (name) => {
  if (!name) return 'DR';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const formatNotificationTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getNotificationTone = (notification) => {
  const value = `${notification?.type || ''} ${notification?.message || ''}`.toLowerCase();
  if (value.includes('wallet') || value.includes('balance')) {
    return { icon: 'account_balance_wallet', title: 'Wallet Update', accent: 'text-success', bg: 'bg-success/10' };
  }
  if (value.includes('emergency') || value.includes('urgent')) {
    return { icon: 'emergency', title: 'Emergency Update', accent: 'text-critical', bg: 'bg-critical/10' };
  }
  if (value.includes('lab') || value.includes('record')) {
    return { icon: 'lab_research', title: 'Medical Record', accent: 'text-success', bg: 'bg-success/10' };
  }
  return { icon: 'event', title: 'Appointment Update', accent: 'text-primary-container', bg: 'bg-primary-container/10' };
};

const DoctorDashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const notificationRef = useRef(null);

  const [doctorData, setDoctorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('appointments');
  const [detailReturnView, setDetailReturnView] = useState('appointments');
  const [profileTab, setProfileTab] = useState('personal');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedPatientSummary, setSelectedPatientSummary] = useState(null);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const doctorId = doctorData?.doctorID || doctorData?.doctorId;
  const doctorName = doctorData?.fullName || 'Doctor';
  const doctorSpecialty = doctorData?.specialty || 'HealthLink Professional';
  const doctorAvatar = doctorData?.avatarUrl || doctorData?.profileImage || doctorData?.imageUrl;
  const isDetailView = view === APPOINTMENT_DETAIL_VIEW || view === PATIENT_DETAIL_VIEW;
  const currentNavItem = useMemo(() => {
    if (view === APPOINTMENT_DETAIL_VIEW) return NAV_ITEMS[0];
    if (view === PATIENT_DETAIL_VIEW) return NAV_ITEMS[1];
    return NAV_ITEMS.find((item) => item.key === view) || NAV_ITEMS[0];
  }, [view]);

  const fetchNotifications = async () => {
    try {
      const data = await notificationApi.getMyNotifications();
      setNotifications(data || []);
      setUnreadCount(data?.filter((notification) => !notification.isRead).length || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await doctorService.getCurrentDoctor();
      setDoctorData(data);
    } catch (err) {
      console.error('Error fetching doctor data:', err);
      setError('Failed to load doctor information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
    fetchNotifications();
  }, []);

  useEffect(() => {
    const queryTab = new URLSearchParams(location.search).get('tab');
    if (queryTab === 'wallet') {
      setView('profile');
      setProfileTab('wallet');
    }
  }, [location.search]);

  useEffect(() => {
    const initSignalR = async () => {
      const handleAppointmentNotification = () => {
        fetchNotifications();
      };

      signalRService.on('ReceiveAppointmentNotification', handleAppointmentNotification);
      await signalRService.startConnection();
    };

    initSignalR();
    return () => {
      signalRService.off('ReceiveAppointmentNotification');
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen || showAllNotifications ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen, showAllNotifications]);

  const selectView = (nextView) => {
    setView(nextView);
    setIsMobileMenuOpen(false);
    setProfileTab('personal');
    navigate('/doctor-page', { replace: true });
  };

  const handleLogout = async () => {
    try {
      await signalRService.stopConnection();
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/login');
    }
  };

  const openAppointmentDetail = async (appointment, returnView = 'appointments') => {
    try {
      setDetailLoading(true);
      const patientId =
        appointment?.patient?.patientID ||
        appointment?.patient?.patientId ||
        appointment?.patientId ||
        appointment?.patientID;

      const patientData = patientId ? await doctorService.getPatientById(patientId) : null;
      setSelectedAppointment(appointment);
      setSelectedPatient(patientData);
      setDetailReturnView(returnView);
      setView(APPOINTMENT_DETAIL_VIEW);
    } catch (err) {
      console.error('Error fetching patient data:', err);
      setError('Failed to load patient information');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenAppointmentById = async (appointmentId, returnView = view) => {
    try {
      setDetailLoading(true);
      const detail = await appointmentService.getAppointmentDetail(appointmentId);
      const normalizedAppointment = normalizeAppointmentDetail(detail, appointmentId);
      const patientId = normalizedAppointment.patient?.patientID || normalizedAppointment.patientId;
      const patientData = patientId ? await doctorService.getPatientById(patientId) : null;

      setSelectedAppointment(normalizedAppointment);
      setSelectedPatient(patientData);
      setDetailReturnView(returnView === APPOINTMENT_DETAIL_VIEW ? 'appointments' : returnView);
      setView(APPOINTMENT_DETAIL_VIEW);
    } catch (err) {
      console.error('Error opening appointment:', err);
      setError('Failed to load appointment information');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBackFromAppointment = () => {
    setView(detailReturnView || 'appointments');
    setSelectedAppointment(null);
    setSelectedPatient(null);
  };

  const handleViewPatient = (patient) => {
    setSelectedPatientSummary(patient);
    setView(PATIENT_DETAIL_VIEW);
  };

  const handleBackFromPatient = () => {
    setSelectedPatientSummary(null);
    setView('patients');
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await notificationApi.markAsRead(notification.notificationId);
        fetchNotifications();
      }

      setShowNotificationDropdown(false);
      setShowAllNotifications(false);
      setIsMobileMenuOpen(false);

      if (notification.type === 'WALLET_BALANCE_CHANGED' || notification.actionUrl === '/profile-doctor?tab=wallet') {
        navigate('/doctor-page?tab=wallet');
        return;
      }

      if (notification.appointmentId) {
        await handleOpenAppointmentById(notification.appointmentId, 'appointments');
      }
    } catch (err) {
      console.error('Error navigating notification:', err);
      alert('Failed to load notification target');
    }
  };

  const handleMarkAllRead = async () => {
    await notificationApi.markAllAsRead();
    fetchNotifications();
  };

  const renderAvatar = (sizeClass = 'h-10 w-10') => (
    <div className={`${sizeClass} shrink-0 overflow-hidden rounded-full border border-surface-border bg-primary-fixed text-primary flex items-center justify-center font-bold`}>
      {doctorAvatar ? (
        <img alt={doctorName} className="h-full w-full object-cover" src={doctorAvatar} />
      ) : (
        <span>{getInitials(doctorName)}</span>
      )}
    </div>
  );

  const renderNavigationLinks = (mobile = false) => (
    <div className={mobile ? 'grid grid-cols-5 gap-1' : 'flex flex-col gap-1'}>
      {NAV_ITEMS.map((item) => {
        const isActive =
          view === item.key ||
          (item.key === 'appointments' && view === APPOINTMENT_DETAIL_VIEW) ||
          (item.key === 'patients' && view === PATIENT_DETAIL_VIEW);

        return (
          <button
            className={
              mobile
                ? `flex min-h-14 flex-col items-center justify-center rounded-lg px-1 py-2 text-[11px] font-semibold transition ${isActive ? 'bg-primary-container text-white shadow-sm' : 'text-on-surface-variant'}`
                : `flex items-center gap-3 rounded px-3 py-2.5 text-left text-sm font-medium transition active:scale-[0.99] ${isActive ? 'border-l-4 border-primary bg-surface-container-low text-primary font-bold' : 'border-l-4 border-transparent text-on-surface-variant hover:bg-surface-container hover:text-primary'}`
            }
            key={item.key}
            onClick={() => selectView(item.key)}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span className={mobile ? 'leading-tight' : ''}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  const renderNotificationList = (expanded = false) => (
    <div className={`${expanded ? 'max-h-[70vh]' : 'max-h-[400px]'} overflow-y-auto divide-y divide-surface-border`}>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-10 text-center text-text-muted">
          <span className="material-symbols-outlined mb-2 text-4xl">notifications_off</span>
          <p className="mb-0 text-sm font-semibold">No notifications</p>
          <p className="mb-0 text-xs">Updates about appointments and wallet activity will appear here.</p>
        </div>
      ) : (
        notifications.map((notification) => {
          const tone = getNotificationTone(notification);

          return (
            <article
              className={`flex gap-3 p-4 transition hover:bg-surface-container-low ${!notification.isRead ? 'bg-primary-fixed/20' : 'bg-white'}`}
              key={notification.notificationId}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone.bg}`}>
                <span className={`material-symbols-outlined ${tone.accent}`}>{tone.icon}</span>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <p className={`mb-0 text-sm font-semibold ${tone.accent === 'text-critical' ? 'text-critical' : 'text-on-surface'}`}>
                    {notification.title || tone.title}
                  </p>
                  {!notification.isRead ? <span className="mt-1.5 h-2 w-2 rounded-full bg-primary-container" /> : null}
                </div>
                <p className="mb-0 whitespace-pre-line text-xs leading-5 text-text-muted">{notification.message}</p>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-text-muted">{formatNotificationTime(notification.createdAt)}</span>
                  {(notification.appointmentId || notification.actionUrl) ? (
                    <button
                      className="text-xs font-semibold text-primary-container hover:underline"
                      onClick={() => handleNotificationClick(notification)}
                      type="button"
                    >
                      View Detail
                    </button>
                  ) : (
                    <button
                      className="text-xs font-semibold text-primary-container hover:underline"
                      onClick={() => handleNotificationClick(notification)}
                      type="button"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })
      )}
    </div>
  );

  const renderNotificationBell = () => (
    <div className="relative" ref={notificationRef}>
      <button
        aria-label="Open notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-container hover:text-primary"
        onClick={() => setShowNotificationDropdown((current) => !current)}
        type="button"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 ? (
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-surface bg-critical" />
        ) : null}
      </button>

      {showNotificationDropdown ? (
        <div className="absolute right-0 z-50 mt-2 hidden w-[360px] overflow-hidden rounded-xl border border-surface-border bg-surface-container-lowest shadow-xl md:block">
          <div className="absolute -top-1.5 right-4 h-3 w-3 rotate-45 border-l border-t border-surface-border bg-surface-container-lowest" />
          <div className="flex items-center justify-between border-b border-surface-border bg-surface-bright px-4 py-3">
            <h3 className="mb-0 text-sm font-semibold text-on-surface">Notifications</h3>
            {unreadCount > 0 ? (
              <button className="text-xs font-semibold text-primary-container hover:underline" onClick={handleMarkAllRead} type="button">
                Mark all as read
              </button>
            ) : null}
          </div>
          {renderNotificationList()}
          <div className="border-t border-surface-border bg-surface-bright p-3 text-center">
            <button className="text-xs font-semibold text-primary-container hover:underline" onClick={() => setShowAllNotifications(true)} type="button">
              View all notifications
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderContent = () => {
    if (view === 'appointments') {
      return <DoctorAppointmentsView doctorId={doctorId} onViewAppointment={(appointment) => openAppointmentDetail(appointment, 'appointments')} />;
    }
    if (view === 'patients') {
      return <DoctorPatientsView onViewPatient={handleViewPatient} />;
    }
    if (view === 'prescriptions') {
      return <DoctorPrescriptionsView doctorId={doctorId} onOpenAppointmentById={(appointmentId) => handleOpenAppointmentById(appointmentId, 'prescriptions')} />;
    }
    if (view === 'schedule') {
      return <DoctorScheduleView doctorId={doctorId} />;
    }
    if (view === 'profile') {
      return <DoctorProfileView activeTab={profileTab} doctorData={doctorData} />;
    }
    if (view === PATIENT_DETAIL_VIEW) {
      return <DoctorPatientDetailView onBack={handleBackFromPatient} onOpenAppointmentById={(appointmentId) => handleOpenAppointmentById(appointmentId, PATIENT_DETAIL_VIEW)} patient={selectedPatientSummary} />;
    }
    if (view === APPOINTMENT_DETAIL_VIEW) {
      return (
        <DoctorAppointmentDetail
          appointment={selectedAppointment}
          doctorId={doctorId}
          onBack={handleBackFromAppointment}
          onOpenAppointmentById={(appointmentId) => handleOpenAppointmentById(appointmentId, APPOINTMENT_DETAIL_VIEW)}
          patient={selectedPatient}
        />
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="rounded-lg border border-error-container bg-white p-6 text-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-[Inter] text-text-main">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[240px] flex-col border-r border-surface-border bg-surface-container-lowest py-5 lg:flex">
        <div className="mb-6 flex flex-col items-center px-5 text-center">
          {renderAvatar('h-14 w-14')}
          <h2 className="mb-1 mt-3 text-base font-bold text-text-main">{doctorName}</h2>
          <p className="mb-0 text-sm text-text-muted">{doctorSpecialty}</p>
        </div>

        <div className="mb-5 px-5">
          <div className="flex w-full items-center justify-center gap-2 rounded bg-primary-container px-4 py-2 text-sm font-semibold text-white shadow-sm">
            <span className="h-2 w-2 rounded-full bg-success" />
            Working Status
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">{renderNavigationLinks()}</nav>

        <div className="mt-auto border-t border-surface-border px-3 pt-5">
          <button
            className="flex w-full items-center gap-3 rounded px-4 py-3 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-error"
            onClick={handleLogout}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <aside className="ml-auto h-full w-[300px] max-w-[86vw] bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {renderAvatar('h-11 w-11')}
                <div>
                  <p className="mb-0 text-sm font-bold text-text-main">{doctorName}</p>
                  <p className="mb-0 text-xs text-text-muted">{doctorSpecialty}</p>
                </div>
              </div>
              <button className="rounded p-2 text-on-surface-variant hover:bg-surface-container" onClick={() => setIsMobileMenuOpen(false)} type="button">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {renderNavigationLinks()}
            <button className="mt-8 flex w-full items-center gap-3 rounded px-4 py-3 text-sm font-medium text-error hover:bg-error-container/30" onClick={handleLogout} type="button">
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span>Logout</span>
            </button>
          </aside>
        </div>
      ) : null}

      <div className="min-h-screen lg:ml-[240px]">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-surface-border bg-surface-container-lowest px-4 md:px-5">
          <div className="flex items-center gap-3">
            <button className="rounded p-2 text-on-surface-variant hover:bg-surface-container lg:hidden" onClick={() => setIsMobileMenuOpen(true)} type="button">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <span className="material-symbols-outlined hidden text-primary md:inline-flex">medical_services</span>
            <span className="text-lg font-black text-primary">HealthLink</span>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <label className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-text-muted">search</span>
              <input
                className="h-9 w-64 rounded border border-surface-border bg-surface-container-low py-0 pl-9 pr-4 text-sm text-text-main placeholder:text-text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-container"
                placeholder="Search patients, appointments..."
                type="search"
              />
            </label>
            {renderNotificationBell()}
            {renderAvatar('h-9 w-9')}
            <button className="hidden h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-error md:flex" onClick={handleLogout} type="button">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </header>

        <main className="p-3 pb-20 md:p-5">
          <div className={`mx-auto ${currentNavItem.wide || isDetailView ? 'max-w-[1400px]' : 'max-w-[1120px]'}`}>
            {detailLoading ? (
              <div className="py-16 text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <section className={isDetailView || view === 'schedule' || view === 'appointments' ? '' : 'overflow-hidden rounded-lg border border-surface-border bg-white'}>
                {renderContent()}
              </section>
            )}
          </div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-border bg-white/95 p-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        {renderNavigationLinks(true)}
      </nav>

      {showNotificationDropdown ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:hidden">
          <div className="w-full overflow-hidden rounded-t-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
              <h3 className="mb-0 text-sm font-semibold">Notifications</h3>
              <div className="flex items-center gap-3">
                {unreadCount > 0 ? (
                  <button className="text-xs font-semibold text-primary-container" onClick={handleMarkAllRead} type="button">
                    Mark all read
                  </button>
                ) : null}
                <button className="rounded p-1 text-on-surface-variant" onClick={() => setShowNotificationDropdown(false)} type="button">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            {renderNotificationList()}
          </div>
        </div>
      ) : null}

      {showAllNotifications ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <section className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
              <div>
                <h2 className="mb-0 text-lg font-bold text-text-main">Notifications</h2>
                <p className="mb-0 text-xs text-text-muted">{unreadCount} unread update{unreadCount === 1 ? '' : 's'}</p>
              </div>
              <button className="rounded p-2 text-on-surface-variant hover:bg-surface-container" onClick={() => setShowAllNotifications(false)} type="button">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {renderNotificationList(true)}
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default DoctorDashboardPage;
