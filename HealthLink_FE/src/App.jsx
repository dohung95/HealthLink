// src/App.js
import {useEffect} from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

// ---------------------------------------------import file----------------------------------------------------------
import { useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Home from './components/Home';
import Schedule from './components/patient-dashboard/Schedule';
import MyAppointments from './components/MyAppointment';
import Doctors from './components/Doctors';
import Records from './components/Records';
import Video from './components/Video';

import Chat from './components/Chat';
import Payment from './components/Payment';

import ProfilePatient from './pages/profilePatient';
import ProfileDoctor from './pages/profileDoctor';
import ProfilePharmacy from './pages/profilePharmacy';

import Admin from './components/Admin/View/Admin';
import Patients from './components/Admin/View/Patients';
import AdminDoctors from './components/Admin/View/Doctors';
import Appointments from './components/Admin/View/Appointments';
import MedicalRecords from './components/Admin/View/MedicalRecords';
import Registrations from './components/Admin/View/Registrations';

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
import PrescriptionNotificationModal from './components/PrescriptionNotificationModal';
import Navbar from './components/Navbar';
import DoctorProfile from './components/DoctorProfile';
import PatientPrescriptionView from './components/PatientPrescriptionView';

import DoctorPage from './components/DoctorPage';
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
function AppContent() {
  const navigate = useNavigate();
  const { isAuthenticated, roles } = useAuth();
  const location = useLocation();
  const isVideoCallPage = location.pathname === '/video-calling';
  const isDoctorPage = location.pathname === '/doctor-page';
  const isLoginPage = location.pathname === '/login';
  const isAdminPage = location.pathname.startsWith('/admin');
  const isPatientDashboard = location.pathname.startsWith('/patient-dashboard');
  const isSchedulePage = location.pathname === '/schedule' || location.pathname.startsWith('/book/');

  // Don't show navbar/footer on video call, doctor page, admin page, or login page
  const hideLayout = isVideoCallPage || isDoctorPage || isAdminPage || isPatientDashboard || isSchedulePage;

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
    '/profile-doctor',
    '/profile-pharmacy',
    '/doctor-page',
    '/patient-dashboard',
    '/admin',
    '/my-appointments',
    '/records',
    '/video',
    '/payment'
  ];

  const isKnownPath = allValidPaths.some(path => 
    location.pathname === path || location.pathname.startsWith(path + '/')
  ) || location.pathname.startsWith('/doctor/') || location.pathname.startsWith('/book/');

  const is404Page = !isKnownPath;

  useEffect(() => {
    // Nếu đã đăng nhập mà cố tình truy cập vào các trang công khai
    if (isAuthenticated && publicPaths.includes(location.pathname)) {
      const userRoles = roles.map(r => r.toLowerCase());

      if (userRoles.includes('admin')) {
        navigate('/admin', { replace: true });
      } else if (userRoles.includes('doctor')) {
        navigate('/doctor-page', { replace: true });
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
      {!isVideoCallPage && !isAdminPage && <IncomingCallModal />}
      {!isVideoCallPage && !isAdminPage && <PrescriptionNotificationModal />}
      <div className="App">
        {!isVideoCallPage && !isAdminPage && !is404Page && <Chat />}
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
            <Route path="/profile-doctor" element={<ProfileDoctor />} />
            <Route path="/profile-pharmacy" element={<ProfilePharmacy />} />

            {/* <Route path="/schedule" element={<Schedule />} /> */}
            {/* <Route path="/book/:doctorId" element={<Schedule />} /> */}
            {/* <Route path="/my-appointments" element={<MyAppointments />} /> */}
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/doctor/:id" element={<DoctorProfile />} />
            {/* Doctor only */}
            <Route path="/doctor-page" element={
              <ProtectedRoute allowedRoles={['Doctor']}>
                <DoctorPage />
              </ProtectedRoute>
            } />

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
            <Route path="/payment" element={
              <ProtectedRoute allowedRoles={['Patient']}>
                <Payment />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/patients" element={<Patients />} />
            <Route path="/admin/doctors" element={<AdminDoctors />} />
            <Route path="/admin/appointments" element={<Appointments />} />
            <Route path="/admin/medical-records" element={<MedicalRecords />} />
            <Route path="/admin/registrations" element={<Registrations />} />

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
              <Route path="health-records" element={<HealthRecords />} />
              <Route path="share-records" element={<ShareHealthRecords />} />
              <Route path="profile" element={<ProfilePatient />} />
            </Route>

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