import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyticsApi } from '../../../services/adminApi';
import '../Css/DashboardCharts.css';

const DashboardCharts = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed

    const [loading, setLoading] = useState(true);
    const [patientData, setPatientData] = useState([]);
    const [weeklyAppointments, setWeeklyAppointments] = useState([]);
    const [monthlyAppointments, setMonthlyAppointments] = useState([]);
    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Generate year options from current year to 2030
    const yearOptions = [];
    for (let year = currentYear; year <= 2030; year++) {
        yearOptions.push(year);
    }

    useEffect(() => {
        fetchAllData(selectedYear);
    }, [selectedYear]);

    const fetchAllData = async (year) => {
        try {
            setLoading(true);
            const [patients, weekly, monthly] = await Promise.all([
                analyticsApi.getPatientRegistrations(year),
                analyticsApi.getAppointmentsByWeek(year, 0), // 0 = current month
                analyticsApi.getAppointmentsByMonth(year)
            ]);

            setPatientData(patients.data || []);
            setWeeklyAppointments(weekly.data || []);
            setMonthlyAppointments(monthly.data || []);
        } catch (error) {
            console.error('Error fetching analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

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
                    <div className="admin-card chart-card">
                        <div className="chart-header">
                            <h5 className="chart-title">
                                <i className="bi bi-person-plus me-2"></i>
                                Patient Registrations by Month
                            </h5>
                            <span className="chart-subtitle">Year {selectedYear}</span>
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
                    <div className="admin-card chart-card">
                        <div className="chart-header">
                            <h5 className="chart-title">
                                <i className="bi bi-calendar-week me-2"></i>
                                Appointments by Week
                            </h5>
                            <span className="chart-subtitle">Month {currentMonth}/{selectedYear}</span>
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
                    <div className="admin-card chart-card">
                        <div className="chart-header">
                            <h5 className="chart-title">
                                <i className="bi bi-calendar-check me-2"></i>
                                Appointments by Month
                            </h5>
                            <span className="chart-subtitle">Year {selectedYear}</span>
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
            </div>
        </div>
    );
};

export default DashboardCharts;
