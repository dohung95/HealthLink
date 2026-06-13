import React, { useMemo, useState } from 'react';

import {
  Avatar,
  InfoLine,
  MetricCard,
  getOrderTime,
  getProfileName,
  routeByTab,
} from './PharmacyShared';
import { OrderTable, OrderDetailDrawer } from './PharmacyOrdersTab';

export default function PharmacyOverviewTab({ profile, orders, workItems, navigate, reload }) {
  const [selected, setSelected] = useState(null);
  const recentOrders = [...orders]
    .sort((a, b) => new Date(getOrderTime(b) || 0) - new Date(getOrderTime(a) || 0))
    .slice(0, 5);

  const workflowMetrics = useMemo(() => {
    const items = Array.isArray(workItems) ? workItems : [];
    return {
      newRequests: items.filter((i) => i.workflowStage === 'NEW_REQUEST').length,
      consulting: items.filter((i) => i.workflowStage === 'CONSULTING').length,
      awaitingPatient: items.filter((i) => i.workflowStage === 'AWAITING_PAYMENT').length,
      preparing: items.filter((i) => i.workflowStage === 'PREPARING').length,
      ready: items.filter((i) => i.workflowStage === 'READY').length,
      completedToday: items.filter((i) => i.workflowStage === 'COMPLETED'
        && i.sortAt && new Date(i.sortAt).toDateString() === new Date().toDateString()).length,
    };
  }, [workItems]);

  return (
    <>
      <div className="pharmacy-metrics-grid is-five">
        <MetricCard label="New Requests" value={workflowMetrics.newRequests} hint="Triage needed" icon="support_agent" tone="warning" />
        <MetricCard label="Consulting" value={workflowMetrics.consulting} hint="Active consultations" icon="chat" tone="info" />
        <MetricCard label="Payment Due" value={workflowMetrics.awaitingPatient} hint="Unpaid orders" icon="payments" tone="info" />
        <MetricCard label="Preparing" value={workflowMetrics.preparing} hint="In fulfillment" icon="hourglass_empty" tone="info" />
        <MetricCard label="Ready" value={workflowMetrics.ready} hint="Ready for handoff" icon="checklist" tone="success" />
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

