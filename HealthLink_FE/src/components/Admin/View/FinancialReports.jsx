import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { financialApi, analyticsApi } from "../../../api/adminApi";
import {
  Area, BarChart, Bar, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";
import "../Css/FinancialReports.css";

export default function FinancialReports() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Data states
  const [overview, setOverview] = useState(null);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [revenueByDay, setRevenueByDay] = useState([]);

  // Filter states
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Year options
  const yearOptions = [];
  for (let year = 2024; year <= 2030; year++) {
    yearOptions.push(year);
  }

  // Month options
  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" }
  ];

  useEffect(() => {
    fetchOverview();
    fetchRevenueByMonth(selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    if (activeTab === "daily") {
      fetchRevenueByDay(selectedYear, selectedMonth);
    }
  }, [activeTab, selectedYear, selectedMonth]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const data = await financialApi.getOverview();
      setOverview(data);
    } catch (error) {
      console.error("Error fetching overview:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueByMonth = async (year) => {
    try {
      const data = await analyticsApi.getRevenueByMonth(year);
      setRevenueByMonth(data.data || []);
    } catch (error) {
      console.error("Error fetching revenue by month:", error);
    }
  };

  const fetchRevenueByDay = async (year, month) => {
    try {
      const data = await financialApi.getRevenueByDay(year, month);
      setRevenueByDay(data.data || []);
    } catch (error) {
      console.error("Error fetching revenue by day:", error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  return (
    <NavbarAdmin
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
    >
      <main className="admin-content p-4">
        {/* Page Header */}
        <div className="financial-page-header mb-4">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <div className="d-flex align-items-center gap-3 mb-2">
                <div className="financial-page-icon">
                  <i className="bi bi-graph-up-arrow"></i>
                </div>
                <div>
                  <h2 className="admin-page-title mb-1">Financial Reports</h2>
                  <span className="admin-page-badge-financial">
                    <i className="bi bi-currency-dollar me-1"></i>
                    Revenue Analytics
                  </span>
                </div>
              </div>
              <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                Track revenue, analyze transactions, and monitor financial performance
              </p>
            </div>

            {/* Year Selector */}
            <div className="d-flex align-items-center gap-2">
              <select
                className="form-select form-select-sm"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{ width: "120px" }}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              {selectedYear !== currentYear && (
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => setSelectedYear(currentYear)}
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i>
                  Current
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Compact Overview Stats */}
        {overview && (
          <div className="financial-stats-strip mb-3">
            <div className="stat-item primary">
              <i className="bi bi-currency-dollar"></i>
              <div className="stat-content">
                <span className="stat-value">{formatCurrency(overview.totalRevenue)}</span>
                <span className="stat-label">Total Revenue</span>
              </div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item blue">
              <i className="bi bi-calendar-month"></i>
              <div className="stat-content">
                <span className="stat-value">{formatCurrency(overview.thisMonthRevenue)}</span>
                <span className="stat-label">
                  This Month
                  {overview.revenueGrowthPercent !== null && (
                    <span className={`stat-growth ${overview.revenueGrowthPercent >= 0 ? "up" : "down"}`}>
                      <i className={`bi ${overview.revenueGrowthPercent >= 0 ? "bi-caret-up-fill" : "bi-caret-down-fill"}`}></i>
                      {Math.abs(overview.revenueGrowthPercent).toFixed(1)}%
                    </span>
                  )}
                </span>
              </div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item purple">
              <i className="bi bi-calendar-day"></i>
              <div className="stat-content">
                <span className="stat-value">{formatCurrency(overview.todayRevenue)}</span>
                <span className="stat-label">Today</span>
              </div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item orange">
              <i className="bi bi-bank"></i>
              <div className="stat-content">
                <span className="stat-value">{formatCurrency(overview.platformFees)}</span>
                <span className="stat-label">Platform Fees</span>
              </div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item pink">
              <i className="bi bi-heart-pulse"></i>
              <div className="stat-content">
                <span className="stat-value">{formatCurrency(overview.doctorEarnings)}</span>
                <span className="stat-label">Doctor Earnings</span>
              </div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item indigo">
              <i className="bi bi-receipt"></i>
              <div className="stat-content">
                <span className="stat-value">{overview.totalTransactions?.toLocaleString()}</span>
                <span className="stat-label">Transactions</span>
              </div>
            </div>
          </div>
        )}

        {/* Chart Section */}
        <div className="financial-chart-container">
          <div className="chart-header">
            <div className="chart-title-section">
              {activeTab === "overview" ? (
                <>
                  <div className="chart-icon green">
                    <i className="bi bi-graph-up-arrow"></i>
                  </div>
                  <div>
                    <h5 className="chart-title">Monthly Revenue Overview</h5>
                    <span className="chart-subtitle">Revenue trends for {selectedYear}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="chart-icon blue">
                    <i className="bi bi-bar-chart-fill"></i>
                  </div>
                  <div>
                    <h5 className="chart-title">Daily Revenue Breakdown</h5>
                    <span className="chart-subtitle">{monthOptions[selectedMonth - 1]?.label} {selectedYear}</span>
                  </div>
                </>
              )}
            </div>
            <div className="chart-controls">
              {/* Tabs */}
              <div className="financial-tabs-inline">
                <button
                  className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
                  onClick={() => setActiveTab("overview")}
                >
                  <i className="bi bi-graph-up"></i>
                  Monthly
                </button>
                <button
                  className={`tab-btn ${activeTab === "daily" ? "active" : ""}`}
                  onClick={() => setActiveTab("daily")}
                >
                  <i className="bi bi-calendar3"></i>
                  Daily
                </button>
              </div>
              {activeTab === "daily" && (
                <select
                  className="form-select form-select-sm month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                >
                  {monthOptions.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="chart-body">
            {activeTab === "overview" ? (
              <ResponsiveContainer width="100%" height={480}>
                <ComposedChart data={revenueByMonth} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                      padding: "12px 16px"
                    }}
                    formatter={(value) => [formatCurrency(value), "Revenue"]}
                    labelStyle={{ color: '#1f2937', fontWeight: 600, marginBottom: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Revenue"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Trend"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ fill: "#fff", stroke: "#059669", strokeWidth: 3, r: 6 }}
                    activeDot={{ r: 8, fill: "#059669", stroke: "#fff", strokeWidth: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={480}>
                <BarChart data={revenueByDay} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="dailyRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => `$${value}`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                      padding: "12px 16px"
                    }}
                    formatter={(value, name) => [
                      name === "revenue" ? formatCurrency(value) : value,
                      name === "revenue" ? "Revenue" : "Transactions"
                    ]}
                    labelStyle={{ color: '#1f2937', fontWeight: 600, marginBottom: 4 }}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="url(#dailyRevenueGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </main>
    </NavbarAdmin>
  );
}
