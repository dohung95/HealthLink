import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, roles, loading } = useAuth();
  const location = useLocation();
  const [shouldRedirect, setShouldRedirect] = useState(null);

  // Check if user has admin role (case-insensitive)
  const isAdmin = roles.some(role => role.toLowerCase() === 'admin');

  useEffect(() => {
    // Skip if still loading
    if (loading) return;

    // Check if logging out
    const isLoggingOut = localStorage.getItem('isLoggingOut') === 'true';
    if (isLoggingOut) return;

    // Not authenticated
    if (!isAuthenticated) {
      toast.error('You must be logged in to access this page!', {
        duration: 3000,
      });
      setShouldRedirect('/login');
      return;
    }

    // Authenticated but not admin
    if (!isAdmin) {
      toast.error('You do not have permission to access this page!', {
        duration: 3000,
      });
      setShouldRedirect('/');
      return;
    }
  }, [isAuthenticated, isAdmin, loading]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="admin-loading-screen">
        <div className="admin-loading-content">
          <div className="admin-loading-spinner"></div>
          <p>Loading...</p>
        </div>
        <style>{`
          .admin-loading-screen {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: linear-gradient(135deg, #f0fdf9 0%, #ecfeff 100%);
          }
          .admin-loading-content {
            text-align: center;
          }
          .admin-loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e0f2fe;
            border-top-color: #00a08b;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
          .admin-loading-content p {
            color: #475569;
            font-size: 14px;
            margin: 0;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Handle redirect
  if (shouldRedirect) {
    return <Navigate to={shouldRedirect} state={{ from: location }} replace />;
  }

  // Not authenticated - wait for useEffect to set redirect
  if (!isAuthenticated) {
    return null;
  }

  // Not admin - wait for useEffect to set redirect
  if (!isAdmin) {
    return null;
  }

  // User is authenticated and is admin - render children
  return children;
};

export default AdminRoute;
