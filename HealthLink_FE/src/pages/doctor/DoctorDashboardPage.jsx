import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { doctorService } from '@api/doctorApi';
import { appointmentService } from '@api/appointmentApi';
import signalRService from '@services/signalrService';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@components/Css/doctor/doctor-dashboard/doctor-dashboard.css';
import DoctorAppointmentDetail from '@pages/doctor/appointment/appointmentDetail/DoctorAppointmentDetail';
import DoctorPatientDetailView from '@pages/doctor/patient/DoctorPatientDetailView';
import DoctorLayout from '@layouts/DoctorLayout';
import { DoctorSkeletonPage } from '@components/doctor/DoctorSkeleton';
import DoctorErrorState from '@components/doctor/DoctorErrorState';
import { useNotifications } from '@hooks/doctor/useNotifications';
import { NAV_ITEMS, normalizeAppointmentDetail } from '@layouts/navigationConfig';

export function DoctorAppointmentDetailRoute() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { doctorId } = useOutletContext();
  const [appointment, setAppointment] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const detail = await appointmentService.getAppointmentDetail(appointmentId);
        const normalized = normalizeAppointmentDetail(detail, appointmentId);
        const patientId = normalized.patient?.patientID || normalized.patientId;
        const patientData = patientId ? await doctorService.getPatientById(patientId) : null;
        if (mounted) {
          setAppointment(normalized);
          setPatient(patientData);
        }
      } catch (err) {
        console.error('Error loading appointment detail:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (appointmentId) load();
    return () => { mounted = false; };
  }, [appointmentId, location.state?.notificationOpenedAt]);

  if (loading) {
    return <DoctorSkeletonPage />;
  }

  return (
    <DoctorAppointmentDetail
      appointment={appointment}
      patient={patient}
      doctorId={doctorId}
      onBack={() => navigate('/doctor')}
      onOpenAppointmentById={(id) => navigate(`/doctor/appointments/${id}`)}
    />
  );
}

export function DoctorPatientDetailRoute() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await doctorService.getPatientById(patientId);
        if (mounted) setPatient(data);
      } catch (err) {
        console.error('Error loading patient detail:', err);
      }
    };
    if (patientId) load();
    return () => { mounted = false; };
  }, [patientId]);

  if (!patient) {
    return <DoctorSkeletonPage />;
  }

  return (
    <DoctorPatientDetailView
      patient={patient}
      onBack={() => navigate('/doctor/patients')}
      onOpenAppointmentById={(id) => navigate(`/doctor/appointments/${id}`)}
    />
  );
}

const DoctorDashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const [doctorData, setDoctorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [appointmentsRefreshKey, setAppointmentsRefreshKey] = useState(0);
  const seenNotificationIds = useRef(new Set());

  const doctorId = doctorData?.doctorID || doctorData?.doctorId;

  const currentNavItem = useMemo(() => {
    const path = location.pathname;
    if (path === '/doctor' || path.startsWith('/doctor/appointments')) return NAV_ITEMS[0];
    if (path.startsWith('/doctor/patients')) return NAV_ITEMS[1];
    if (path.startsWith('/doctor/prescriptions')) return NAV_ITEMS[2];
    if (path.startsWith('/doctor/reviews')) return NAV_ITEMS[3];
    if (path.startsWith('/doctor/schedule')) return NAV_ITEMS[4];
    if (path.startsWith('/doctor/chat')) return NAV_ITEMS[5];
    if (path.startsWith('/doctor/profile')) return NAV_ITEMS[6];
    return NAV_ITEMS[0];
  }, [location.pathname]);

  const isDetailView = useMemo(() => {
    return /\/doctor\/(appointments|patients)\/[\w-]+/.test(location.pathname);
  }, [location.pathname]);

  const resolveAppointmentId = (notification) => {
    const id = notification.appointmentId ?? notification.appointmentID ?? notification.relatedId;
    if (id) return id;
    const match = (notification.actionUrl || '').match(/\/appointments\/(\d+)/);
    return match ? match[1] : null;
  };

  const handleNavigateToAppointment = useCallback(async (notification) => {
    try {
      if (notification.type === 'WALLET_BALANCE_CHANGED' || notification.actionUrl === '/profile-doctor?tab=wallet') {
        navigate('/doctor/profile?tab=wallet');
        return;
      }
      if (notification.type === 'NEW_REVIEW') {
        navigate('/doctor/reviews');
        return;
      }
      const appointmentId = resolveAppointmentId(notification);
      if (appointmentId) {
        navigate(`/doctor/appointments/${appointmentId}`, {
          state: { notificationOpenedAt: Date.now() },
        });
      }
    } catch (err) {
      console.error('Error navigating notification:', err);
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

  const selectView = (key) => {
    setIsMobileMenuOpen(false);
    if (key === 'appointments') {
      navigate('/doctor');
    } else {
      navigate(`/doctor/${key}`);
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

  const contextValue = useMemo(() => ({
    doctorData,
    doctorId,
    appointmentsRefreshKey,
  }), [doctorData, doctorId, appointmentsRefreshKey]);

  if (loading) {
    return <DoctorSkeletonPage />;
  }

  if (error) {
    return (
      <div className="d-flex doctor-viewport align-items-center justify-content-center" style={{ background: 'var(--doctor-bg)' }}>
        <DoctorErrorState message={error} onRetry={fetchDoctorData} />
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
      <section className={`doctor-content-section ${isDetailView || currentNavItem?.key === 'schedule' || currentNavItem?.key === 'appointments' || currentNavItem?.key === 'patients' ? '' : 'card-section'}`}>
        <Outlet context={contextValue} />
      </section>
    </DoctorLayout>
  );
};

export default DoctorDashboardPage;