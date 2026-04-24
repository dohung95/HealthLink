import React, { useRef, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Toast from './View/Toast';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, roles, loading } = useAuth();
  const hasShownAlert = useRef(false);
  const [toast, setToast] = useState({ show: false, title: '', message: '', type: 'error' });

  // Đợi authentication load xong
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem'
      }}>
       Loading...
      </div>
    );
  }

  // Kiểm tra xem người dùng có đăng nhập không
  if (!isAuthenticated) {
    // Không hiển thị alert nếu đang trong quá trình logout
    const isLoggingOut = localStorage.getItem('isLoggingOut') === 'true';
    if (!hasShownAlert.current && !isLoggingOut) {
      hasShownAlert.current = true;
      setTimeout(() => {
        setToast({
          show: true,
          title: 'Access Denied',
          message: 'You must be logged in to access this page!',
          type: 'error'
        });
      }, 100);
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    }
    return null;
  }

  // Kiểm tra xem người dùng có role "admin" không
  const isAdmin = roles.includes('admin');

  if (!isAdmin) {
    if (!hasShownAlert.current) {
      hasShownAlert.current = true;
      setTimeout(() => {
        setToast({
          show: true,
          title: 'Access Denied',
          message: 'You do not have permission to access this page!',
          type: 'error'
        });
      }, 100);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
    return null;
  }

  // Nếu là admin, render component
  return (
    <>
      <Toast
        show={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
        title={toast.title}
        message={toast.message}
        type={toast.type}
        duration={0}
      />
      {children}
    </>
  );
};

export default AdminRoute;
