import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import AdminNotificationDropdown from "./AdminNotificationDropdown";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";

export default function NavbarAdmin({ sidebarCollapsed, onToggleSidebar, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      localStorage.setItem('isLoggingOut', 'true');
      navigate("/");
      setTimeout(async () => {
        await logout();
        localStorage.removeItem('isLoggingOut');
      }, 100);
    } catch (error) {
      console.error("Logout failed:", error);
      localStorage.removeItem('isLoggingOut');
    }
  };

  const menuItems = [
    { icon: "bi-speedometer2", label: "Dashboard", path: "/admin" },
    { icon: "bi-people", label: "Patients", path: "/admin/patients" },
    { icon: "bi-heart-pulse", label: "Doctors", path: "/admin/doctors" },
    { icon: "bi-calendar-check", label: "Appointments", path: "/admin/appointments" },
    { icon: "bi-file-medical", label: "Medical Records", path: "/admin/medical-records" },
  ];

  return (
    <div className="admin-dashboard-wrapper">
      {/* Mobile Overlay Backdrop */}
      {!sidebarCollapsed && (
        <div
          className="admin-sidebar-overlay d-md-none"
          onClick={onToggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`admin-sidebar vh-100 position-fixed top-0 start-0 d-flex flex-column ${sidebarCollapsed ? "collapsed" : ""
          }`}
      >
        {/* Logo */}
        <div className={`admin-logo ${sidebarCollapsed ? 'p-2' : 'p-4'} transition-all`}>
          <div className="d-flex align-items-center justify-content-center">
            <div className="admin-logo-icon">
              <i className="bi bi-heart-pulse-fill"></i>
            </div>
            {!sidebarCollapsed && (
              <div className="admin-logo-text ms-3" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <h5 className="mb-0" style={{ fontWeight: '700', letterSpacing: '-0.5px' }}>
                  HealthLink
                </h5>
                <small style={{ fontSize: '11px', opacity: 0.8 }}>Admin Dashboard</small>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-grow-1 mt-2 px-3">
          <ul className="nav flex-column">
            {menuItems.map((item) => (
              <li key={item.label} className="nav-item mb-1">
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); navigate(item.path); }}
                  className={`admin-nav-link d-flex align-items-center py-3 px-3 rounded-3 ${location.pathname === item.path ? "admin-active" : "admin-nav-hover"
                    }`}
                >
                  <i className={`bi ${item.icon} ${sidebarCollapsed ? "" : "me-3"}`} style={{ fontSize: '18px' }}></i>
                  <span className="admin-menu-label" style={{ fontSize: '14px', fontWeight: '500' }}>{item.label}</span>
                  {location.pathname === item.path && !sidebarCollapsed && (
                    <i className="bi bi-chevron-right ms-auto" style={{ fontSize: '12px' }}></i>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="px-3 pb-3 pt-2">
          <button
            className="admin-logout-btn w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right" style={{ fontSize: '14px' }}></i>
            {!sidebarCollapsed && (
              <span className="admin-menu-label">Logout</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`admin-main ${sidebarCollapsed ? "admin-sidebar-collapsed" : ""}`}>
        {/* Topbar */}
        <header className="admin-topbar px-4 py-3 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <button
              className="admin-toggle-btn"
              onClick={onToggleSidebar}
            >
              <i className="bi bi-list"></i>
            </button>
            <div className="d-none d-md-block">
              <h6 className="mb-0" style={{ fontSize: '15px', fontWeight: '600', color: 'var(--admin-text)' }}>
                Welcome back, Admin
              </h6>
              <small style={{ fontSize: '12px', color: 'var(--admin-text-light)' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </small>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Notifications */}
            <AdminNotificationDropdown />

            {/* User Avatar */}
            <div className="admin-user-display d-flex align-items-center gap-2">
              <div className="admin-avatar-img">
                <img
                  src="/public/Hung/Admin.jpg"
                  alt="Admin"
                />
              </div>
              <span className="d-none d-md-inline" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--admin-text)' }}>
                Admin
              </span>
            </div>
          </div>
        </header>

        {/* Page Content - passed as children */}
        {children}
      </div>
    </div>
  );
}
