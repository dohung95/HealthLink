import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doctorService } from '../../api/doctorApi';
import { appointmentService } from '../../api/appointmentApi';
import { notificationApi } from '../../api/notificationApi';
import signalRService from '../../services/signalrService';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../components/doctor/Css/DoctorDashboard.css';
import DoctorAppointmentDetail from '../../components/doctor/pages/appointment/appointmentDetail/DoctorAppointmentDetail';
import DoctorAppointmentsView from '../../components/doctor/pages/appointment/DoctorAppointmentsView';
import DoctorPatientDetailView from '../../components/doctor/pages/patient/DoctorPatientDetailView';
import DoctorPatientsView from '../../components/doctor/pages/patient/DoctorPatientsView';
import DoctorPrescriptionsView from '../../components/doctor/pages/prescription/DoctorPrescriptionsView';
import DoctorProfileView from '../../components/doctor/pages/profile/DoctorProfileView';
import DoctorScheduleView from '../../components/doctor/pages/schedule/DoctorScheduleView';
import DoctorLayout from '../../components/doctor/layout/DoctorLayout';
import { useNotifications } from '../../components/doctor/layout/useNotifications';
import { NAV_ITEMS, APPOINTMENT_DETAIL_VIEW, PATIENT_DETAIL_VIEW, normalizeAppointmentDetail } from '../../components/doctor/layout/navigationConfig';

const DoctorDashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [appointmentsRefreshKey, setAppointmentsRefreshKey] = useState(0);
  const seenNotificationIds = useRef(new Set());

  const doctorId = doctorData?.doctorID || doctorData?.doctorId;
  const isDetailView = view === APPOINTMENT_DETAIL_VIEW || view === PATIENT_DETAIL_VIEW;

  const currentNavItem = useMemo(() => {
    if (view === APPOINTMENT_DETAIL_VIEW) return NAV_ITEMS[0];
    if (view === PATIENT_DETAIL_VIEW) return NAV_ITEMS[1];
    return NAV_ITEMS.find((item) => item.key === view) || NAV_ITEMS[0];
  }, [view]);

  const handleNavigateToAppointment = useCallback(async (notification) => {
    try {
      if (notification.type === 'WALLET_BALANCE_CHANGED' || notification.actionUrl === '/profile-doctor?tab=wallet') {
        navigate('/doctor-page?tab=wallet');
        return;
      }
      if (notification.appointmentId) {
        setDetailLoading(true);
        const detail = await appointmentService.getAppointmentDetail(notification.appointmentId);
        const normalizedAppointment = normalizeAppointmentDetail(detail, notification.appointmentId);
        const patientId = normalizedAppointment.patient?.patientID || normalizedAppointment.patientId;
        const patientData = patientId ? await doctorService.getPatientById(patientId) : null;
        setSelectedAppointment(normalizedAppointment);
        setSelectedPatient(patientData);
        setDetailReturnView('appointments');
        setView(APPOINTMENT_DETAIL_VIEW);
        setDetailLoading(false);
      }
    } catch (err) {
      console.error('Error navigating notification:', err);
      setDetailLoading(false);
      alert('Failed to load notification target');
    }
  }, [navigate]);

  const notificationsHook = useNotifications({ onNavigateToAppointment: handleNavigateToAppointment });

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
      const handleAppointmentNotification = (notification) => {
        const nid = notification?.notificationId ?? notification?.notificationID;
        if (nid && seenNotificationIds.current.has(nid)) return;
        if (nid) seenNotificationIds.current.add(nid);
        notificationsHook.fetchNotifications();
        if (notification.type === 'NEW_APPOINTMENT') {
          setAppointmentsRefreshKey((prev) => prev + 1);
        }
      };
      signalRService.on('ReceiveAppointmentNotification', handleAppointmentNotification);
      await signalRService.startConnection();
    };
    initSignalR();
    return () => {
      signalRService.off('ReceiveAppointmentNotification');
    };
  }, [notificationsHook.fetchNotifications]);

  const reconcileNotificationsDebounced = useRef(null);

  useEffect(() => {
    const debounce = (fn, wait = 2000) => {
      let t = null;
      return (...args) => {
        if (t) clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
      };
    };
    reconcileNotificationsDebounced.current = debounce(() => {
      if (document.visibilityState === 'visible') {
        notificationsHook.fetchNotifications();
      }
    }, 2000);

    const genericHandler = (notification) => {
      console.debug('[WS] Generic notification received on doctor dashboard:', notification);
      const nid = notification?.notificationId ?? notification?.notificationID;
      if (nid && seenNotificationIds.current.has(nid)) return;
      if (nid) seenNotificationIds.current.add(nid);
      notificationsHook.fetchNotifications();
      reconcileNotificationsDebounced.current();
    };
    signalRService.on('ReceiveNotification', genericHandler);
    return () => {
      signalRService.off('ReceiveNotification', genericHandler);
    };
  }, [notificationsHook.fetchNotifications]);

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
      const patientId = appointment?.patient?.patientID || appointment?.patient?.patientId || appointment?.patientId || appointment?.patientID;
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

  const renderContent = () => {
    if (detailLoading) {
      return (
        <div className="py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      );
    }
    if (view === 'appointments') {
      return <DoctorAppointmentsView doctorId={doctorId} onViewAppointment={(appointment) => openAppointmentDetail(appointment, 'appointments')} refreshKey={appointmentsRefreshKey} />;
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
        <div className="rounded-3 border border-error-container bg-white p-4 text-error" role="alert">{error}</div>
      </div>
    );
  }

  return (
    <DoctorLayout
      doctorData={doctorData}
      currentNavItem={currentNavItem}
      isDetailView={isDetailView}
      isMobileMenuOpen={isMobileMenuOpen}
      showAllNotifications={notificationsHook.showAllNotifications}
      notifications={notificationsHook.notifications}
      unreadCount={notificationsHook.unreadCount}
      showNotificationDropdown={notificationsHook.showNotificationDropdown}
      notificationRef={notificationsHook.notificationRef}
      onNavigate={(key) => selectView(key)}
      onLogout={handleLogout}
      onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      onToggleNotificationDropdown={() => notificationsHook.setShowNotificationDropdown((prev) => !prev)}
      onNotificationClick={notificationsHook.handleNotificationClick}
      onMarkAllRead={notificationsHook.handleMarkAllRead}
      onCloseAllNotifications={() => notificationsHook.setShowAllNotifications(true)}
    >
      <section className={`doctor-content-section ${isDetailView || view === 'schedule' || view === 'appointments' ? '' : 'card-section'}`}>
        {renderContent()}
      </section>
    </DoctorLayout>
  );
};

export default DoctorDashboardPage;