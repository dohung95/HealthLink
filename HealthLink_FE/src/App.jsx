// src/App.js
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';

// ---------------------------------------------import file----------------------------------------------------------
import { useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Home from './components/Home';
import Schedule from './components/patient-dashboard/Schedule';
import MyAppointments from './components/MyAppointment';
import Doctors from './components/DoctorsList';
import Records from './components/Records';
import Video from './components/Video';

import Chat from './components/Chat';


import ProfilePatient from './pages/profilePatient';

import Admin from './components/Admin/View/Admin';
import Patients from './components/Admin/View/Patients';
import AdminDoctors from './components/Admin/View/Doctors';
import PharmacyManagement from './components/Admin/View/PharmacyManagement';
import CommissionManagement from './components/Admin/View/CommissionManagement';
import Appointments from './components/Admin/View/Appointments';
import Registrations from './components/Admin/View/Registrations';
import ScheduleAuditLog from './components/Admin/View/ScheduleAuditLog';
import ScheduleComplianceDashboard from './components/Admin/View/ScheduleComplianceDashboard';
import ScheduleChangeRequests from './components/Admin/View/ScheduleChangeRequests';
import FinancialReports from './components/Admin/View/FinancialReports';
import ReviewManagement from './components/Admin/View/ReviewManagement';

import Sign_in from './components/Auth/Sign_in';
import Sign_up from './components/Auth/Sign_up';
import ConfirmEmail from './components/Auth/ConfirmEmail';
import RegistrationChoice from './components/Auth/RegistrationChoice';
import DoctorRegistration from './components/Auth/DoctorRegistration';
import PharmacyRegistration from './components/Auth/PharmacyRegistration';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';

import Footer from './components/Footer';

import ContactUs from './components/ContactUs';
import AboutUs from './components/AboutUs';
import './App.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import ScrollToTop from './components/ScrollToTop';
import { ChatProvider } from './context/ChatContext';
import { NotificationProvider } from './context/NotificationContext';
import VideocallPage from './pages/video-calling';
import IncomingCallModal from './components/IncomingCallModal';
import NotificationToastBridge from './components/notifications/NotificationToastBridge';
import PrescriptionNotificationModal from './components/PrescriptionNotificationModal';
import AdminActionNotificationModal from './components/AdminActionNotificationModal';
import HomeVisitProposalModal from './components/consultation/HomeVisitProposalModal';
import HomeVisitProposalResultModal from './components/consultation/HomeVisitProposalResultModal';
import Navbar from './components/Navbar';
import DoctorPublicProfilePage from './pages/doctor/DoctorPublicProfilePage';
import PatientPrescriptionView from './components/PatientPrescriptionView';
import PatientPharmacyPage from './components/patient-dashboard/PatientPharmacyPage';

import DoctorDashboardPage, {
  DoctorAppointmentDetailRoute,
} from './pages/doctor/DoctorDashboardPage';
import DoctorAppointmentsView from './pages/doctor/appointment/DoctorAppointmentsView';
import DoctorPatientsView from './pages/doctor/patient/DoctorPatientsView';
import DoctorPrescriptionsView from './pages/doctor/prescription/DoctorPrescriptionsView';
import DoctorScheduleView from './pages/doctor/schedule/DoctorScheduleView';
import DoctorWalletPage from './pages/doctor/DoctorWalletPage';
import DoctorProfilePage from './pages/doctor/DoctorProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import ExcludeRolesRoute from './components/ExcludeRolesRoute';

import AdminRoute from './components/Admin/AdminRoute';
import HealthRecords from './components/HealthRecords';
import ShareHealthRecords from './components/ShareHealthRecords';
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import { Toaster } from 'sonner';
import PatientDashboard from './pages/PatientDashboard';
import PatientDashboardHome from './components/patient-dashboard/PatientDashboardHome';
import NotFound from './pages/NotFound';
import PharmacyDashboardPage from './pages/pharmacy/PharmacyDashboardPage';
import ChatPage from './components/ChatPage';
//-----------------------------------------------------------------------------------------------

function App() {
  return (
    <ChatProvider>
      <NotificationProvider>
        <Router>
          <AppContent />
        </Router>
      </NotificationProvider>
    </ChatProvider>
  );
}

// Tạo component mới để có thể dùng useLocation

function PharmacyOrderRedirect() {
  const { orderId } = useParams();
  return <Navigate to={`/patient-dashboard/pharmacy/orders/${orderId}`} replace />;
}

function AppContent() {
  const navigate = useNavigate();
  const { isAuthenticated, roles } = useAuth();
  const location = useLocation();
  const isVideoCallPage = location.pathname === '/video-calling';
  const isDoctorPage = location.pathname === '/doctor' || location.pathname.startsWith('/doctor/');
  const isLoginPage = location.pathname === '/login';
  const isAdminPage = location.pathname.startsWith('/admin');
  const isPatientDashboard = location.pathname.startsWith('/patient-dashboard');
  const isPharmacyDashboard = location.pathname.startsWith('/pharmacy-page');
  const isPharmacyChatPage = location.pathname === '/pharmacy-page/chat';
  const isSchedulePage = location.pathname === '/schedule' || location.pathname.startsWith('/book/');
  const isResetPasswordPage = location.pathname === '/reset-password';

  // list trang bị chặn sau khi login
  const publicPaths = [
    '/',
    '/contact_us',
    '/about_us',
    '/login',
    '/register',
    '/register-as',
    '/register/doctor',
    '/register/pharmacy',
    '/doctors',
    '/schedule'
  ];

  // Danh sách tất cả các path hợp lệ để xác định trang 404
  const allValidPaths = [
    ...publicPaths,
    '/confirm-email',
    '/forgot-password',
    '/reset-password',
    '/video-calling',
    '/health-records',
    '/share-records',
    '/profile-patient',
    '/profile-pharmacy',
    '/doctor',
    '/patient-dashboard',
    '/pharmacy-page',
    '/admin',
    '/my-appointments',
    '/my-consultations',
    '/records',
    '/video',
    '/payment'
  ];

  const isKnownPath = allValidPaths.some(path =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  ) || location.pathname.startsWith('/book/');

  const is404Page = !isKnownPath;

  // Don't show navbar/footer on video call, doctor page, admin page, login page, or 404 page
  const hideLayout = isVideoCallPage || isDoctorPage || isAdminPage || isPatientDashboard || isPharmacyDashboard || isSchedulePage || isResetPasswordPage || is404Page;

  useEffect(() => {
    if (isAuthenticated && publicPaths.includes(location.pathname)) {
      const pendingRedirect =
        location.state?.redirectTo ||
        sessionStorage.getItem('postLoginRedirect');

      if (
        location.pathname === '/login' &&
        pendingRedirect &&
        pendingRedirect.startsWith('/patient-dashboard')
      ) {
        return;
      }

      // Nếu đang ở /schedule (có thể có ?specialty=...), không redirect để giữ nguyên luồng đặt lịch từ chatbot
      if (location.pathname === '/schedule') {
        return;
      }

      const userRoles = roles.map(r => r.toLowerCase());

      if (userRoles.includes('admin')) {
        navigate('/admin', { replace: true });
      } else if (userRoles.includes('doctor')) {
        navigate('/doctor', { replace: true });
      } else if (userRoles.includes('pharmacy')) {
        navigate('/pharmacy-page', { replace: true });
      } else if (userRoles.includes('patient')) {
        navigate('/patient-dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, roles, location.pathname, navigate]);

  return (
    <>
      <Toaster position="top-right" richColors />
      <NotificationToastBridge />
      {!isVideoCallPage && !isAdminPage && <IncomingCallModal />}
      {!isVideoCallPage && !isAdminPage && <PrescriptionNotificationModal />}
      {!isVideoCallPage && !isAdminPage && <AdminActionNotificationModal />}
      {!isVideoCallPage && !isAdminPage && <HomeVisitProposalModal />}
      {!isVideoCallPage && !isAdminPage && <HomeVisitProposalResultModal />}
      <div className="App">
        {!isVideoCallPage
  && !isAdminPage
  && !is404Page
  && !isResetPasswordPage
  && !isPatientDashboard
  && !isDoctorPage
  && !isPharmacyDashboard
  && <Chat />}
        <ScrollToTop />
        {!hideLayout && <Navbar />}

        <div>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/contact_us" element={<ContactUs />} />
            <Route path="/about_us" element={<AboutUs />} />
            <Route path="/login" element={<Sign_in />} />
            <Route path="/register" element={<Sign_up />} />
            <Route path="/confirm-email" element={<ConfirmEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/register-as" element={<RegistrationChoice />} />
            <Route path="/register/doctor" element={<DoctorRegistration />} />
            <Route path="/register/pharmacy" element={<PharmacyRegistration />} />
            <Route path="/video-calling" element={<VideocallPage />} />
            <Route path="/health-records" element={<HealthRecords />} />
            <Route path="/share-records" element={<ShareHealthRecords />} />
            <Route path="/profile-patient" element={<ProfilePatient />} />
            <Route path="/profile-pharmacy" element={<Navigate to="/pharmacy-page/profile" replace />} />

            {/* <Route path="/schedule" element={<Schedule />} /> */}
            {/* <Route path="/book/:doctorId" element={<Schedule />} /> */}
            {/* <Route path="/my-appointments" element={<MyAppointments />} /> */}
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/doctors/:id" element={<DoctorPublicProfilePage />} />
            {/* Doctor only */}
            <Route path="/doctor" element={
              <ProtectedRoute allowedRoles={['Doctor']}>
                <DoctorDashboardPage />
              </ProtectedRoute>
            }>
              <Route index element={<DoctorAppointmentsView />} />
              <Route path="appointments" element={<DoctorAppointmentsView />} />
              <Route path="appointments/:appointmentId" element={<DoctorAppointmentDetailRoute />} />
              <Route path="patients">
                <Route index element={<DoctorPatientsView />} />
                <Route path=":patientId" element={<DoctorPatientsView />} />
              </Route>
              <Route path="prescriptions" element={<DoctorPrescriptionsView />} />
              <Route path="profile" element={<DoctorProfilePage />} />
              <Route path="schedule" element={<DoctorScheduleView />} />
              <Route path="chat" element={<ChatPage showBot={false} />} />
              <Route path="wallet" element={<DoctorWalletPage />} />
            </Route>

            <Route path="/schedule" element={
              <ExcludeRolesRoute excludedRoles={['Admin', 'Doctor']}>
                <Schedule />
              </ExcludeRolesRoute>
            } />
            <Route path="/book/:doctorId" element={
              <ExcludeRolesRoute excludedRoles={['Admin', 'Doctor']}>
                <Schedule />
              </ExcludeRolesRoute>
            } />
            <Route path="/my-appointments" element={
              <ProtectedRoute allowedRoles={['Patient']}>
                <MyAppointments />
              </ProtectedRoute>
            } />
            <Route path="/my-consultations/pharmacy" element={
              <ProtectedRoute allowedRoles={['Patient']}>
                <Navigate to="/patient-dashboard/pharmacy/requests" replace />
              </ProtectedRoute>
            } />
            <Route path="/payment/order/:orderId" element={
              <ProtectedRoute allowedRoles={['Patient']}>
                <PharmacyOrderRedirect />
              </ProtectedRoute>
            } />
            <Route path="/payment" element={
              <ProtectedRoute allowedRoles={['Patient']}>
                <Navigate to="/patient-dashboard/pharmacy/orders" replace />
              </ProtectedRoute>
            } />

            <Route path="/records" element={
              <ProtectedRoute allowedRoles={['Patient']}>
                <Records />
              </ProtectedRoute>
            } />
            <Route path="/video" element={
              <ProtectedRoute allowedRoles={['Patient']}>
                <Video />
              </ProtectedRoute>
            } />

            {/* Admin routes - Protected by AdminRoute */}
            <Route path="/admin" element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            } />
            <Route path="/admin/patients" element={
              <AdminRoute>
                <Patients />
              </AdminRoute>
            } />
            <Route path="/admin/doctors" element={
              <AdminRoute>
                <AdminDoctors />
              </AdminRoute>
            } />
            <Route path="/admin/pharmacies" element={
              <AdminRoute>
                <PharmacyManagement />
              </AdminRoute>
            } />
            <Route path="/admin/commission" element={
              <AdminRoute>
                <CommissionManagement />
              </AdminRoute>
            } />
            <Route path="/admin/financial-reports" element={
              <AdminRoute>
                <FinancialReports />
              </AdminRoute>
            } />
            <Route path="/admin/appointments" element={
              <AdminRoute>
                <Appointments />
              </AdminRoute>
            } />
            <Route path="/admin/registrations" element={
              <AdminRoute>
                <Registrations />
              </AdminRoute>
            } />
            <Route path="/admin/audit-log" element={
              <AdminRoute>
                <ScheduleAuditLog />
              </AdminRoute>
            } />
            <Route path="/admin/compliance" element={
              <AdminRoute>
                <ScheduleComplianceDashboard />
              </AdminRoute>
            } />
            <Route path="/admin/schedule-requests" element={
              <AdminRoute>
                <ScheduleChangeRequests />
              </AdminRoute>
            } />
            <Route path="/admin/reviews" element={
              <AdminRoute>
                <ReviewManagement />
              </AdminRoute>
            } />

            <Route
              path="/patient-dashboard"
              element={
                <ProtectedRoute allowedRoles={['Patient']}>
                  <PatientDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<PatientDashboardHome />} />
              <Route path="booking" element={<Schedule />} />
              <Route path="book/:doctorId" element={<Schedule />} />
              <Route path="appointments" element={<MyAppointments />} />
              <Route path="health-records" element={<HealthRecords embedded />} />
              <Route path="share-records" element={<ShareHealthRecords embedded />} />
              <Route path="prescriptions" element={<PatientPrescriptionView />} />
              <Route path="pharmacy" element={<PatientPharmacyPage />} />
              <Route path="pharmacy/requests" element={<PatientPharmacyPage />} />
              <Route path="pharmacy/orders" element={<PatientPharmacyPage />} />
              <Route path="pharmacy/orders/:orderId" element={<PatientPharmacyPage />} />
              <Route path="profile" element={<ProfilePatient />} />
              <Route path="chat" element={<ChatPage />} />
            </Route>

            <Route
              path="/pharmacy-page/*"
              element={
                <ProtectedRoute allowedRoles={['Pharmacy']}>
                  <PharmacyDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        {!hideLayout && <Footer />}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </>
  );
}

export default App;
