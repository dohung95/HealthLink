import React, { useCallback, useEffect, useMemo, useState } from 'react';

import pharmacyApi from '../../api/pharmacyApi';

import { MetricCard, money } from './PharmacyShared';
import PharmacyOverviewReports from './PharmacyOverviewReports';

const LOW_STOCK_THRESHOLD = 10;
const INVENTORY_SUMMARY_PAGE_SIZE = 5000;
const ACTIVE_ORDER_STAGES = new Set([
  'AWAITING_PAYMENT',
  'REVISION_REQUESTED',
  'PREPARING',
  'READY',
  'SHIPPING',
  'DELIVERED',
]);

function summarizeInventoryItems(items) {
  return items.reduce((summary, item) => {
    const availableQuantity = Number(item.availableQuantity ?? 0);
    if (availableQuantity <= 0) {
      return { ...summary, out: summary.out + 1 };
    }
    if (availableQuantity <= LOW_STOCK_THRESHOLD) {
      return { ...summary, lowStock: summary.lowStock + 1 };
    }
    return { ...summary, available: summary.available + 1 };
  }, { available: 0, lowStock: 0, out: 0 });
}

export default function PharmacyOverviewTab({ orders, workItems, balance }) {
  const [inventorySummary, setInventorySummary] = useState({
    total: 0,
    available: 0,
    lowStock: 0,
    out: 0,
    failed: false,
  });

  const loadInventorySummary = useCallback(async () => {
    try {
      const data = await pharmacyApi.getInventory({ page: 0, size: 200 });
      const items = Array.isArray(data.content) ? data.content : [];
      const summary = summarizeInventoryItems(items);
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

  const overviewMetrics = useMemo(() => {
    const items = Array.isArray(workItems) ? workItems : [];
    return {
      requests: items.filter((item) => item.workflowStage === 'NEW_REQUEST').length,
      orders: items.filter((item) => item.hasOrder && ACTIVE_ORDER_STAGES.has(item.workflowStage)).length,
      revenue: money(balance?.totalEarnings ?? 0),
    };
  }, [balance?.totalEarnings, workItems]);

  return (
    <>
      <div className="pharmacy-metrics-grid">
        <MetricCard
          label="Requests"
          value={overviewMetrics.requests}
          hint="New requests"
          icon="support_agent"
          tone="warning"
        />
        <MetricCard
          label="Orders"
          value={overviewMetrics.orders}
          hint="Active order work"
          icon="receipt_long"
          tone="info"
        />
        <MetricCard
          label="Inventory"
          value={inventorySummary.total}
          hint={inventorySummary.failed ? 'Unable to load stock summary' : `${inventorySummary.available} available`}
          icon="inventory_2"
          tone="success"
        >
          {!inventorySummary.failed && (
            <ul className="pharmacy-metric-stock-list" aria-label="Inventory stock breakdown">
              <li className="is-available"><i /> <b>{inventorySummary.available}</b> available</li>
              <li className="is-low"><i /> <b>{inventorySummary.lowStock}</b> low stock</li>
              <li className="is-out"><i /> <b>{inventorySummary.out}</b> out</li>
            </ul>
          )}
        </MetricCard>
        <MetricCard
          label="Revenue"
          value={overviewMetrics.revenue}
          hint="Lifetime earnings"
          icon="monitoring"
          tone="success"
        />
      </div>

      <PharmacyOverviewReports workItems={workItems} orders={orders} />
    </>
  );
}

