import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { money } from '../../utils/pharmacy/pharmacyHelpers';

const STATUS_COLORS = {
  AWAITING_PAYMENT: '#f59e0b',
  PREPARING: '#3b82f6',
  READY: '#10b981',
  SHIPPING: '#8b5cf6',
  DELIVERED: '#06b6d4',
  COMPLETED: '#059669',
  CANCELLED: '#ef4444',
  REFUNDED: '#f97316',
};

export default function PharmacyOverviewReports({ workItems, orders }) {
  const orderStatusData = useMemo(() => {
    const counts = {};
    const items = Array.isArray(workItems) ? workItems : [];
    items.forEach((item) => {
      const stage = (item.workflowStage || item.status || 'UNKNOWN').toUpperCase();
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([stage, count]) => ({
        stage,
        count,
        fill: STATUS_COLORS[stage] || '#94a3b8',
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [workItems]);

  const opsMetrics = useMemo(() => {
    const items = Array.isArray(workItems) ? workItems : [];
    const orderItems = Array.isArray(orders) ? orders : [];
    const totalRequests = items.filter((i) => i.workflowStage === 'NEW_REQUEST').length;
    const totalOrders = items.filter((i) => i.hasOrder).length;
    const completed = items.filter((i) => i.workflowStage === 'COMPLETED' || i.workflowStage === 'DELIVERED').length;
    const cancelled = items.filter((i) => i.workflowStage === 'CANCELLED').length;
    const paidOrders = orderItems.filter((o) => (o.paymentStatus || '').toUpperCase() === 'PAID');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount || o.totalPrice || 0), 0);

    return {
      totalRequests,
      totalOrders,
      conversionRate: totalRequests > 0 ? Math.round((totalOrders / totalRequests) * 100) : 0,
      completionRate: totalOrders > 0 ? Math.round((completed / totalOrders) * 100) : 0,
      cancellationRate: totalOrders > 0 ? Math.round((cancelled / totalOrders) * 100) : 0,
      averageOrderValue: paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0,
      revenue: totalRevenue,
      paidOrderCount: paidOrders.length,
    };
  }, [workItems, orders]);

  if (orderStatusData.length === 0 && opsMetrics.totalOrders === 0) return null;

  return (
    <div className="pharmacy-overview-reports">
      <div className="pharmacy-ops-metrics">
        <div className="pharmacy-ops-card">
          <span className="pharmacy-ops-label">Conversion</span>
          <span className="pharmacy-ops-value">{opsMetrics.conversionRate}%</span>
          <span className="pharmacy-ops-hint">{opsMetrics.totalOrders} orders / {opsMetrics.totalRequests} requests</span>
        </div>
        <div className="pharmacy-ops-card">
          <span className="pharmacy-ops-label">Completion</span>
          <span className="pharmacy-ops-value">{opsMetrics.completionRate}%</span>
          <span className="pharmacy-ops-hint">of orders fulfilled</span>
        </div>
        <div className="pharmacy-ops-card">
          <span className="pharmacy-ops-label">Avg Order Value</span>
          <span className="pharmacy-ops-value">{money(opsMetrics.averageOrderValue)}</span>
          <span className="pharmacy-ops-hint">{opsMetrics.paidOrderCount} paid orders</span>
        </div>
        <div className="pharmacy-ops-card">
          <span className="pharmacy-ops-label">Cancellation</span>
          <span className="pharmacy-ops-value is-danger">{opsMetrics.cancellationRate}%</span>
          <span className="pharmacy-ops-hint">of total orders</span>
        </div>
      </div>

      {orderStatusData.length > 0 && (
        <section className="pharmacy-card pharmacy-card-chart">
          <div className="pharmacy-card-header">
            <div>
              <h2>Orders by Status</h2>
              <p>Active work items grouped by workflow stage.</p>
            </div>
          </div>
          <div className="pharmacy-chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={orderStatusData} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value) => [value, 'Orders']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {orderStatusData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}
