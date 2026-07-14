import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { financialApi, analyticsApi } from "../../../api/adminApi";
import {
  Area, BarChart, Bar, Line, ComposedChart, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";
import "../Css/FinancialReports.css";

// Cùng convention với DashboardCharts.jsx — giải thích trục tung/trục hoành
const AXIS_MARGIN = { top: 24, right: 16, left: 8, bottom: 34 };
const AXIS_LABEL_STYLE = { fontSize: "12px", fill: "#6b7280" };
const Y_AXIS_LABEL_STYLE = { ...AXIS_LABEL_STYLE, textAnchor: "start" };

export default function FinancialReports() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // overview (year) | weekly (month)

  // Data states
  const [overview, setOverview] = useState(null);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [revenueByWeek, setRevenueByWeek] = useState([]);

  // Cụm A: kỳ đang chọn để hiển thị trên mini chart
  const [selectedPeriod, setSelectedPeriod] = useState("thisMonth"); // thisMonth | today

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
    if (activeTab === "weekly") {
      fetchRevenueByWeek(selectedYear, selectedMonth);
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

  const fetchRevenueByWeek = async (year, month) => {
    try {
      const data = await financialApi.getRevenueByWeek(year, month);
      setRevenueByWeek(data.data || []);
    } catch (error) {
      console.error("Error fetching revenue by week:", error);
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

  // Dữ liệu cho mini chart "Cụm A" — đổi theo selectedPeriod (thisMonth | today)
  const miniChartData = overview
    ? [
        {
          name: "Total Revenue",
          value:
            selectedPeriod === "today"
              ? overview.todayRevenue
              : overview.thisMonthRevenue,
          color: "#10b981"
        },
        {
          name: "Platform Fees",
          value:
            selectedPeriod === "today"
              ? overview.todayPlatformFees
              : overview.thisMonthPlatformFees,
          color: "#f59e0b"
        },
        {
          name: "Doctor Earnings",
          value:
            selectedPeriod === "today"
              ? overview.todayDoctorEarnings
              : overview.thisMonthDoctorEarnings,
          color: "#ec4899"
        },
        {
          name: "Pharmacy Earnings",
          value:
            selectedPeriod === "today"
              ? overview.todayPharmacyEarnings
              : overview.thisMonthPharmacyEarnings,
          color: "#06b6d4"
        }
      ]
    : [];

  return (
    <NavbarAdmin
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
    >
      <main className="admin-content p-4">
        {/* Page Header */}
        <div className="financial-page-header mb-4">
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

        {/* Compact Overview Stats — 2 khối: 5/12 (tổng quan) + 7/12 (Cụm A + mini chart) */}
        {overview && (
          <div className="row g-3 mb-3">
            <div className="col-12 col-lg-5">
              <div className="fin-stat-list">
                <div className="fin-stat-row revenue">
                  <div className="fin-stat-inner">
                    <i className="bi bi-currency-dollar"></i>
                    <div className="fin-stat-text">
                      <span className="fin-stat-value">{formatCurrency(overview.totalRevenue)}</span>
                      <span className="fin-stat-label">Total Revenue</span>
                    </div>
                  </div>
                </div>
                <div className="fin-stat-row fees">
                  <div className="fin-stat-inner">
                    <i className="bi bi-bank"></i>
                    <div className="fin-stat-text">
                      <span className="fin-stat-value">{formatCurrency(overview.platformFees)}</span>
                      <span className="fin-stat-label">Platform Fees</span>
                    </div>
                  </div>
                </div>
                <div className="fin-stat-row doctor">
                  <div className="fin-stat-inner">
                    <i className="bi bi-heart-pulse"></i>
                    <div className="fin-stat-text">
                      <span className="fin-stat-value">{formatCurrency(overview.doctorEarnings)}</span>
                      <span className="fin-stat-label">Doctor Earnings</span>
                    </div>
                  </div>
                </div>
                <div className="fin-stat-row pharmacy">
                  <div className="fin-stat-inner">
                    <i className="bi bi-capsule"></i>
                    <div className="fin-stat-text">
                      <span className="fin-stat-value">{formatCurrency(overview.pharmacyEarnings)}</span>
                      <span className="fin-stat-label">Pharmacy Earnings</span>
                    </div>
                  </div>
                </div>
                <div className="fin-stat-row tx">
                  <div className="fin-stat-inner">
                    <i className="bi bi-receipt"></i>
                    <div className="fin-stat-text">
                      <span className="fin-stat-value">{overview.completedTransactions?.toLocaleString()}</span>
                      <span className="fin-stat-label">Transactions</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-7">
              <div className="d-flex flex-column gap-3 h-100">
                {/* Cụm A — click để đổi kỳ hiển thị trên mini chart bên dưới */}
                <div className="fin-cluster-a">
                  <button
                    type="button"
                    className={`fin-cluster-btn ${selectedPeriod === "thisMonth" ? "selected" : ""}`}
                    onClick={() => setSelectedPeriod("thisMonth")}
                  >
                    <div className="fin-cluster-icon"><i className="bi bi-calendar-month"></i></div>
                    <div className="fin-cluster-text">
                      <span className="fin-cluster-value">{formatCurrency(overview.thisMonthRevenue)}</span>
                      <span className="fin-cluster-label">
                        This Month
                        {overview.revenueGrowthPercent !== null && (
                          <span className={`fin-growth-badge ${overview.revenueGrowthPercent >= 0 ? "up" : "down"}`}>
                            <i className={`bi ${overview.revenueGrowthPercent >= 0 ? "bi-caret-up-fill" : "bi-caret-down-fill"}`}></i>
                            {Math.abs(overview.revenueGrowthPercent).toFixed(1)}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="fin-cluster-radio"></div>
                  </button>
                  <button
                    type="button"
                    className={`fin-cluster-btn ${selectedPeriod === "today" ? "selected" : ""}`}
                    onClick={() => setSelectedPeriod("today")}
                  >
                    <div className="fin-cluster-icon"><i className="bi bi-calendar-day"></i></div>
                    <div className="fin-cluster-text">
                      <span className="fin-cluster-value">{formatCurrency(overview.todayRevenue)}</span>
                      <span className="fin-cluster-label">Today</span>
                    </div>
                    <div className="fin-cluster-radio"></div>
                  </button>
                </div>

                {/* Mini chart — 4 chỉ số của kỳ đang chọn (This Month / Today) */}
                <div className="mini-chart-card flex-grow-1">
                  <div className="mini-chart-title">
                    <i className="bi bi-bar-chart-line text-muted"></i>
                    Breakdown — <span className="period">{selectedPeriod === "today" ? "Today" : "This Month"}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={miniChartData} margin={{ top: 5, right: 10, left: 8, bottom: 28 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        axisLine={{ stroke: "#e5e7eb" }}
                        tickLine={false}
                        interval={0}
                        label={{ value: "(Metric)", position: "insideBottomRight", offset: -6, style: AXIS_LABEL_STYLE }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickFormatter={(value) => `$${value}`}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                        label={{ value: "Amount ($)", position: "top", offset: 10, dx: -30, style: Y_AXIS_LABEL_STYLE }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "none",
                          borderRadius: "10px",
                          boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                          padding: "8px 12px"
                        }}
                        formatter={(value) => [formatCurrency(value), "Amount"]}
                        labelStyle={{ color: "#1f2937", fontWeight: 600 }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
                        {miniChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
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
                  <div className="chart-icon purple" style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" }}>
                    <i className="bi bi-calendar-week"></i>
                  </div>
                  <div>
                    <h5 className="chart-title">Weekly Revenue Breakdown</h5>
                    <span className="chart-subtitle">{monthOptions[selectedMonth - 1]?.label} {selectedYear}</span>
                  </div>
                </>
              )}
            </div>
            <div className="chart-controls flex-wrap">
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
                  className={`tab-btn ${activeTab === "weekly" ? "active" : ""}`}
                  onClick={() => setActiveTab("weekly")}
                >
                  <i className="bi bi-calendar-week"></i>
                  Weekly
                </button>
              </div>

              {activeTab === "weekly" && (
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

              {/* Year Selector — ngoài cùng bên phải */}
              <select
                className="form-select form-select-sm"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{ width: "100px" }}
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
                  title="Back to current year"
                >
                  <i className="bi bi-arrow-counterclockwise"></i>
                </button>
              )}
            </div>
          </div>

          <div className="chart-body">
            {activeTab === "overview" ? (
              <ResponsiveContainer width="100%" height={480}>
                <ComposedChart data={revenueByMonth} margin={AXIS_MARGIN}>
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
                    label={{ value: "(Month)", position: "insideBottomRight", offset: -10, style: AXIS_LABEL_STYLE }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => `$${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "Revenue ($)", position: "top", offset: 15, dx: -38, style: Y_AXIS_LABEL_STYLE }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                      padding: "12px 16px"
                    }}
                    formatter={(value, name) => [formatCurrency(value), name]}
                    labelStyle={{ color: '#1f2937', fontWeight: 600, marginBottom: 4 }}
                  />
                  {/* Area tự vẽ luôn phần viền (stroke) làm đường Trend — trước đây có thêm
                      <Line> riêng cùng dataKey="count", khiến Tooltip hiện "Revenue" 2 lần
                      với cùng 1 giá trị. Dồn dot/activeDot vào Area, bỏ hẳn Line trùng lặp. */}
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Revenue"
                    stroke="#059669"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                    dot={{ fill: "#fff", stroke: "#059669", strokeWidth: 3, r: 6 }}
                    activeDot={{ r: 8, fill: "#059669", stroke: "#fff", strokeWidth: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={480}>
                <BarChart data={revenueByWeek} margin={AXIS_MARGIN}>
                  <defs>
                    <linearGradient id="weeklyRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="week"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                    label={{ value: "(Week)", position: "insideBottomRight", offset: -10, style: AXIS_LABEL_STYLE }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => `$${value}`}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "Revenue ($)", position: "top", offset: 15, dx: -38, style: Y_AXIS_LABEL_STYLE }}
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
                    fill="url(#weeklyRevenueGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={70}
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
