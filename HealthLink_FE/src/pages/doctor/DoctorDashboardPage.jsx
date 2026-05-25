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
    icon: 'calendar_month',
    title: 'Appointments',
    description: 'Review and manage your daily consultation schedule.',
    wide: true,
  },
  {
    key: 'patients',
    label: 'Patients',
    icon: 'group',
    title: 'Patients',
    description: 'Review patients connected to your appointments.',
    wide: true,
  },
  {
    key: 'prescriptions',
    label: 'Prescriptions',
    icon: 'medication',
    title: 'Prescriptions',
    description: 'Browse issued prescriptions and related appointments.',
    wide: true,
  },
  {
    key: 'schedule',
    label: 'Schedule',
    icon: 'event_available',
    title: 'Working Schedule',
    description: 'Review your configured consultation shifts.',
    wide: true,
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'person',
    title: 'Doctor Profile',
    description: 'Manage your personal information and wallet.',
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
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const doctorId = doctorData?.doctorID || doctorData?.doctorId;
  const currentNavItem = useMemo(
    () => NAV_ITEMS.find((item) => item.key === view) || NAV_ITEMS[0],
    [view],
  );

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
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleProfileTabChange = (tab) => {
    setProfileTab(tab);
    navigate(tab === 'wallet' ? '/doctor-page?tab=wallet' : '/doctor-page', { replace: true });
  };

  const selectView = (nextView) => {
    setView(nextView);
    setIsMobileMenuOpen(false);
    if (nextView !== 'profile') {
      setProfileTab('personal');
      navigate('/doctor-page', { replace: true });
    }
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

  const handleViewAppointment = (appointment) => {
    openAppointmentDetail(appointment, 'appointments');
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
      setDetailReturnView(
        returnView === APPOINTMENT_DETAIL_VIEW ? 'appointments' : returnView,
      );
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

  const renderNavigationLinks = () => (
    <div className="d-flex flex-column gap-2 pt-4">
      {NAV_ITEMS.map((item) => {
        const isActive =
          view === item.key ||
          (item.key === 'appointments' && view === APPOINTMENT_DETAIL_VIEW) ||
          (item.key === 'patients' && view === PATIENT_DETAIL_VIEW);

        return (
          <a
            className={`nav-link-custom ${isActive ? 'nav-link-active' : ''}`}
            href="#"
            key={item.key}
            onClick={(event) => {
              event.preventDefault();
              selectView(item.key);
            }}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <p className="mb-0 small fw-bold">{item.label}</p>
          </a>
        );
      })}
    </div>
  );

  const renderNotificationList = () => (
    <div className="notification-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
      {notifications.length === 0 ? (
        <div className="text-center py-4 text-muted">
          <span className="material-symbols-outlined fs-1">notifications_off</span>
          <p className="mb-0 mt-2">No notifications</p>
        </div>
      ) : (
        notifications.map((notification) => (
          <div
            className={`notification-item p-3 border-bottom ${!notification.isRead ? 'bg-light notification-new-pulse' : ''}`}
            key={notification.notificationId}
            onClick={() => handleNotificationClick(notification)}
            style={{ cursor: 'pointer' }}
          >
            <div className="d-flex gap-2">
              <span className="material-symbols-outlined text-primary">calendar_month</span>
              <div className="flex-grow-1">
                <p className="mb-1 small" style={{ whiteSpace: 'pre-line' }}>
                  {notification.message}
                </p>
                <small className="text-muted">
                  {new Date(notification.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </small>
              </div>
              {!notification.isRead ? (
                <span className="badge bg-primary rounded-circle" style={{ width: '8px', height: '8px' }}></span>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderNotificationBell = (withRef = false) => (
    <div className="position-relative" ref={withRef ? notificationRef : null}>
      <button
        className="btn btn-link p-0 position-relative"
        onClick={() => setShowNotificationDropdown((current) => !current)}
        type="button"
      >
        <span className={`material-symbols-outlined fs-4 text-dark ${unreadCount > 0 ? 'notification-bell-pulse' : ''}`}>
          notifications
        </span>
        {unreadCount > 0 ? (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
            {unreadCount}
          </span>
        ) : null}
      </button>

      {withRef && showNotificationDropdown ? (
        <div className="notification-dropdown position-absolute mt-2 shadow-lg" style={{ zIndex: 1050, width: '340px', right: 0, left: 'auto' }}>
          <div className="bg-white rounded-3 overflow-hidden">
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
              <h6 className="mb-0 fw-bold">Notifications</h6>
              {unreadCount > 0 ? (
                <button
                  className="btn btn-link btn-sm p-0 text-primary"
                  onClick={async () => {
                    await notificationApi.markAllAsRead();
                    fetchNotifications();
                  }}
                  type="button"
                >
                  Mark all read
                </button>
              ) : null}
            </div>
            {renderNotificationList()}
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderSidebarHeader = (withDesktopDropdown = false) => (
    <>
      <div className="d-flex gap-3 align-items-center">
        <div className="doctor-profile-img"></div>
        <div className="d-flex flex-column">
          <h1 className="fs-6 fw-bold mb-0 text-dark">
            {doctorData?.fullName || 'Loading...'}
          </h1>
          <p className="text-secondary small mb-0">{doctorData?.specialty || 'Specialty'}</p>
        </div>
      </div>
      <div className="d-flex align-items-center justify-content-between">
        <span className="status-badge">
          <span className="status-dot"></span>
          Working
        </span>
        {renderNotificationBell(withDesktopDropdown)}
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  const isDetailView = view === APPOINTMENT_DETAIL_VIEW || view === PATIENT_DETAIL_VIEW;
  const isWideView = isDetailView || currentNavItem.wide;

  return (
    <div className="d-flex min-vh-100">
      <button
        aria-label="Toggle menu"
        className="burger-menu-btn d-lg-none"
        onClick={() => setIsMobileMenuOpen((current) => !current)}
        type="button"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      {isMobileMenuOpen ? (
        <div
          className="mobile-sidebar-overlay d-lg-none"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      ) : null}

      <aside className="sidebar sidebar-desktop d-none d-lg-flex flex-column">
        <div className="d-flex flex-column gap-4">
          {renderSidebarHeader(true)}
          {renderNavigationLinks()}
        </div>
        <div className="d-flex flex-column gap-4 mt-auto">
          <a className="nav-link-custom logout-link" href="#" onClick={(event) => { event.preventDefault(); handleLogout(); }}>
            <span className="material-symbols-outlined">logout</span>
            <p className="mb-0 small">Logout</p>
          </a>
        </div>
      </aside>

      <aside className={`sidebar sidebar-mobile d-lg-none ${isMobileMenuOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="d-flex flex-column gap-4 h-100">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">Menu</h5>
            <button
              aria-label="Close menu"
              className="btn btn-link p-0 text-dark"
              onClick={() => setIsMobileMenuOpen(false)}
              type="button"
            >
              <span className="material-symbols-outlined fs-4">close</span>
            </button>
          </div>

          {renderSidebarHeader(false)}
          {renderNavigationLinks()}

          <div className="d-flex flex-column gap-4 mt-auto">
            <a className="nav-link-custom logout-link" href="#" onClick={(event) => { event.preventDefault(); handleLogout(); }}>
              <span className="material-symbols-outlined">logout</span>
              <p className="mb-0 small">Logout</p>
            </a>
          </div>
        </div>
      </aside>

      <main className="flex-grow-1 p-5">
        <div className="container-fluid p-0">
          <div className="mx-auto" style={{ maxWidth: isWideView ? '1280px' : '960px' }}>
            {!isDetailView ? (
              <div className="mb-4">
                <h2 className="fs-3 fw-bold mb-1 text-dark">{currentNavItem.title}</h2>
                <p className="text-secondary mb-0">{currentNavItem.description}</p>
              </div>
            ) : null}

            {detailLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <div className={isDetailView ? '' : 'bg-custom-white info-card'}>
                {view === 'appointments' ? (
                  <DoctorAppointmentsView
                    doctorId={doctorId}
                    onViewAppointment={handleViewAppointment}
                  />
                ) : null}
                {view === 'patients' ? (
                  <DoctorPatientsView onViewPatient={handleViewPatient} />
                ) : null}
                {view === 'prescriptions' ? (
                  <DoctorPrescriptionsView
                    doctorId={doctorId}
                    onOpenAppointmentById={(appointmentId) => handleOpenAppointmentById(appointmentId, 'prescriptions')}
                  />
                ) : null}
                {view === 'schedule' ? (
                  <DoctorScheduleView doctorId={doctorId} />
                ) : null}
                {view === 'profile' ? (
                  <DoctorProfileView
                    activeTab={profileTab}
                    doctorData={doctorData}
                    onTabChange={handleProfileTabChange}
                  />
                ) : null}
                {view === PATIENT_DETAIL_VIEW ? (
                  <DoctorPatientDetailView
                    onBack={handleBackFromPatient}
                    onOpenAppointmentById={(appointmentId) => handleOpenAppointmentById(appointmentId, PATIENT_DETAIL_VIEW)}
                    patient={selectedPatientSummary}
                  />
                ) : null}
                {view === APPOINTMENT_DETAIL_VIEW ? (
                  <DoctorAppointmentDetail
                    appointment={selectedAppointment}
                    doctorId={doctorId}
                    onBack={handleBackFromAppointment}
                    onOpenAppointmentById={(appointmentId) => handleOpenAppointmentById(appointmentId, APPOINTMENT_DETAIL_VIEW)}
                    patient={selectedPatient}
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>
      </main>

      {showNotificationDropdown ? (
        <div className="mobile-notification-modal d-lg-none">
          <div
            className="mobile-notification-backdrop"
            onClick={() => setShowNotificationDropdown(false)}
          />
          <div className="mobile-notification-content bg-white">
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
              <h6 className="mb-0 fw-bold">Notifications</h6>
              <div className="d-flex align-items-center gap-2">
                {unreadCount > 0 ? (
                  <button
                    className="btn btn-link btn-sm p-0 text-primary"
                    onClick={async () => {
                      await notificationApi.markAllAsRead();
                      fetchNotifications();
                    }}
                    type="button"
                  >
                    Mark all read
                  </button>
                ) : null}
                <button
                  aria-label="Close notifications"
                  className="btn btn-link btn-sm p-0 text-dark"
                  onClick={() => setShowNotificationDropdown(false)}
                  type="button"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            {renderNotificationList()}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DoctorDashboardPage;
