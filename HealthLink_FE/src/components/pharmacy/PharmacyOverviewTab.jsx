import React, { useState } from 'react';

import {
  Avatar,
  InfoLine,
  MetricCard,
  getOrderTime,
  getProfileName,
  money,
  normalize,
  routeByTab,
} from './PharmacyShared';
import { OrderTable, OrderDetailDrawer } from './PharmacyOrdersTab';

export default function PharmacyOverviewTab({ profile, orders, requests, balance, navigate, reload }) {
  const [selected, setSelected] = useState(null);
  const recentOrders = [...orders]
    .sort((a, b) => new Date(getOrderTime(b) || 0) - new Date(getOrderTime(a) || 0))
    .slice(0, 5);
  const activeRequests = requests.filter((item) => ['PENDING', 'IN_REVIEW', 'NEED_MORE_INFO'].includes(normalize(item.status)));

  return (
    <>
      <div className="pharmacy-metrics-grid">
        <MetricCard label="Total Earnings" value={money(balance?.totalEarnings ?? profile?.totalEarnings)} hint="Lifetime pharmacy earnings" icon="payments" />
        <MetricCard label="Pending Settlement" value={money(balance?.pendingBalance ?? profile?.pendingSettlement)} hint={balance?.withdrawalStatus || 'Awaiting withdrawal'} icon="hourglass_empty" tone="warning" />
        <MetricCard label="Recent Orders" value={orders.length} hint="All loaded pharmacy orders" icon="receipt_long" tone="info" />
        <MetricCard label="Active Requests" value={activeRequests.length} hint="Needs pharmacy attention" icon="medical_services" tone="success" />
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
          <OrderTable orders={recentOrders} compact onSelect={setSelected} />
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
            <button className="pharmacy-action-row" onClick={() => navigate(routeByTab.orders)} type="button">
              <span className="material-symbols-outlined">receipt_long</span>
              Review orders
            </button>
            <button className="pharmacy-action-row" onClick={() => navigate(routeByTab.consultations)} type="button">
              <span className="material-symbols-outlined">support_agent</span>
              Handle requests
            </button>
            <button className="pharmacy-action-row" onClick={() => navigate(routeByTab.wallet)} type="button">
              <span className="material-symbols-outlined">account_balance_wallet</span>
              Request withdrawal
            </button>
          </section>
        </aside>
      </div>

      {selected && (
        <OrderDetailDrawer
          order={selected}
          onClose={() => setSelected(null)}
          onUpdated={async () => {
            await reload?.();
            setSelected(null);
          }}
        />
      )}
    </>
  );
}

