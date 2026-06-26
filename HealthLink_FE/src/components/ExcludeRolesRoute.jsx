import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ExcludeRolesRoute - Route guard that blocks specific roles
 *
 * Purpose: Allow unauthenticated users and Patient role to access the page,
 * but redirect Admin and Doctor roles to home page
 *
 * Use case: For pages like Schedule that have their own login prompt for
 * unauthenticated users, but need to block Admin/Doctor roles
 *
 * @param {ReactNode} children - The component to render if access is allowed
 * @param {Array<string>} excludedRoles - Array of roles to block (e.g., ['Admin', 'Doctor'])
 */
const ExcludeRolesRoute = ({ children, excludedRoles = [] }) => {
  const { isAuthenticated, roles } = useAuth();

  // If user is not authenticated, allow access (page will show its own login prompt)
  if (!isAuthenticated) {
    return children;
  }

  // If excludedRoles is empty, allow all authenticated users
  if (excludedRoles.length === 0) {
    return children;
  }

  // Check if user has any of the excluded roles (case-insensitive)
  const hasExcludedRole = roles.some(role =>
    excludedRoles.map(r => r.toLowerCase()).includes(role.toLowerCase())
  );

  // If user has an excluded role, redirect to home
  if (hasExcludedRole) {
    return <Navigate to="/" replace />;
  }

  // Allow access for all other cases
  return children;
};

export default ExcludeRolesRoute;
