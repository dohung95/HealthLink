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
        {/* Dashboard Analytics Charts */}
        <DashboardCharts />
      </main>
    </NavbarAdmin>
  );
}