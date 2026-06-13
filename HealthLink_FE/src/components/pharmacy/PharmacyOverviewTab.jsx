import React, { useCallback, useEffect, useMemo, useState } from 'react';

import pharmacyApi from '../../api/pharmacyApi';

import {
  Avatar,
  InfoLine,
  MetricCard,
  getOrderTime,
  getProfileName,
  money,
  routeByTab,
} from './PharmacyShared';
import { OrderTable } from './PharmacyOrdersTab';

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

export default function PharmacyOverviewTab({ profile, orders, workItems, balance, navigate }) {
  const [inventorySummary, setInventorySummary] = useState({
    total: 0,
    available: 0,
    lowStock: 0,
    out: 0,
    failed: false,
  });

  const loadInventorySummary = useCallback(async () => {
    try {
      const firstPage = await pharmacyApi.getInventory({
        page: 0,
        size: INVENTORY_SUMMARY_PAGE_SIZE,
      });
      const totalPages = Number(firstPage?.totalPages ?? 1);
      const total = Number(firstPage?.totalElements ?? 0);
      const allItems = Array.isArray(firstPage?.content) ? [...firstPage.content] : [];

      for (let pageIndex = 1; pageIndex < totalPages; pageIndex += 1) {
        const pageData = await pharmacyApi.getInventory({
          page: pageIndex,
          size: INVENTORY_SUMMARY_PAGE_SIZE,
        });
        if (Array.isArray(pageData?.content)) {
          allItems.push(...pageData.content);
        }
      }

      setInventorySummary({
        total: total || allItems.length,
        ...summarizeInventoryItems(allItems),
        failed: false,
      });
    } catch {
      setInventorySummary((current) => ({ ...current, failed: true }));
    }
  }, []);

  useEffect(() => {
    loadInventorySummary();
  }, [loadInventorySummary]);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(getOrderTime(b) || 0) - new Date(getOrderTime(a) || 0))
    .slice(0, 5);

  const overviewMetrics = useMemo(() => {
    const items = Array.isArray(workItems) ? workItems : [];
    return {
      requests: items.filter((item) => item.workflowStage === 'NEW_REQUEST').length,
      orders: items.filter((item) => item.hasOrder && ACTIVE_ORDER_STAGES.has(item.workflowStage)).length,
      revenue: money(balance?.totalEarnings ?? profile?.totalEarnings ?? 0),
    };
  }, [balance?.totalEarnings, profile?.totalEarnings, workItems]);

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

      <div className="pharmacy-overview-grid">
        <section className="pharmacy-card pharmacy-card-large">
          <div className="pharmacy-card-header">
            <div>
              <h2>Recent Orders</h2>
              <p>Latest prescriptions and pharmacy orders.</p>
            </div>
            <button onClick={() => navigate(routeByTab.orders)} type="button">View All</button>
          </div>
          <OrderTable orders={recentOrders} compact />
        </section>

        <aside className="pharmacy-side-stack">
          <section className="pharmacy-card">
            <div className="pharmacy-store-profile">
              <Avatar profile={profile} />
              <div>
                <h2>{getProfileName(profile)}</h2>
                <p>ID: {profile?.pharmacyId || '-'}</p>
              </div>
            </div>
            <InfoLine icon="power_settings_new" label="Store Status" value={profile?.active ? 'Active' : 'Inactive'} />
            <InfoLine icon="verified" label="Verification" value={profile?.verified ? 'Verified' : 'Pending'} />
            <InfoLine icon="schedule" label="Operating Hours" value={profile?.open24Hours ? '24/7' : `${profile?.openTime || '--'} - ${profile?.closeTime || '--'}`} />
            <InfoLine icon="mark_email_read" label="Contact Email" value={profile?.email || '-'} />
            <button className="pharmacy-secondary-action" onClick={() => navigate(routeByTab.profile)} type="button">
              Edit Store Profile
            </button>
          </section>

          <section className="pharmacy-card">
            <h2>Quick Actions</h2>
            <button className="pharmacy-action-row" onClick={() => navigate(routeByTab.orders + '?group=NEW_REQUESTS')} type="button">
              <span className="material-symbols-outlined">support_agent</span>
              New Requests
            </button>
            <button className="pharmacy-action-row" onClick={() => navigate(routeByTab.orders + '?group=PAYMENT_DUE')} type="button">
              <span className="material-symbols-outlined">payments</span>
              Payment Due
            </button>
            <button className="pharmacy-action-row" onClick={() => navigate(routeByTab.orders + '?group=DELIVERY')} type="button">
              <span className="material-symbols-outlined">hourglass_empty</span>
              Fulfillment
            </button>
            <button className="pharmacy-action-row" onClick={() => navigate(routeByTab.wallet)} type="button">
              <span className="material-symbols-outlined">account_balance_wallet</span>
              Request withdrawal
            </button>
          </section>
        </aside>
      </div>
    </>
  );
}

