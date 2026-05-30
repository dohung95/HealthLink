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
    { icon: "bi-box-seam", label: "Pharmacies", path: "/admin/pharmacies" },
    { icon: "bi-graph-up-arrow", label: "Financial Reports", path: "/admin/financial-reports" },
    { icon: "bi-currency-exchange", label: "Commission", path: "/admin/commission" },
    { icon: "bi-calendar-check", label: "Appointments", path: "/admin/appointments" },
    { icon: "bi-calendar3", label: "Doctor Schedules", path: "/admin/doctor-schedules" },
    { icon: "bi-clipboard-check", label: "Compliance", path: "/admin/compliance" },
    { icon: "bi-file-medical", label: "Medical Records", path: "/admin/medical-records" },
    { icon: "bi-person-plus", label: "Registrations", path: "/admin/registrations" },
    { icon: "bi-journal-text", label: "Audit Log", path: "/admin/audit-log" },
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
        <div className={`admin-logo ${sidebarCollapsed ? 'p-2' : 'px-3 py-3'} transition-all`}>
          <div className="d-flex align-items-center justify-content-center">
            <div className="admin-logo-icon" style={{ width: '38px', height: '38px', fontSize: '18px' }}>
              <i className="bi bi-heart-pulse-fill"></i>
            </div>
            {!sidebarCollapsed && (
              <div className="admin-logo-text ms-2" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <h6 className="mb-0" style={{ fontWeight: '700', letterSpacing: '-0.5px', fontSize: '15px' }}>
                  HealthLink
                </h6>
                <small style={{ fontSize: '10px', opacity: 0.8 }}>Admin Dashboard</small>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-grow-1 mt-1 px-2">
          <ul className="nav flex-column">
            {menuItems.map((item) => (
              <li key={item.label} className="nav-item">
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); navigate(item.path); }}
                  className={`admin-nav-link d-flex align-items-center rounded-3 ${location.pathname === item.path ? "admin-active" : "admin-nav-hover"
                    }`}
                >
                  <i className={`bi ${item.icon} ${sidebarCollapsed ? "" : "me-2"}`} style={{ fontSize: '16px' }}></i>
                  <span className="admin-menu-label" style={{ fontSize: '13px', fontWeight: '500' }}>{item.label}</span>
                  {location.pathname === item.path && !sidebarCollapsed && (
                    <i className="bi bi-chevron-right ms-auto" style={{ fontSize: '10px' }}></i>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="px-2 py-2">
          <button
            className="admin-logout-btn w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right" style={{ fontSize: '13px' }}></i>
            {!sidebarCollapsed && (
              <span className="admin-menu-label" style={{ fontSize: '12px' }}>Logout</span>
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
