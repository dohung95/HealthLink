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

  const renderNavigationLinks = (mobile = false) => (
    <div className={mobile ? 'd-flex gap-1 justify-content-around' : 'd-flex flex-column gap-1'}>
      {NAV_ITEMS.map((item) => {
        const isActive =
          view === item.key ||
          (item.key === 'appointments' && view === APPOINTMENT_DETAIL_VIEW) ||
          (item.key === 'patients' && view === PATIENT_DETAIL_VIEW);

        return (
          <button
            className={
              mobile
                ? `nav-item-mobile ${isActive ? 'nav-item-mobile--active' : ''}`
                : `nav-item-custom ${isActive ? 'nav-item-custom--active' : ''}`
            }
            key={item.key}
            onClick={() => selectView(item.key)}
            type="button"
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  const renderNotificationList = (expanded = false) => (
    <div className={`overflow-y-auto divide-y-surface-border ${expanded ? '' : ''}`} style={{maxHeight:expanded ? '70vh' : '400px'}}>
      {notifications.length === 0 ? (
        <div className="d-flex flex-column align-items-center justify-content-center px-3 py-5 text-center text-text-muted">
          <span className="material-symbols-outlined mb-2 fs-1">notifications_off</span>
          <p className="mb-0 small fw-semibold">No notifications</p>
          <p className="mb-0 text-xs">Updates about appointments and wallet activity will appear here.</p>
        </div>
      ) : (
        notifications.map((notification) => {
          const tone = getNotificationTone(notification);

          return (
            <article
              className={`d-flex gap-3 p-3 transition-base hover:bg-surface-container-low ${!notification.isRead ? 'bg-primary-fixed' : 'bg-white'}`}
              key={notification.notificationId}
            >
              <div className={`d-flex align-items-center justify-content-center rounded-circle shrink-0 ${tone.bg}`} style={{width:'2.5rem',height:'2.5rem'}}>
                <span className={`material-symbols-outlined ${tone.accent}`}>{tone.icon}</span>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <p className={`mb-0 small fw-semibold ${tone.accent === 'text-critical' ? 'text-critical' : 'text-on-surface'}`}>
                    {notification.title || tone.title}
                  </p>
                  {!notification.isRead ? <span className="d-inline-block bg-primary-container rounded-circle" style={{width:'0.5rem',height:'0.5rem',marginTop:'0.375rem'}} /> : null}
                </div>
                <p className="mb-0 whitespace-pre-line text-xs leading-5 text-text-muted">{notification.message}</p>
                <div className="d-flex align-items-center justify-content-between gap-3 pt-1">
                  <span className="text-[11px] text-text-muted">{formatNotificationTime(notification.createdAt)}</span>
                  {(notification.appointmentId || notification.actionUrl) ? (
                    <button
                      className="text-xs fw-semibold text-primary-container hover:underline border-0 bg-transparent p-0"
                      onClick={() => handleNotificationClick(notification)}
                      type="button"
                    >
                      View Detail
                    </button>
                  ) : (
                    <button
                      className="text-xs fw-semibold text-primary-container hover:underline border-0 bg-transparent p-0"
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
    <div className="position-relative" ref={notificationRef}>
      <button
        aria-label="Open notifications"
        className="notification-bell-btn"
        onClick={() => setShowNotificationDropdown((current) => !current)}
        type="button"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 ? (
          <span className="notification-bell-dot" />
        ) : null}
      </button>

      {showNotificationDropdown ? (
        <div className="notification-dropdown-desktop d-none d-md-block">
          <div className="notification-dropdown-arrow" />
          <div className="d-flex align-items-center justify-content-between border-bottom px-3 py-3" style={{borderColor:'var(--border-light)'}}>
            <h3 className="mb-0 small fw-semibold">Notifications</h3>
            {unreadCount > 0 ? (
              <button className="text-xs fw-semibold border-0 bg-transparent" style={{color:'var(--primary)'}} onClick={handleMarkAllRead} type="button">
                Mark all as read
              </button>
            ) : null}
          </div>
          {renderNotificationList()}
          <div className="border-top p-3 text-center" style={{borderColor:'var(--border-light)'}}>
            <button className="text-xs fw-semibold border-0 bg-transparent" style={{color:'var(--primary)'}} onClick={() => setShowAllNotifications(true)} type="button">
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
      <div className="d-flex min-vh-100 align-items-center justify-content-center bg-background">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center bg-background p-4">
        <div className="rounded-3 border border-error-container bg-white p-4 text-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-background text-text-main">
      <aside className="doctor-sidebar position-fixed top-0 start-0 z-40 d-none d-lg-flex flex-column border-end border-surface-border bg-surface-container-lowest py-4 min-vh-100" style={{width:'240px'}}>
        <div className="doctor-sidebar-header text-center px-4">
          <div className="d-flex flex-column align-items-center">
            <span className="material-symbols-outlined" style={{fontSize:'3rem',color:'var(--color-primary,#0052cc)'}}>medical_services</span>
            <span className="fs-5 fw-bold" style={{color:'var(--color-primary,#0052cc)'}}>HealthLink</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 mt-4">{renderNavigationLinks()}</nav>
      </aside>

      {isMobileMenuOpen ? (
        <div className="position-fixed inset-0 z-50 bg-black/40 d-lg-none" onClick={() => setIsMobileMenuOpen(false)}>
          <aside className="doctor-mobile-sidebar ms-auto h-100 shadow-lg bg-white p-4" style={{width:'300px',maxWidth:'86vw'}} onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <span className="material-symbols-outlined" style={{fontSize:'2rem',color:'var(--color-primary,#0052cc)'}}>medical_services</span>
                <span className="fs-5 fw-bold" style={{color:'var(--color-primary,#0052cc)'}}>HealthLink</span>
              </div>
              <button className="doctor-mobile-close rounded-3 p-2 text-on-surface-variant hover:bg-surface-container border-0 bg-transparent" onClick={() => setIsMobileMenuOpen(false)} type="button">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {renderNavigationLinks()}
          </aside>
        </div>
      ) : null}

      <div className="doctor-main-area min-vh-100" style={{paddingLeft:'240px'}}>
        <header className="doctor-header sticky-top z-30 d-flex align-items-center justify-content-between px-5" style={{paddingRight:'3rem'}}>
          <div className="d-flex align-items-center gap-3">
            <button className="rounded-3 p-2 text-on-surface-variant hover:bg-surface-container d-lg-none border-0 bg-transparent" onClick={() => setIsMobileMenuOpen(true)} type="button">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>

          <div className="d-flex align-items-center gap-0 ms-auto">
            <div className="d-flex align-items-center gap-3 pe-3">
              {renderNotificationBell()}
              <div className="shrink-0 overflow-hidden rounded-circle border border-surface-border bg-primary-fixed text-primary d-flex align-items-center justify-content-center fw-bold" style={{width:'2.75rem',height:'2.75rem',fontSize:'1rem'}}>
                {doctorData?.avatarUrl || doctorData?.profileImage || doctorData?.imageUrl ? (
                  <img alt="Doctor" className="object-fit-cover w-100 h-100" src={doctorData?.avatarUrl || doctorData?.profileImage || doctorData?.imageUrl} />
                ) : (
                  <span>{(doctorData?.fullName || 'DR').split(' ').filter(Boolean).slice(0,2).map(p => p[0]?.toUpperCase()).join('')}</span>
                )}
              </div>
            </div>
            <div className="border-end me-3" style={{height:'1.5rem',borderColor:'var(--border-light)',borderWidth:'1px'}} />
            <button className="doctor-header-logout d-none d-md-flex align-items-center justify-content-center rounded-3 text-on-surface-variant border-0 bg-transparent" onClick={handleLogout} type="button" title="Logout">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </header>

        <main className="doctor-main-content p-3 pb-5 p-md-4">
          <div className={`mx-auto ${currentNavItem.wide || isDetailView ? '' : ''}`} style={{maxWidth:currentNavItem.wide || isDetailView ? '1400px' : '1120px'}}>
            {detailLoading ? (
              <div className="py-5 text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <section className={`doctor-content-section ${isDetailView || view === 'schedule' || view === 'appointments' ? '' : 'card-section'}`}>
                {renderContent()}
              </section>
            )}
          </div>
        </main>
      </div>

      <nav className="doctor-bottom-nav position-fixed bottom-0 start-0 end-0 z-40 d-lg-none">
        {renderNavigationLinks(true)}
      </nav>

      {showNotificationDropdown ? (
        <div className="position-fixed inset-0 z-50 d-flex align-items-end bg-black/40 d-md-none" onClick={() => setShowNotificationDropdown(false)}>
          <div className="w-100 overflow-hidden bg-white shadow-lg" style={{borderRadius:'1rem 1rem 0 0',animation:'slideUp 0.25s ease'}} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-between px-3 py-3 border-bottom">
              <h3 className="mb-0 small fw-semibold">Notifications</h3>
              <div className="d-flex align-items-center gap-3">
                {unreadCount > 0 ? (
                  <button className="text-xs fw-semibold border-0 bg-transparent" style={{color:'var(--primary)'}} onClick={handleMarkAllRead} type="button">
                    Mark all read
                  </button>
                ) : null}
                <button className="rounded-3 p-1 border-0 bg-transparent" style={{color:'var(--text-muted)'}} onClick={() => setShowNotificationDropdown(false)} type="button">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            {renderNotificationList()}
          </div>
        </div>
      ) : null}

      {showAllNotifications ? (
        <div className="position-fixed inset-0 z-\[60\] d-flex align-items-center justify-content-center bg-black/40 p-3">
          <section className="d-flex flex-column overflow-hidden rounded-4 bg-white shadow-lg" style={{maxHeight:'88vh',maxWidth:'42rem',width:'100%'}}>
            <div className="d-flex align-items-center justify-content-between border-bottom border-surface-border px-4 py-3">
              <div>
                <h2 className="mb-0 fs-5 fw-bold text-text-main">Notifications</h2>
                <p className="mb-0 text-xs text-text-muted">{unreadCount} unread update{unreadCount === 1 ? '' : 's'}</p>
              </div>
              <button className="rounded-3 p-2 text-on-surface-variant hover:bg-surface-container border-0 bg-transparent" onClick={() => setShowAllNotifications(false)} type="button">
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
