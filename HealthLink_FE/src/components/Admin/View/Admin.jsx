import React, { useState } from "react";
import NavbarAdmin from "./NavbarAdmin";
import DashboardCharts from "./DashboardCharts";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";

export default function Admin() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <NavbarAdmin
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
    >
      <main className="admin-content">
          {/* Dashboard Page Header with Visual Distinction */}
          <div className="admin-page-header-dashboard mb-3">
            <div className="d-flex justify-content-between align-items-start">
              <div className="admin-page-title-section">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <div className="admin-page-icon-dashboard">
                    <i className="bi bi-speedometer2"></i>
                  </div>
                  <div>
                    <h2 className="admin-page-title mb-0">
                      System Dashboard
                    </h2>
                    <div className="d-flex align-items-center gap-2">
                      <span className="admin-page-badge-dashboard">
                        <i className="bi bi-graph-up-arrow me-1"></i>
                        Control Center
                      </span>
                    </div>
                  </div>
                </div>
                <p className="admin-page-subtitle-dashboard mb-0">
                  Monitor system health, track key metrics, and manage healthcare operations
                </p>
              </div>
            </div>
          </div>

        {/* Dashboard Analytics Charts */}
        <DashboardCharts />
      </main>
    </NavbarAdmin>
  );
}