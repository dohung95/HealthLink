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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "Good evening!";
    if (hour < 11) return "Good morning!";
    if (hour < 13) return "Good noon!";
    if (hour < 18) return "Good afternoon!";
    return "Good evening!";
  };

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
    // Overview
    { icon: "bi-speedometer2", label: "Dashboard", path: "/admin" },

    // User Management
    { icon: "bi-person-plus", label: "Registrations", path: "/admin/registrations", divider: "User Management" },
    { icon: "bi-people", label: "Patients", path: "/admin/patients" },
    { icon: "bi-heart-pulse", label: "Doctors", path: "/admin/doctors" },
    { icon: "bi-shop", label: "Pharmacies", path: "/admin/pharmacies" },

    // Operations
    { icon: "bi-calendar-check", label: "Appointments", path: "/admin/appointments", divider: "Operations" },
    { icon: "bi-calendar3", label: "Schedules", path: "/admin/compliance" },
    { icon: "bi-star", label: "Reviews", path: "/admin/reviews" },

    // Finance
    { icon: "bi-graph-up-arrow", label: "Financial", path: "/admin/financial-reports", divider: "Finance" },
    { icon: "bi-percent", label: "Commission", path: "/admin/commission" },

    // System
    { icon: "bi-shield-check", label: "Audit Log", path: "/admin/audit-log", divider: "System" },
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
        <div className={`admin-logo ${sidebarCollapsed ? 'p-2' : ''} transition-all`}>
          <div className="d-flex align-items-center justify-content-center">
            {sidebarCollapsed ? (
              <div className="admin-logo-icon">
                <i className="bi bi-heart-pulse-fill"></i>
              </div>
            ) : (
              <img src="/logo_nav_admin.png" alt="HealthLink" className="admin-logo-img" />
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-grow-1 px-2">
          <ul className="nav flex-column">
            {menuItems.map((item, index) => (
              <React.Fragment key={item.label}>
                {/* Divider with label */}
                {item.divider && !sidebarCollapsed && (
                  <li className="nav-item">
                    <div className="admin-nav-divider">
                      <span>{item.divider}</span>
                    </div>
                  </li>
                )}
                {item.divider && sidebarCollapsed && (
                  <li className="nav-item">
                    <hr className="admin-nav-divider-line" />
                  </li>
                )}
                <li className="nav-item">
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); navigate(item.path); }}
                    className={`admin-nav-link d-flex align-items-center rounded-2 ${location.pathname === item.path ? "admin-active" : "admin-nav-hover"
                      }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <i className={`bi ${item.icon} ${sidebarCollapsed ? "" : "me-2"}`} style={{ fontSize: '15px', minWidth: '18px', textAlign: 'center' }}></i>
                    <span className="admin-menu-label" style={{ fontSize: '14.4px', fontWeight: '600' }}>{item.label}</span>
                    {location.pathname === item.path && !sidebarCollapsed && (
                      <span className="ms-auto admin-active-dot"></span>
                    )}
                  </a>
                </li>
              </React.Fragment>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div>
          <button
            className="admin-logout-btn w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right" style={{ fontSize: '12px' }}></i>
            {!sidebarCollapsed && (
              <span className="admin-menu-label" style={{ fontSize: '11px' }}>Logout</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`admin-main ${sidebarCollapsed ? "admin-sidebar-collapsed" : ""}`}>
        {/* Topbar */}
        <header className="admin-topbar px-3 py-2 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <button
              className="admin-toggle-btn"
              onClick={onToggleSidebar}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <i className={`bi ${sidebarCollapsed ? 'bi-layout-sidebar-inset' : 'bi-layout-sidebar'}`}></i>
            </button>
            <div className="d-none d-md-block">
              <h5 className="mb-0" style={{ fontSize: '20px', fontWeight: '600', color: 'var(--admin-text)' }}>
                {getGreeting()}
              </h5>
              <small style={{ fontSize: '14px', color: 'var(--admin-text-light)' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
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
              <span className="d-none d-md-inline" style={{ fontSize: '15px', fontWeight: '600', color: 'var(--admin-text)' }}>
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
