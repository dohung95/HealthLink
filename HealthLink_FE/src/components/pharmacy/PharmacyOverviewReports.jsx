import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money } from '../../utils/pharmacy/pharmacyHelpers';
import {
  buildInventoryRiskData,
  buildRevenueTrend,
  buildWorkflowQueueData,
  summarizePaymentOrders,
} from '../../utils/pharmacy/pharmacyOverviewMetrics';

export default function PharmacyOverviewReports({ workItems, orders, inventorySummary }) {
  const workflowQueueData = useMemo(() => buildWorkflowQueueData(workItems), [workItems]);
  const paymentSummary = useMemo(() => summarizePaymentOrders(orders), [orders]);
  const revenueTrend = useMemo(() => buildRevenueTrend(orders), [orders]);
  const inventoryRiskData = useMemo(() => buildInventoryRiskData(inventorySummary), [inventorySummary]);

  const hasAnyData = workflowQueueData.some((r) => r.count > 0)
    || paymentSummary.paidOrders.length > 0
    || paymentSummary.paymentDueOrders.length > 0
    || inventoryRiskData.length > 0;

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
            <p>Current workload that still needs pharmacy action.</p>
          </div>
        </div>
        <div className="pharmacy-workflow-queue-chart">
          {workflowQueueData.map((row) => (
            <div className="pharmacy-workflow-queue-row" key={row.key}>
              <span>{row.label}</span>
              <div className="pharmacy-workflow-queue-track">
                <i className={`tone-${row.tone}`} style={{ width: `${row.percent}%` }} />
              </div>
              <strong>{row.count}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="pharmacy-card pharmacy-overview-report-card">
        <div className="pharmacy-card-header">
          <div>
            <h2>Revenue &amp; Payment</h2>
            <p>{revenueTrend.hasTrend ? 'Paid revenue in the last 30 days.' : 'Current payment snapshot from available orders.'}</p>
          </div>
        </div>

        {revenueTrend.hasTrend ? (
          <div className="pharmacy-chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueTrend.trend} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}K`} />
                <Tooltip formatter={(value) => [money(value), 'Paid revenue']} />
                <Bar dataKey="revenue" fill="#0f52ba" radius={[4, 4, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="pharmacy-overview-empty-chart">Order date fields are unavailable. Showing current payment totals instead.</div>
        )}

        <div className="pharmacy-overview-summary-row">
          <span>Paid orders <b>{paymentSummary.paidOrders.length}</b></span>
          <span>Unpaid value <b>{money(paymentSummary.unpaidValue)}</b></span>
          <span>Avg order value <b>{money(paymentSummary.averageOrderValue)}</b></span>
        </div>
      </section>

      <section className="pharmacy-card pharmacy-overview-report-card">
        <div className="pharmacy-card-header">
          <div>
            <h2>Inventory Risk</h2>
            <p>Stock and expiry signals that need review.</p>
          </div>
        </div>
        <div className="pharmacy-inventory-risk-chart">
          {inventoryRiskData.map((row) => (
            <div className="pharmacy-inventory-risk-row" key={row.key}>
              <span>{row.label}</span>
              <strong className={row.className}>{row.count}</strong>
            </div>
          ))}
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
    </div>
  );
}
