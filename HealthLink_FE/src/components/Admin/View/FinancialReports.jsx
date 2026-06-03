import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { financialApi, analyticsApi } from "../../../api/adminApi";
import {
   Area, BarChart, Bar, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
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

        {/* Overview Cards */}
        {overview && (
          <div className="financial-overview-grid mb-4">
            <div className="financial-card total-revenue">
              <div className="financial-card-icon">
                <i className="bi bi-currency-dollar"></i>
              </div>
              <div className="financial-card-content">
                <span className="financial-label">Total Revenue</span>
                <span className="financial-value">{formatCurrency(overview.totalRevenue)}</span>
                <span className="financial-sub">All time earnings</span>
              </div>
            </div>

            <div className="financial-card this-month">
              <div className="financial-card-icon">
                <i className="bi bi-calendar-month"></i>
              </div>
              <div className="financial-card-content">
                <span className="financial-label">This Month</span>
                <span className="financial-value">{formatCurrency(overview.thisMonthRevenue)}</span>
                {overview.revenueGrowthPercent !== null && (
                  <span className={`financial-growth ${overview.revenueGrowthPercent >= 0 ? "positive" : "negative"}`}>
                    <i className={`bi ${overview.revenueGrowthPercent >= 0 ? "bi-arrow-up" : "bi-arrow-down"}`}></i>
                    {Math.abs(overview.revenueGrowthPercent).toFixed(1)}% vs last month
                  </span>
                )}
              </div>
            </div>

            <div className="financial-card this-week">
              <div className="financial-card-icon">
                <i className="bi bi-calendar-week"></i>
              </div>
              <div className="financial-card-content">
                <span className="financial-label">This Week</span>
                <span className="financial-value">{formatCurrency(overview.thisWeekRevenue)}</span>
                <span className="financial-sub">Weekly earnings</span>
              </div>
            </div>

            <div className="financial-card today">
              <div className="financial-card-icon">
                <i className="bi bi-calendar-day"></i>
              </div>
              <div className="financial-card-content">
                <span className="financial-label">Today</span>
                <span className="financial-value">{formatCurrency(overview.todayRevenue)}</span>
                <span className="financial-sub">Today's earnings</span>
              </div>
            </div>

            <div className="financial-card platform-fees">
              <div className="financial-card-icon">
                <i className="bi bi-bank"></i>
              </div>
              <div className="financial-card-content">
                <span className="financial-label">Platform Fees</span>
                <span className="financial-value">{formatCurrency(overview.platformFees)}</span>
                <span className="financial-sub">Commission earned</span>
              </div>
            </div>

            <div className="financial-card doctor-earnings">
              <div className="financial-card-icon">
                <i className="bi bi-heart-pulse"></i>
              </div>
              <div className="financial-card-content">
                <span className="financial-label">Doctor Earnings</span>
                <span className="financial-value">{formatCurrency(overview.doctorEarnings)}</span>
                <span className="financial-sub">Paid to doctors</span>
              </div>
            </div>

            <div className="financial-card transactions">
              <div className="financial-card-icon">
                <i className="bi bi-receipt"></i>
              </div>
              <div className="financial-card-content">
                <span className="financial-label">Total Transactions</span>
                <span className="financial-value">{overview.totalTransactions?.toLocaleString()}</span>
                <span className="financial-sub">{overview.completedTransactions} completed</span>
              </div>
            </div>

            <div className="financial-card avg-value">
              <div className="financial-card-icon">
                <i className="bi bi-calculator"></i>
              </div>
              <div className="financial-card-content">
                <span className="financial-label">Avg. Transaction</span>
                <span className="financial-value">{formatCurrency(overview.averageTransactionValue)}</span>
                <span className="financial-sub">Per transaction</span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="financial-tabs mb-4">
          <button
            className={`financial-tab ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <i className="bi bi-bar-chart-line me-2"></i>
            Monthly Overview
          </button>
          <button
            className={`financial-tab ${activeTab === "daily" ? "active" : ""}`}
            onClick={() => setActiveTab("daily")}
          >
            <i className="bi bi-calendar3 me-2"></i>
            Daily Breakdown
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="admin-card">
            <div className="card-header bg-white py-3 px-4">
              <h5 className="mb-0">
                <i className="bi bi-graph-up me-2 text-success"></i>
                Revenue by Month - {selectedYear}
              </h5>
            </div>
            <div className="card-body p-4">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={revenueByMonth}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis
                    stroke="#6b7280"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                    }}
                    formatter={(value) => [formatCurrency(value), "Revenue"]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Trend"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ fill: "#059669", r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === "daily" && (
          <div className="admin-card">
            <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-calendar3 me-2 text-primary"></i>
                Daily Revenue - {monthOptions[selectedMonth - 1]?.label} {selectedYear}
              </h5>
              <select
                className="form-select form-select-sm"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{ width: "150px" }}
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="card-body p-4">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={revenueByDay}>
                  <defs>
                    <linearGradient id="dailyRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px"
                    }}
                    formatter={(value, name) => [
                      name === "revenue" ? formatCurrency(value) : value,
                      name === "revenue" ? "Revenue" : "Transactions"
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="url(#dailyRevenueGradient)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </main>
    </NavbarAdmin>
  );
}
