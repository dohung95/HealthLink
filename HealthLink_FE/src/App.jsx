// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Home from './components/Home';
import Schedule from './components/Schedule';
import MyAppointments from './components/MyAppointment';
import Doctors from './components/Doctors';
import Records from './components/Records';
import Video from './components/Video';

import Chat from './components/Chat';
import Payment from './components/Payment';

import ProfilePatient from './pages/profilePatient';

import Admin from './components/Admin/View/Admin';
import Patients from './components/Admin/View/Patients';
import AdminDoctors from './components/Admin/View/Doctors';
import Appointments from './components/Admin/View/Appointments';
import MedicalRecords from './components/Admin/View/MedicalRecords';

import Sign_in from './components/Auth/Sign_in';
import Sign_up from './components/Auth/Sign_up';
import EmailConfirmation from './components/Auth/EmailConfirmation';

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
  const location = useLocation();
  const isVideoCallPage = location.pathname === '/video-calling';
  const isDoctorPage = location.pathname === '/doctor-page';
  const isLoginPage = location.pathname === '/login';
  const isAdminPage = location.pathname.startsWith('/admin');
  // Don't show navbar/footer on video call, doctor page, admin page, or login page
  const hideLayout = isVideoCallPage || isDoctorPage || isAdminPage;

  return (
    <>
      <Toaster position="top-right" richColors />
      {!isVideoCallPage && !isAdminPage && <IncomingCallModal />}
      {!isVideoCallPage && !isAdminPage && <PrescriptionNotificationModal />}
      <div className="App">
        {!isVideoCallPage && !isAdminPage && <Chat />}
        <ScrollToTop />
        {!hideLayout && <Navbar />}

        <div>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/contact_us" element={<ContactUs />} />
            <Route path="/about_us" element={<AboutUs />} />
            <Route path="/login" element={<Sign_in />} />
            <Route path="/register" element={<Sign_up />} />
            <Route path="/confirm-email" element={<EmailConfirmation />} />
            <Route path="/video-calling" element={<VideocallPage />} />
            <Route path="/health-records" element={<HealthRecords />} />
            <Route path="/share-records" element={<ShareHealthRecords />} />
            <Route path="/profile-patient" element={<ProfilePatient />} />

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
            {/* <Route path="/doctors" element={
              <ProtectedRoute allowedRoles={['Patient']}>
                <Doctors />
              </ProtectedRoute>
            } /> */}
            {/* <Route path="/doctor/:id" element={
              <ProtectedRoute allowedRoles={['Patient']}>
                <DoctorProfile />
              </ProtectedRoute>
            } /> */}


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

            <Route path="/admin" element={<AdminRoute> <Admin /> </AdminRoute>} />
            <Route path="/admin/patients" element={<AdminRoute> <Patients /> </AdminRoute>} />
            <Route path="/admin/doctors" element={<AdminRoute> <AdminDoctors /> </AdminRoute>} />
            <Route path="/admin/appointments" element={<AdminRoute> <Appointments /> </AdminRoute>} />
            <Route path="/admin/medical-records" element={<AdminRoute> <MedicalRecords /> </AdminRoute>} />

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