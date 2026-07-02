import React, { useCallback, useEffect, useMemo, useState } from 'react';

import pharmacyApi from '../../api/pharmacyApi';

import { MetricCard, money } from './PharmacyShared';
import PharmacyOverviewReports from './PharmacyOverviewReports';
import {
  INVENTORY_SUMMARY_PAGE_SIZE,
  buildOverviewMetricModel,
  summarizeInventoryRisk,
} from '../../utils/pharmacy/pharmacyOverviewMetrics';

export default function PharmacyOverviewTab({ orders, workItems, balance }) {
  const [inventorySummary, setInventorySummary] = useState({
    total: 0,
    lowStock: 0,
    out: 0,
    expiringSoon: 0,
    riskTotal: 0,
    attentionItems: [],
    failed: false,
  });

  const loadInventorySummary = useCallback(async () => {
    try {
      const data = await pharmacyApi.getInventory({ page: 0, size: INVENTORY_SUMMARY_PAGE_SIZE });
      const items = Array.isArray(data.content) ? data.content : [];
      const summary = summarizeInventoryRisk(items);
      setInventorySummary({
        total: data.totalElements ?? items.length,
        ...summary,
        failed: false,
      });
    } catch {
      setInventorySummary((current) => ({ ...current, failed: true }));
    }
  }, []);

  useEffect(() => {
    loadInventorySummary();
  }, [loadInventorySummary]);

  const overviewMetrics = useMemo(() => buildOverviewMetricModel({
    workItems,
    orders,
    balance,
    inventorySummary,
  }), [balance, inventorySummary, orders, workItems]);

  return (
    <>
      <div className="pharmacy-metrics-grid is-overview-dashboard">
        <MetricCard
          label="New Requests"
          value={overviewMetrics.newRequests}
          hint="Awaiting intake"
          icon="support_agent"
          tone="warning"
        />
        <MetricCard
          label="Active Orders"
          value={overviewMetrics.activeOrders}
          hint="In workflow"
          icon="receipt_long"
          tone="info"
        />
        <MetricCard
          label="Payment Due"
          value={overviewMetrics.paymentDueCount}
          hint={`${money(overviewMetrics.unpaidValue)} unpaid`}
          icon="payments"
          tone="warning"
        />
        <MetricCard
          label="Inventory Risk"
          value={overviewMetrics.inventoryRiskTotal}
          hint={`${inventorySummary.lowStock} low / ${inventorySummary.out} out / ${inventorySummary.expiringSoon} expiring`}
          icon="inventory_2"
          tone="danger"
        />
        <MetricCard
          label="Revenue"
          value={money(overviewMetrics.revenueValue)}
          hint={overviewMetrics.revenueHint}
          icon="monitoring"
          tone="success"
        />
        <MetricCard
          label="Completion Rate"
          value={<span className="pharmacy-metric-rate is-success">Completed {overviewMetrics.completedRate}%</span>}
          icon="task_alt"
          tone="success"
        >
          <span className="pharmacy-metric-rate is-danger">Cancelled {overviewMetrics.cancelledRate}%</span>
        </MetricCard>
      </div>

      <PharmacyOverviewReports
        workItems={workItems}
        orders={orders}
        balance={balance}
        inventorySummary={inventorySummary}
      />
    </>
  );
}
