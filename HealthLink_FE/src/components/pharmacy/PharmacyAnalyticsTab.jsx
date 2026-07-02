import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { money } from '../../utils/pharmacy/pharmacyHelpers';
import pharmacyApi from '../../api/pharmacyApi';

const PERIODS = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
];

export default function PharmacyAnalyticsTab({ token, profile }) {
  const [period, setPeriod] = useState('30d');
  const [lang, setLang] = useState('vi');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!profile?.pharmacyId) return;
    setLoading(true);
    setError(null);

    pharmacyApi.getDemandAnalytics({ period, lang })
      .then(setData)
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load analytics');
      })
      .finally(() => setLoading(false));
  }, [period, lang, profile?.pharmacyId]);

  if (loading) {
    return (
      <div className="pharmacy-loading">
        <span className="material-symbols-outlined">analytics</span>
        Loading analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="pharmacy-error">
        <span className="material-symbols-outlined">error</span>
        {error}
      </div>
    );
  }

  const topMedicines = (data?.topMedicines || []).slice(0, 10);
  const trend = data?.trend || [];

  const chartColors = ['#003c90', '#059669', '#d97706', '#dc2626', '#7c3aed',
    '#0891b2', '#db2777', '#65a30d', '#0d9488', '#ca8a04'];

  return (
    <div className="pharmacy-analytics">
      <div className="pharmacy-analytics-header">
        <div className="pharmacy-analytics-title">
          <span className="material-symbols-outlined">analytics</span>
          <h2>Demand Analytics</h2>
        </div>
        <div className="pharmacy-analytics-period">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`pharmacy-analytics-period-btn ${period === p.value ? 'is-active' : ''}`}
              onClick={() => setPeriod(p.value)}
              type="button"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pharmacy-analytics-summary">
        <div className="pharmacy-analytics-stat">
          <span className="pharmacy-analytics-stat-label">Total Orders</span>
          <span className="pharmacy-analytics-stat-value">{data?.totalOrders || 0}</span>
        </div>
        <div className="pharmacy-analytics-stat">
          <span className="pharmacy-analytics-stat-label">Total Revenue</span>
          <span className="pharmacy-analytics-stat-value">{money(data?.totalRevenue)}</span>
        </div>
      </div>

      {data?.aiSummary && (
        <div className="pharmacy-analytics-ai-card">
          <div className="pharmacy-analytics-ai-header">
            <span className="material-symbols-outlined">insight</span>
            <strong>AI Insight</strong>
            <button
              className="pharmacy-lang-toggle"
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              type="button"
              title="Toggle language"
            >
              {lang === 'vi' ? 'EN' : 'VI'}
            </button>
          </div>
          <p>{data.aiSummary}</p>
        </div>
      )}

      <div className="pharmacy-analytics-grid">
        <div className="pharmacy-card">
          <h3>Top Selling Medicines</h3>
          {topMedicines.length === 0 ? (
            <p className="pharmacy-analytics-empty">No data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topMedicines} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="medicineName" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => [val, 'Sold']} />
                <Bar dataKey="soldQuantity" fill={chartColors[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="pharmacy-card">
          <h3>Order Trend</h3>
          {trend.length === 0 ? (
            <p className="pharmacy-analytics-empty">No data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="orderCount" stroke={chartColors[0]} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="pharmacy-card">
        <h3>Medicine Demand Breakdown</h3>
        {topMedicines.length === 0 ? (
          <p className="pharmacy-analytics-empty">No data for this period.</p>
        ) : (
          <div className="pharmacy-analytics-table-wrapper">
            <table className="pharmacy-analytics-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Medicine</th>
                  <th>Sold</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topMedicines.map((item, i) => (
                  <tr key={item.medicineName}>
                    <td>{i + 1}</td>
                    <td>{item.medicineName}</td>
                    <td>{item.soldQuantity}</td>
                    <td>{item.orderCount}</td>
                    <td>{money(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
