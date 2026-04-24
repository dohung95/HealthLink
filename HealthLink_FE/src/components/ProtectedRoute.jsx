import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { isAuthenticated, roles } = useAuth();

    // Check if user is authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If no roles specified, allow any authenticated user
    if (allowedRoles.length === 0) {
        return children;
    }

    // Check if user has at least one of the allowed roles (case-insensitive)
    const hasRequiredRole = roles.some(role => 
        allowedRoles.map(r => r.toLowerCase()).includes(role.toLowerCase())
    );

    if (!hasRequiredRole) {
        // Redirect to home if user doesn't have required role
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
