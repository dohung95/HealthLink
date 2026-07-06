import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyticsApi } from '../../../api/adminApi';
import '../Css/DashboardCharts.css';

const AXIS_MARGIN = { top: 24, right: 16, left: 8, bottom: 34 };
const AXIS_LABEL_STYLE = { fontSize: '12px', fill: '#6b7280' };
const Y_AXIS_LABEL_STYLE = { ...AXIS_LABEL_STYLE, textAnchor: 'start' };

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const renderDonutPercentLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const DashboardCharts = () => {
    const currentYear = new Date().getFullYear();

    const [loading, setLoading] = useState(true);
    const [patientData, setPatientData] = useState([]);
    const [appointmentsSplit, setAppointmentsSplit] = useState([]);
    const [revenueSplit, setRevenueSplit] = useState([]);
    const [registrationsSplit, setRegistrationsSplit] = useState([]);
    const [weeklyPatientData, setWeeklyPatientData] = useState([]);
    const [weeklyAppointmentsSplit, setWeeklyAppointmentsSplit] = useState([]);
    const [weeklyRevenueSplit, setWeeklyRevenueSplit] = useState([]);
    const [weeklyRegistrationsSplit, setWeeklyRegistrationsSplit] = useState([]);
    const [hourSplit, setHourSplit] = useState([]);
    const [overviewStats, setOverviewStats] = useState(null);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(0); // 0 = All months (yearly view), 1-12 = drill down to weeks within that month

    // Generate year options from 2024 to 2030
    const yearOptions = [];
    for (let year = 2024; year <= 2030; year++) {
        yearOptions.push(year);
    }

    useEffect(() => {
        fetchAllData(selectedYear);
    }, [selectedYear]);

    useEffect(() => {
        if (selectedMonth === 0) return;
        fetchWeeklyData(selectedYear, selectedMonth);
    }, [selectedYear, selectedMonth]);

    useEffect(() => {
        analyticsApi.getAppointmentsByHourSplit(selectedYear, selectedMonth)
            .then(res => setHourSplit(res.data || []))
            .catch(error => console.error('Error fetching appointments by hour:', error));
    }, [selectedYear, selectedMonth]);

    useEffect(() => {
        analyticsApi.getOverviewStats()
            .then(res => setOverviewStats(res))
            .catch(error => console.error('Error fetching overview stats:', error));
    }, []);

    const fetchAllData = async (year) => {
        try {
            setLoading(true);
            const [patients, appointments, revenue, registrations] = await Promise.all([
                analyticsApi.getPatientRegistrations(year),
                analyticsApi.getAppointmentsByMonthSplit(year),
                analyticsApi.getRevenueByMonthSplit(year),
                analyticsApi.getRegistrationsByRole(year)
            ]);

            setPatientData(patients.data || []);
            setAppointmentsSplit(appointments.data || []);
            setRevenueSplit(revenue.data || []);
            setRegistrationsSplit(registrations.data || []);
        } catch (error) {
            console.error('Error fetching analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWeeklyData = async (year, month) => {
        try {
            setLoading(true);
            const [patients, appointments, revenue, registrations] = await Promise.all([
                analyticsApi.getPatientRegistrationsByWeek(year, month),
                analyticsApi.getAppointmentsByWeekSplit(year, month),
                analyticsApi.getRevenueByWeekSplit(year, month),
                analyticsApi.getRegistrationsByWeekRole(year, month)
            ]);

            setWeeklyPatientData(patients.data || []);
            setWeeklyAppointmentsSplit(appointments.data || []);
            setWeeklyRevenueSplit(revenue.data || []);
            setWeeklyRegistrationsSplit(registrations.data || []);
        } catch (error) {
            console.error('Error fetching weekly analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Drill down to the weekly breakdown when a specific month is selected
    const filteredPatientData = selectedMonth === 0 ? patientData : weeklyPatientData;
    const filteredAppointmentsSplit = selectedMonth === 0 ? appointmentsSplit : weeklyAppointmentsSplit;
    const filteredRevenueSplit = selectedMonth === 0 ? revenueSplit : weeklyRevenueSplit;
    const filteredRegistrationsSplit = selectedMonth === 0 ? registrationsSplit : weeklyRegistrationsSplit;

    // Calculate derived stats from chart data
    const patientChartStats = useMemo(() => {
        if (!filteredPatientData.length) return null;
        const total = filteredPatientData.reduce((sum, d) => sum + (d.count || 0), 0);
        const avg = Math.round(total / filteredPatientData.length);
        const peak = Math.max(...filteredPatientData.map(d => d.count || 0));
        return { total, avg, peak };
    }, [filteredPatientData]);

    const appointmentsChartStats = useMemo(() => {
        if (!filteredAppointmentsSplit.length) return null;
        const online = filteredAppointmentsSplit.reduce((sum, d) => sum + (d.valueA || 0), 0);
        const homeVisit = filteredAppointmentsSplit.reduce((sum, d) => sum + (d.valueB || 0), 0);
        return { online, homeVisit, total: online + homeVisit };
    }, [filteredAppointmentsSplit]);

    const appointmentsPieData = useMemo(() => {
        if (!appointmentsChartStats) return [];
        return [
            { name: 'Online', value: appointmentsChartStats.online },
            { name: 'Home Visit', value: appointmentsChartStats.homeVisit }
        ];
    }, [appointmentsChartStats]);

    const hourChartStats = useMemo(() => {
        if (!hourSplit.length) return null;
        const peak = hourSplit.reduce((max, d) => {
            const count = (d.valueA || 0) + (d.valueB || 0);
            return count > max.count ? { hour: d.month, count } : max;
        }, { hour: null, count: 0 });
        return peak.hour ? peak : null;
    }, [hourSplit]);

    const revenueChartStats = useMemo(() => {
        if (!filteredRevenueSplit.length) return null;
        const online = filteredRevenueSplit.reduce((sum, d) => sum + (d.valueA || 0), 0);
        const homeVisit = filteredRevenueSplit.reduce((sum, d) => sum + (d.valueB || 0), 0);
        return { online, homeVisit, total: online + homeVisit };
    }, [filteredRevenueSplit]);

    const revenuePieData = useMemo(() => {
        if (!revenueChartStats) return [];
        return [
            { name: 'Online Revenue', value: revenueChartStats.online },
            { name: 'Home Visit Revenue', value: revenueChartStats.homeVisit }
        ];
    }, [revenueChartStats]);

    const registrationsChartStats = useMemo(() => {
        if (!filteredRegistrationsSplit.length) return null;
        const doctors = filteredRegistrationsSplit.reduce((sum, d) => sum + (d.valueA || 0), 0);
        const pharmacies = filteredRegistrationsSplit.reduce((sum, d) => sum + (d.valueB || 0), 0);
        return { doctors, pharmacies, total: doctors + pharmacies };
    }, [filteredRegistrationsSplit]);

    const handleYearChange = (e) => {
        setSelectedYear(parseInt(e.target.value));
    };

    const handleMonthChange = (e) => {
        setSelectedMonth(parseInt(e.target.value));
    };

    const handleCurrentYear = () => {
        setSelectedYear(currentYear);
    };

    const xAxisUnitLabel = selectedMonth === 0 ? '(Month)' : '(Week)';

    const periodLabel = selectedMonth === 0
        ? `Year ${selectedYear}`
        : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

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
            {/* Charts Section Intro */}
            <div className="mb-3">
                <h2 className="admin-page-title mb-1">Analytics Overview</h2>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                    The charts below give you a comprehensive <br/>view of system health, key metrics, and healthcare operations.
                </p>
            </div>

            <div className="row g-4">
                {/* Left column reserved for future work */}
                <div className="col-lg-6" style={{ position: 'relative' }}>
                    <div className="overview-stat-circle-wrap">
                        <div className="overview-stat-circle circle-appointments" style={{ left: '145px', top: '5px' }}>
                            <span className="overview-stat-label">Total Appointments</span>
                            <span className="overview-stat-value">{overviewStats ? overviewStats.totalAppointments.toLocaleString() : '—'}</span>
                        </div>
                        <div className="overview-stat-circle circle-revenue" style={{ left: '278px', top: '102px' }}>
                            <span className="overview-stat-label">Total Revenue</span>
                            <span className="overview-stat-value">{overviewStats ? `$${Number(overviewStats.totalRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}</span>
                        </div>
                        <div className="overview-stat-circle circle-patients" style={{ left: '227px', top: '258px' }}>
                            <span className="overview-stat-label">Registered Patients</span>
                            <span className="overview-stat-value">{overviewStats ? overviewStats.totalPatients.toLocaleString() : '—'}</span>
                        </div>
                        <div className="overview-stat-circle circle-doctors" style={{ left: '63px', top: '258px' }}>
                            <span className="overview-stat-label">Registered Doctors</span>
                            <span className="overview-stat-value">{overviewStats ? overviewStats.totalDoctors.toLocaleString() : '—'}</span>
                        </div>
                        <div className="overview-stat-circle circle-pharmacies" style={{ left: '12px', top: '102px' }}>
                            <span className="overview-stat-label">Registered Pharmacies</span>
                            <span className="overview-stat-value">{overviewStats ? overviewStats.totalPharmacies.toLocaleString() : '—'}</span>
                        </div>
                    </div>
                </div>

                {/* Booking Hours Chart - Online vs Home Visit */}
                <div className="col-lg-6" style={{ position: 'relative', borderLeft: '1px solid #e5e7eb', paddingLeft: '24px' }}>
                    <div className="d-flex justify-content-end align-items-center gap-2 mb-2">
                        <div className="year-select-wrapper">
                            <i className="bi bi-calendar-month select-icon"></i>
                            <select
                                className="year-select"
                                value={selectedMonth}
                                onChange={handleMonthChange}
                            >
                                <option value={0}>All Months</option>
                                {MONTH_NAMES.map((name, index) => (
                                    <option key={name} value={index + 1}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>
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
                    <div className="admin-card chart-card booking-hours-chart">
                                <div className="chart-header booking-hours-header">
                                    <h5 className="chart-title">
                                        <i className="bi bi-clock-history me-2"></i>
                                        Booking Hours
                                    </h5>
                                    <span className="chart-subtitle">Online vs Home Visit &middot; {periodLabel}</span>
                                </div>
                                <div className="chart-container">
                                    <ResponsiveContainer width="100%" height={320}>
                                        <AreaChart data={hourSplit} margin={AXIS_MARGIN}>
                                            <defs>
                                                <linearGradient id="colorHourOnline" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
                                                </linearGradient>
                                                <linearGradient id="colorHourHomeVisit" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis
                                                dataKey="month"
                                                stroke="#6b7280"
                                                style={{ fontSize: '11px' }}
                                                axisLine={false}
                                                tickLine={false}
                                                interval={1}
                                                label={{ value: '(Hour)', position: 'insideBottomRight', offset: -10, style: AXIS_LABEL_STYLE }}
                                            />
                                            <YAxis
                                                stroke="#6b7280"
                                                style={{ fontSize: '12px' }}
                                                axisLine={false}
                                                tickLine={false}
                                                allowDecimals={false}
                                                label={{ value: 'Appointments (n)', position: 'top', offset: 15, dx: -38, style: Y_AXIS_LABEL_STYLE }}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#fff',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                                }}
                                            />
                                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px' }} />
                                            <Area
                                                type="monotone"
                                                dataKey="valueA"
                                                name="Online"
                                                stroke="#6366f1"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorHourOnline)"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="valueB"
                                                name="Home Visit"
                                                stroke="#f59e0b"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorHourHomeVisit)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                {hourChartStats && (
                                    <div className="chart-footer-stats">
                                        <div className="footer-stat">
                                            <div className="footer-stat-main">
                                                <span className="footer-stat-value">{hourChartStats.hour}</span>
                                                <span className="footer-stat-label">Peak Hour</span>
                                            </div>
                                            <span className="footer-stat-desc">{hourChartStats.count} bookings &middot; {periodLabel}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                {/* Appointments Chart - Online vs Home Visit */}
                <div className="col-12">
                    <div className="admin-card chart-card monthly-chart">
                        <div className="chart-header monthly-header">
                            <h5 className="chart-title">
                                <i className="bi bi-calendar-check me-2"></i>
                                Appointments
                            </h5>
                            <span className="chart-subtitle">Online vs Home Visit &middot; {periodLabel}</span>
                        </div>
                        <div className="chart-body-with-stats">
                            {appointmentsChartStats && (
                                <div className="chart-side-stats">
                                    <div className="side-stat total">
                                        <span className="side-stat-dot"></span>
                                        <div className="side-stat-text">
                                            <span className="side-stat-label">Total Appointments</span>
                                            <span className="side-stat-value">{appointmentsChartStats.total}</span>
                                            <p className="side-stat-desc">All appointments (online + home visit) booked in {periodLabel}.</p>
                                        </div>
                                    </div>
                                    <div className="side-stat-donut">
                                        <ResponsiveContainer width="100%" height={150}>
                                            <PieChart>
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#fff',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                                    }}
                                                />
                                                <Pie
                                                    data={appointmentsPieData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={38}
                                                    outerRadius={58}
                                                    paddingAngle={3}
                                                    labelLine={false}
                                                    label={renderDonutPercentLabel}
                                                >
                                                    <Cell fill="#6366f1" />
                                                    <Cell fill="#f59e0b" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="donut-legend">
                                            <span className="donut-legend-item">
                                                <i className="donut-legend-dot online"></i>
                                                Online &middot; {appointmentsChartStats.online}
                                            </span>
                                            <span className="donut-legend-item">
                                                <i className="donut-legend-dot homevisit"></i>
                                                Home Visit &middot; {appointmentsChartStats.homeVisit}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="chart-container flex-grow-1">
                                <ResponsiveContainer width="100%" height={320}>
                                    <LineChart data={filteredAppointmentsSplit} margin={AXIS_MARGIN}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="month"
                                            stroke="#6b7280"
                                            style={{ fontSize: '12px' }}
                                            axisLine={false}
                                            tickLine={false}
                                            label={{ value: xAxisUnitLabel, position: 'insideBottomRight', offset: -10, style: AXIS_LABEL_STYLE }}
                                        />
                                        <YAxis
                                            stroke="#6b7280"
                                            style={{ fontSize: '12px' }}
                                            axisLine={false}
                                            tickLine={false}
                                            allowDecimals={false}
                                            label={{ value: 'Appointments (n)', position: 'top', offset: 15, dx: -38, style: Y_AXIS_LABEL_STYLE }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                        <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px' }} />
                                        <Line
                                            type="monotone"
                                            dataKey="valueA"
                                            name="Online"
                                            stroke="#6366f1"
                                            strokeWidth={2.5}
                                            dot={false}
                                            activeDot={{ r: 5 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="valueB"
                                            name="Home Visit"
                                            stroke="#f59e0b"
                                            strokeWidth={2.5}
                                            dot={false}
                                            activeDot={{ r: 5 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Patient Registrations Chart - Area Chart */}
                <div className="col-lg-6">
                    <div className="admin-card chart-card patient-chart">
                        <div className="chart-header patient-header">
                            <h5 className="chart-title">
                                <i className="bi bi-person-plus me-2"></i>
                                Patient Registrations
                            </h5>
                            <span className="chart-subtitle">{periodLabel}</span>
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={320}>
                                <AreaChart data={filteredPatientData} margin={AXIS_MARGIN}>
                                    <defs>
                                        <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00a08b" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#00a08b" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="month"
                                        stroke="#6b7280"
                                        style={{ fontSize: '12px'}}
                                        axisLine={false}
                                        tickLine={false}
                                        label={{ value: xAxisUnitLabel, position: 'insideBottomRight', offset: -10, style: AXIS_LABEL_STYLE }}
                                    />
                                    <YAxis
                                        stroke="#6b7280"
                                        style={{ fontSize: '12px' }}
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                        label={{ value: 'Patients (n)', position: 'top', offset: 15, dx: -38, style: Y_AXIS_LABEL_STYLE }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                        }}
                                        formatter={(value) => [`${value} patients`, 'New Registrations']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        name="New Patients"
                                        stroke="#00a08b"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorPatients)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        {patientChartStats && (
                            <div className="chart-footer-stats">
                                <div className="footer-stat">
                                    <div className="footer-stat-main">
                                        <span className="footer-stat-value">{patientChartStats.total}</span>
                                        <span className="footer-stat-label">Total</span>
                                    </div>
                                    <span className="footer-stat-desc">Patients in {periodLabel}</span>
                                </div>
                                <div className="footer-stat">
                                    <div className="footer-stat-main">
                                        <span className="footer-stat-value">{patientChartStats.avg}</span>
                                        <span className="footer-stat-label">Avg</span>
                                    </div>
                                    <span className="footer-stat-desc">Per month</span>
                                </div>
                                <div className="footer-stat">
                                    <div className="footer-stat-main">
                                        <span className="footer-stat-value">{patientChartStats.peak}</span>
                                        <span className="footer-stat-label">Peak</span>
                                    </div>
                                    <span className="footer-stat-desc">Highest month</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Partner Registrations Chart - Doctors vs Pharmacies */}
                <div className="col-lg-6">
                    <div className="admin-card chart-card weekly-chart">
                        <div className="chart-header weekly-header">
                            <h5 className="chart-title">
                                <i className="bi bi-person-badge me-2"></i>
                                Partner Registrations
                            </h5>
                            <span className="chart-subtitle">Doctors vs Pharmacies &middot; {periodLabel}</span>
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={filteredRegistrationsSplit} margin={AXIS_MARGIN}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="month"
                                        stroke="#6b7280"
                                        style={{ fontSize: '12px' }}
                                        axisLine={false}
                                        tickLine={false}
                                        label={{ value: xAxisUnitLabel, position: 'insideBottomRight', offset: -10, style: AXIS_LABEL_STYLE }}
                                    />
                                    <YAxis
                                        stroke="#6b7280"
                                        style={{ fontSize: '12px' }}
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                        label={{ value: 'Registrations (n)', position: 'top', offset: 15, dx: -38, style: Y_AXIS_LABEL_STYLE }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar dataKey="valueA" name="Doctors" fill="#059669" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="valueB" name="Pharmacies" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {registrationsChartStats && (
                            <div className="chart-footer-stats">
                                <div className="footer-stat">
                                    <div className="footer-stat-main">
                                        <span className="footer-stat-value">{registrationsChartStats.total}</span>
                                        <span className="footer-stat-label">Total</span>
                                    </div>
                                    <span className="footer-stat-desc">Partners in {periodLabel}</span>
                                </div>
                                <div className="footer-stat">
                                    <div className="footer-stat-main">
                                        <span className="footer-stat-value">{registrationsChartStats.doctors}</span>
                                        <span className="footer-stat-label">Doctors</span>
                                    </div>
                                    <span className="footer-stat-desc">New this year</span>
                                </div>
                                <div className="footer-stat">
                                    <div className="footer-stat-main">
                                        <span className="footer-stat-value">{registrationsChartStats.pharmacies}</span>
                                        <span className="footer-stat-label">Pharmacies</span>
                                    </div>
                                    <span className="footer-stat-desc">New this year</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Revenue Chart - Online vs Home Visit */}
                <div className="col-12">
                    <div className="admin-card chart-card revenue-chart">
                        <div className="chart-header revenue-header">
                            <h5 className="chart-title">
                                <i className="bi bi-graph-up-arrow me-2"></i>
                                Revenue
                            </h5>
                            <span className="chart-subtitle">Online vs Home Visit &middot; {periodLabel}</span>
                        </div>
                        <div className="chart-body-with-stats">
                            {revenueChartStats && (
                                <div className="chart-side-stats">
                                    <div className="side-stat total">
                                        <span className="side-stat-dot"></span>
                                        <div className="side-stat-text">
                                            <span className="side-stat-label">Total Revenue</span>
                                            <span className="side-stat-value">${(revenueChartStats.total / 1000).toFixed(1)}k</span>
                                            <p className="side-stat-desc">All revenue (online + home visit) from completed appointments in {periodLabel}.</p>
                                        </div>
                                    </div>
                                    <div className="side-stat-donut">
                                        <ResponsiveContainer width="100%" height={150}>
                                            <PieChart>
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#fff',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                                    }}
                                                    formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
                                                />
                                                <Pie
                                                    data={revenuePieData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={38}
                                                    outerRadius={58}
                                                    paddingAngle={3}
                                                    labelLine={false}
                                                    label={renderDonutPercentLabel}
                                                >
                                                    <Cell fill="#10b981" />
                                                    <Cell fill="#0369a1" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="donut-legend">
                                            <span className="donut-legend-item">
                                                <i className="donut-legend-dot revenue-online"></i>
                                                Online &middot; ${(revenueChartStats.online / 1000).toFixed(1)}k
                                            </span>
                                            <span className="donut-legend-item">
                                                <i className="donut-legend-dot revenue-homevisit"></i>
                                                Home Visit &middot; ${(revenueChartStats.homeVisit / 1000).toFixed(1)}k
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="chart-container flex-grow-1">
                                <ResponsiveContainer width="100%" height={320}>
                                    <LineChart data={filteredRevenueSplit} margin={AXIS_MARGIN}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="month"
                                            stroke="#6b7280"
                                            style={{ fontSize: '12px' }}
                                            axisLine={false}
                                            tickLine={false}
                                            label={{ value: xAxisUnitLabel, position: 'insideBottomRight', offset: -10, style: AXIS_LABEL_STYLE }}
                                        />
                                        <YAxis
                                            stroke="#6b7280"
                                            style={{ fontSize: '12px' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(value) => `$${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                                            label={{ value: 'Revenue ($)', position: 'top', offset: 15, dx: -38, style: Y_AXIS_LABEL_STYLE }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                            }}
                                            formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
                                        />
                                        <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px' }} />
                                        <Line
                                            type="monotone"
                                            dataKey="valueA"
                                            name="Online Revenue"
                                            stroke="#10b981"
                                            strokeWidth={2.5}
                                            dot={false}
                                            activeDot={{ r: 5 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="valueB"
                                            name="Home Visit Revenue"
                                            stroke="#0369a1"
                                            strokeWidth={2.5}
                                            dot={false}
                                            activeDot={{ r: 5 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardCharts;
