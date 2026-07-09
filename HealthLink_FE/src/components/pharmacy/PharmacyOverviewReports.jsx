import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { money } from '../../utils/pharmacy/pharmacyHelpers';
import {
  REVENUE_RANGES,
  buildInventoryRiskData,
  buildOverviewMetricModel,
  buildOverviewRecommendations,
  buildRevenueTrend,
  buildWorkflowQueueData,
  formatRevenueAxisTick,
  summarizePaymentOrders,
} from '../../utils/pharmacy/pharmacyOverviewMetrics';

export default function PharmacyOverviewReports({ workItems, orders, transactions, balance, inventorySummary }) {
  const [revenueRange, setRevenueRange] = useState('MONTH');
  const workflowQueueData = useMemo(
    () => buildWorkflowQueueData({ workItems, orders }),
    [orders, workItems],
  );
  const paymentSummary = useMemo(() => summarizePaymentOrders(orders), [orders]);
  const revenueTrend = useMemo(
    () => buildRevenueTrend({ orders, transactions, range: revenueRange }),
    [orders, revenueRange, transactions],
  );
  const inventoryRiskData = useMemo(() => buildInventoryRiskData(inventorySummary), [inventorySummary]);
  const overviewMetrics = useMemo(() => buildOverviewMetricModel({
    workItems,
    orders,
    balance,
    inventorySummary,
  }), [balance, inventorySummary, orders, workItems]);
  const recommendations = useMemo(() => buildOverviewRecommendations({
    workflowQueueData,
    inventorySummary,
    revenueTrend,
    overviewMetrics,
  }), [inventorySummary, overviewMetrics, revenueTrend, workflowQueueData]);

  const hasAnyData = workflowQueueData.some((row) => row.count > 0)
    || paymentSummary.paidOrders.length > 0
    || paymentSummary.paymentDueOrders.length > 0
    || inventoryRiskData.stock.some((row) => row.count > 0)
    || inventoryRiskData.expiring.count > 0
    || recommendations.length > 0;

  if (!hasAnyData) {
    return (
      <div className="pharmacy-overview-reports">
        <div className="pharmacy-empty compact">
          <span className="material-symbols-outlined">analytics</span>
          <h3>No overview report data yet</h3>
          <p>Requests, paid orders, and inventory risk will appear here when available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pharmacy-overview-reports">
      <section className="pharmacy-card pharmacy-overview-report-card">
        <div className="pharmacy-card-header">
          <div>
            <h2>Workflow Queue</h2>
            <p>Workload by current status, capped against a 10-item pressure scale.</p>
          </div>
        </div>
        <div className="pharmacy-workflow-queue-chart">
          {workflowQueueData.map((row) => (
            <div className="pharmacy-workflow-queue-row" key={row.key}>
              <span>{row.label}</span>
              <div className="pharmacy-workflow-queue-track" aria-label={`${row.label}: ${row.count} of 10`}>
                <i className={`tone-${row.tone}`} style={{ width: `${row.percent}%` }} />
              </div>
              <strong>{row.count}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="pharmacy-card pharmacy-overview-report-card">
        <div className="pharmacy-card-header pharmacy-card-header--with-actions">
          <div>
            <h2>Revenue &amp; Payment</h2>
            <p>{revenueTrend.hasTrend ? `${revenueTrend.sourceLabel} by ${revenueTrend.rangeLabel.toLowerCase()}.` : 'Current payment snapshot from available orders.'}</p>
          </div>
          <div className="pharmacy-chart-range-toggle" aria-label="Revenue chart range">
            {Object.values(REVENUE_RANGES).map((range) => (
              <button
                className={revenueRange === range.key ? 'is-active' : ''}
                key={range.key}
                onClick={() => setRevenueRange(range.key)}
                type="button"
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {revenueTrend.hasTrend ? (
          <div className="pharmacy-chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueTrend.trend} margin={{ top: 12, right: 12, bottom: 24, left: 8 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  label={{ value: 'Period', position: 'insideBottom', offset: -16, fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  ticks={revenueTrend.yTicks}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  tickFormatter={formatRevenueAxisTick}
                  width={54}
                  label={{ value: 'Revenue (USD)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                />
                <Tooltip formatter={(value) => [money(value), revenueTrend.sourceLabel]} />
                <Bar dataKey="revenue" fill="#0f52ba" radius={[4, 4, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="pharmacy-overview-empty-chart">No dated paid transactions are available for this range.</div>
        )}

      </section>

      <section className="pharmacy-card pharmacy-overview-report-card">
        <div className="pharmacy-card-header">
          <div>
            <h2>Inventory Risk</h2>
            <p>Stock and expiry signals that need review.</p>
          </div>
        </div>
        <div className="pharmacy-inventory-risk-chart">
          <div className="pharmacy-inventory-risk-row is-risk-all">
            {inventoryRiskData.stock.map((row) => (
              <span className="pharmacy-inventory-risk-pill" key={row.key}>
                <span>{row.label}</span>
                <strong className={row.className}>{row.count}</strong>
              </span>
            ))}
            <span className="pharmacy-inventory-risk-pill">
              <span>{inventoryRiskData.expiring.label}</span>
              <strong className={inventoryRiskData.expiring.className}>{inventoryRiskData.expiring.count}</strong>
            </span>
          </div>
        </div>
        {inventorySummary.attentionItems && inventorySummary.attentionItems.length > 0 && (
          <div className="pharmacy-inventory-attention-list">
            <p>Top attention</p>
            {inventorySummary.attentionItems.map((item) => (
              <span key={item.key}>
                <b>{item.name}</b>
                <small>{item.reason}</small>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="pharmacy-card pharmacy-overview-report-card pharmacy-overview-insights-card">
        <div className="pharmacy-card-header">
          <div>
            <h2>Insights &amp; Recommendations</h2>
            <p>Operational prompts based on the current queue, stock, and payments.</p>
          </div>
        </div>
        <div className="pharmacy-overview-insight-list">
          {recommendations.map((item) => (
            <div className={`pharmacy-overview-insight is-${item.tone}`} key={item.key}>
              <span className="material-symbols-outlined">{item.icon}</span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
