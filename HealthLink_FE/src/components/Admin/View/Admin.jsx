import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavbarAdmin from "./NavbarAdmin";
import DashboardCharts from "./DashboardCharts";
import { patientsApi, appointmentsApi, medicalRecordsApi } from "../../../services/adminApi";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";

export default function Admin() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    pendingApproval: 0,
    totalRecords: 0
  });

  // Fetch all stats from different APIs
  const fetchAllStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats from all APIs in parallel
      const [patientsData, appointmentsData, recordsData] = await Promise.all([
        patientsApi.getAll({ pageNumber: 1, pageSize: 1 }).catch(() => ({ totalCount: 0 })),
        appointmentsApi.getStats().catch(() => ({ todayAppointments: 0, pendingApproval: 0 })),
        medicalRecordsApi.getStats().catch(() => ({ totalRecords: 0 }))
      ]);

      setStats({
        totalPatients: patientsData.totalCount || 0,
        todayAppointments: appointmentsData.todayAppointments || 0,
        pendingApproval: appointmentsData.pendingApproval || 0,
        totalRecords: recordsData.totalRecords || 0
      });
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllStats();
  }, []);

  return (
    <NavbarAdmin
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
    >
      <main className="admin-content p-4">
          {/* Dashboard Page Header with Visual Distinction */}
          <div className="admin-page-header-dashboard mb-4">
            <div className="d-flex justify-content-between align-items-start">
              <div className="admin-page-title-section">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="admin-page-icon-dashboard">
                    <i className="bi bi-speedometer2"></i>
                  </div>
                  <div>
                    <h2 className="admin-page-title mb-1">
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

        {error && (
          <div className="alert alert-danger admin-alert" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        {loading ? (
          <div className="admin-loading">
            <div className="spinner-border" style={{ color: 'var(--admin-primary)' }} role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Stats Inline */}
            <div className="dashboard-stats-inline mb-4">
              <div className="stat-inline-item stat-patients">
                <div className="stat-inline-icon">
                  <i className="bi bi-people-fill"></i>
                </div>
                <div className="stat-inline-content">
                  <div className="stat-inline-value">{stats.totalPatients}</div>
                  <div className="stat-inline-label">Total Patients</div>
                </div>
              </div>

              <div className="stat-inline-item stat-today-appt">
                <div className="stat-inline-icon">
                  <i className="bi bi-calendar-check-fill"></i>
                </div>
                <div className="stat-inline-content">
                  <div className="stat-inline-value">{stats.todayAppointments}</div>
                  <div className="stat-inline-label">Today's Appointments</div>
                </div>
              </div>

              <div className="stat-inline-item stat-pending-appt">
                <div className="stat-inline-icon">
                  <i className="bi bi-hourglass-split"></i>
                </div>
                <div className="stat-inline-content">
                  <div className="stat-inline-value">{stats.pendingApproval}</div>
                  <div className="stat-inline-label">Pending Approval</div>
                </div>
              </div>

              <div className="stat-inline-item stat-records">
                <div className="stat-inline-icon">
                  <i className="bi bi-file-medical-fill"></i>
                </div>
                <div className="stat-inline-content">
                  <div className="stat-inline-value">{stats.totalRecords}</div>
                  <div className="stat-inline-label">Medical Records</div>
                </div>
              </div>
            </div>

            {/* Dashboard Analytics Charts */}
            <DashboardCharts />
          </>
        )}
      </main>
    </NavbarAdmin>
  );
}