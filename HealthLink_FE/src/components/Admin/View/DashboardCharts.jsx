import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { analyticsApi, financialApi } from '../../../api/adminApi';
import '../Css/DashboardCharts.css';

const DashboardCharts = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed

    const [loading, setLoading] = useState(true);
    const [patientData, setPatientData] = useState([]);
    const [weeklyAppointments, setWeeklyAppointments] = useState([]);
    const [monthlyAppointments, setMonthlyAppointments] = useState([]);
    const [revenueData, setRevenueData] = useState([]);
    const [financialOverview, setFinancialOverview] = useState(null);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedWeekMonth, setSelectedWeekMonth] = useState(currentMonth);

    // Generate year options from 2024 to 2030
    const yearOptions = [];
    for (let year = 2024; year <= 2030; year++) {
        yearOptions.push(year);
    }

    const monthOptions = [
        { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
        { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
        { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
        { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
    ];

    useEffect(() => {
        fetchAllData(selectedYear);
    }, [selectedYear]);

    // Weekly chart is filtered by its own month selector, so fetch it separately.
    useEffect(() => {
        fetchWeeklyAppointments(selectedYear, selectedWeekMonth);
    }, [selectedYear, selectedWeekMonth]);

    const fetchAllData = async (year) => {
        try {
            setLoading(true);
            const [patients, monthly, revenue, overview] = await Promise.all([
                analyticsApi.getPatientRegistrations(year),
                analyticsApi.getAppointmentsByMonth(year),
                analyticsApi.getRevenueByMonth(year),
                financialApi.getOverview().catch(() => null)
            ]);

            setPatientData(patients.data || []);
            setMonthlyAppointments(monthly.data || []);
            setRevenueData(revenue.data || []);
            setFinancialOverview(overview);
        } catch (error) {
            console.error('Error fetching analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWeeklyAppointments = async (year, month) => {
        try {
            const weekly = await analyticsApi.getAppointmentsByWeek(year, month);
            setWeeklyAppointments(weekly.data || []);
        } catch (error) {
            console.error('Error fetching weekly appointments:', error);
        }
    };

    // Calculate derived stats from chart data
    const patientChartStats = useMemo(() => {
        if (!patientData.length) return null;
        const total = patientData.reduce((sum, d) => sum + (d.count || 0), 0);
        const thisMonth = patientData[currentMonth - 1]?.count || 0;
        const lastMonth = patientData[currentMonth - 2]?.count || 0;
        const avg = Math.round(total / 12);
        const peak = Math.max(...patientData.map(d => d.count || 0));
        return { total, thisMonth, lastMonth, avg, peak };
    }, [patientData, currentMonth]);

    const weeklyChartStats = useMemo(() => {
        if (!weeklyAppointments.length) return null;
        const total = weeklyAppointments.reduce((sum, d) => sum + (d.count || 0), 0);
        const avg = Math.round(total / weeklyAppointments.length);
        const peak = Math.max(...weeklyAppointments.map(d => d.count || 0));
        const current = weeklyAppointments[weeklyAppointments.length - 1]?.count || 0;
        return { total, avg, peak, current };
    }, [weeklyAppointments]);

    const monthlyChartStats = useMemo(() => {
        if (!monthlyAppointments.length) return null;
        const total = monthlyAppointments.reduce((sum, d) => sum + (d.count || 0), 0);
        const thisMonth = monthlyAppointments[currentMonth - 1]?.count || 0;
        const avg = Math.round(total / 12);
        const peak = Math.max(...monthlyAppointments.map(d => d.count || 0));
        return { total, thisMonth, avg, peak };
    }, [monthlyAppointments, currentMonth]);

    const handleYearChange = (e) => {
        setSelectedYear(parseInt(e.target.value));
    };

    const handleCurrentYear = () => {
        setSelectedYear(currentYear);
    };

    if (loading) {
        return (
            <div className="dashboard-charts-loading">
                <div className="spinner-border" style={{ color: 'var(--admin-primary)' }} role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading analytics...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-charts">
            {/* Year Selector */}
            <div className="year-selector-container">
                <div className="year-selector-header">
                    <h4 className="year-selector-title">
                        <i className="bi bi-calendar-range me-2"></i>
                        Analytics Year Filter
                    </h4>
                    <div className="year-selector-controls">
                        <div className="year-select-wrapper">
                            <i className="bi bi-calendar3 select-icon"></i>
                            <select
                                className="year-select"
                                value={selectedYear}
                                onChange={handleYearChange}
                            >
                                {yearOptions.map(year => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {selectedYear !== currentYear && (
                            <button
                                className="btn-current-year"
                                onClick={handleCurrentYear}
                                title="Return to current year"
                            >
                                <i className="bi bi-arrow-counterclockwise me-1"></i>
                                Current Year
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="row g-4">
                {/* Patient Registrations Chart - Area Chart */}
                <div className="col-lg-6">
                    <div className="admin-card chart-card patient-chart">
                        <div className="chart-header stats-header patient-header">
                            <div className="header-title">
                                <h5 className="chart-title">
                                    <i className="bi bi-person-plus me-2"></i>
                                    Patient Registrations
                                </h5>
                                <span className="chart-subtitle">Year {selectedYear}</span>
                            </div>
                            {patientChartStats && (
                                <div className="chart-mini-stats">
                                    <div className="mini-stat" title={`Total Registrations: ${patientChartStats.total} patients registered in ${selectedYear}`}>
                                        <span className="mini-stat-value">{patientChartStats.total}</span>
                                        <span className="mini-stat-label">Total</span>
                                    </div>
                                    <div className="mini-stat highlight" title={`This Month: ${patientChartStats.thisMonth} new patients registered this month`}>
                                        <span className="mini-stat-value">{patientChartStats.thisMonth}</span>
                                        <span className="mini-stat-label">Month</span>
                                    </div>
                                    <div className="mini-stat" title={`Monthly Average: ${patientChartStats.avg} patients per month`}>
                                        <span className="mini-stat-value">{patientChartStats.avg}</span>
                                        <span className="mini-stat-label">Avg</span>
                                    </div>
                                    <div className="mini-stat" title={`Peak Month: ${patientChartStats.peak} - Highest registrations in a single month`}>
                                        <span className="mini-stat-value">{patientChartStats.peak}</span>
                                        <span className="mini-stat-label">Peak</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={patientData}>
                                    <defs>
                                        <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00a08b" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#00a08b" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#00a08b"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorPatients)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Appointments by Week Chart - Line Chart */}
                <div className="col-lg-6">
                    <div className="admin-card chart-card weekly-chart">
                        <div className="chart-header stats-header weekly-header">
                            <div className="header-title">
                                <h5 className="chart-title">
                                    <i className="bi bi-calendar-week me-2"></i>
                                    Appointments by Week
                                </h5>
                                <select
                                    className="week-month-select"
                                    value={selectedWeekMonth}
                                    onChange={(e) => setSelectedWeekMonth(parseInt(e.target.value))}
                                    title="Select month"
                                    style={{
                                        marginTop: '4px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        padding: '3px 10px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: '#fff',
                                        color: '#1f2937',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {monthOptions.map((mo) => (
                                        <option key={mo.value} value={mo.value}>
                                            {mo.label} {selectedYear}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {weeklyChartStats && (
                                <div className="chart-mini-stats">
                                    <div className="mini-stat" title={`Total This Month: ${weeklyChartStats.total} appointments in current month`}>
                                        <span className="mini-stat-value">{weeklyChartStats.total}</span>
                                        <span className="mini-stat-label">Total</span>
                                    </div>
                                    <div className="mini-stat highlight" title={`Current Week: ${weeklyChartStats.current} appointments this week`}>
                                        <span className="mini-stat-value">{weeklyChartStats.current}</span>
                                        <span className="mini-stat-label">Current</span>
                                    </div>
                                    <div className="mini-stat" title={`Weekly Average: ${weeklyChartStats.avg} appointments per week`}>
                                        <span className="mini-stat-value">{weeklyChartStats.avg}</span>
                                        <span className="mini-stat-label">Avg</span>
                                    </div>
                                    <div className="mini-stat" title={`Peak Week: ${weeklyChartStats.peak} - Highest appointments in a single week`}>
                                        <span className="mini-stat-value">{weeklyChartStats.peak}</span>
                                        <span className="mini-stat-label">Peak</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={weeklyAppointments}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="week" stroke="#6b7280" style={{ fontSize: '12px' }} />
                                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#059669"
                                        strokeWidth={3}
                                        dot={{ fill: '#059669', r: 6, strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 8, strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Appointments by Month Chart - Bar Chart */}
                <div className="col-lg-6">
                    <div className="admin-card chart-card monthly-chart">
                        <div className="chart-header stats-header monthly-header">
                            <div className="header-title">
                                <h5 className="chart-title">
                                    <i className="bi bi-calendar-check me-2"></i>
                                    Appointments by Month
                                </h5>
                                <span className="chart-subtitle">Year {selectedYear}</span>
                            </div>
                            {monthlyChartStats && (
                                <div className="chart-mini-stats">
                                    <div className="mini-stat" title={`Total This Year: ${monthlyChartStats.total} appointments in ${selectedYear}`}>
                                        <span className="mini-stat-value">{monthlyChartStats.total}</span>
                                        <span className="mini-stat-label">Total</span>
                                    </div>
                                    <div className="mini-stat highlight" title={`This Month: ${monthlyChartStats.thisMonth} appointments in current month`}>
                                        <span className="mini-stat-value">{monthlyChartStats.thisMonth}</span>
                                        <span className="mini-stat-label">Month</span>
                                    </div>
                                    <div className="mini-stat" title={`Monthly Average: ${monthlyChartStats.avg} appointments per month`}>
                                        <span className="mini-stat-value">{monthlyChartStats.avg}</span>
                                        <span className="mini-stat-label">Avg</span>
                                    </div>
                                    <div className="mini-stat" title={`Peak Month: ${monthlyChartStats.peak} - Highest appointments in a single month`}>
                                        <span className="mini-stat-value">{monthlyChartStats.peak}</span>
                                        <span className="mini-stat-label">Peak</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyAppointments}>
                                    <defs>
                                        <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.6} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <Bar dataKey="count" fill="url(#colorAppointments)" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Revenue by Month Chart - Area Chart */}
                <div className="col-lg-6">
                    <div className="admin-card chart-card revenue-chart">
                        <div className="chart-header revenue-header">
                            <div className="revenue-header-title">
                                <h5 className="chart-title">
                                    <i className="bi bi-graph-up-arrow me-2"></i>
                                    Revenue by Month
                                </h5>
                                <span className="chart-subtitle">Year {selectedYear}</span>
                            </div>
                            {financialOverview && (
                                <div className="revenue-mini-stats">
                                    <div className="mini-stat total" title={`Total Revenue: $${financialOverview.totalRevenue?.toLocaleString() || '0'} - All time earnings from completed appointments`}>
                                        <span className="mini-stat-value">${(financialOverview.totalRevenue / 1000)?.toFixed(1) || '0'}k</span>
                                        <span className="mini-stat-label">Total</span>
                                    </div>
                                    <div className="mini-stat month" title={`This Month: $${financialOverview.thisMonthRevenue?.toLocaleString() || '0'} - Revenue earned in current month`}>
                                        <span className="mini-stat-value">${(financialOverview.thisMonthRevenue / 1000)?.toFixed(1) || '0'}k</span>
                                        <span className="mini-stat-label">Month</span>
                                    </div>
                                    <div className="mini-stat platform" title={`Platform Fees: $${financialOverview.platformFees?.toLocaleString() || '0'} - Commission earned by platform (10%)`}>
                                        <span className="mini-stat-value">${(financialOverview.platformFees / 1000)?.toFixed(1) || '0'}k</span>
                                        <span className="mini-stat-label">Fees</span>
                                    </div>
                                    <div className="mini-stat doctor" title={`Doctor Earnings: $${financialOverview.doctorEarnings?.toLocaleString() || '0'} - Total amount paid to doctors`}>
                                        <span className="mini-stat-value">${(financialOverview.doctorEarnings / 1000)?.toFixed(1) || '0'}k</span>
                                        <span className="mini-stat-label">Doctors</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <ComposedChart data={revenueData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                                    <YAxis
                                        stroke="#6b7280"
                                        style={{ fontSize: '12px' }}
                                        tickFormatter={(value) => `$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                        }}
                                        formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                        name="Revenue"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#059669"
                                        strokeWidth={2}
                                        dot={{ fill: '#059669', r: 4, strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 6, strokeWidth: 2 }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardCharts;
