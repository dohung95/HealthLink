import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import '../../components/Css/pharmacy/pharmacy-dashboard/pharmacy-dashboard.css';
import { getPharmacyProfile } from '../../api/account';
import pharmacyApi from '../../api/pharmacyApi';
import { paymentApi } from '../../api/paymentApi';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import PharmacyInventoryTab from '../../components/pharmacy/PharmacyInventoryTab';
import PharmacyOverviewTab from '../../components/pharmacy/PharmacyOverviewTab';
import { Avatar, getProfileName, navItems, routeByTab } from '../../components/pharmacy/PharmacyShared';
import PharmacyNotificationDropdown from '../../components/pharmacy/PharmacyNotificationDropdown';
import PharmacyProfileTab from '../../components/pharmacy/PharmacyProfileTab';
import PharmacyWalletTab from '../../components/pharmacy/PharmacyWalletTab';
import PharmacyAnalyticsTab from '../../components/pharmacy/PharmacyAnalyticsTab';
import PharmacyOnlineToggle from '../../components/pharmacy/PharmacyOnlineToggle';
import ChatPage from '../../components/ChatPage';
import PharmacyAnnouncementBar from '../../components/pharmacy/PharmacyAnnouncementBar';
import PharmacyRequestsPage from '../../components/pharmacy/PharmacyRequestsPage';
import PharmacyKanbanOrdersPage from '../../components/pharmacy/PharmacyKanbanOrdersPage';
import PharmacyOrderListPage from '../../components/pharmacy/PharmacyOrderListPage';

export default function PharmacyDashboardPage() {
  const { token, currentUserId, logout } = useAuth();
  const { notifications } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const profileDropdownRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastHandledWorkflowNotificationId, setLastHandledWorkflowNotificationId] = useState(null);

  const pharmacyId = profile?.pharmacyId || currentUserId;

  const activeTab = useMemo(() => {
    if (location.pathname.includes('/inventory/analytics')) return 'inventoryAnalytics';
    if (location.pathname.includes('/inventory')) return 'inventory';
    if (location.pathname.includes('/requests')) return 'requests';
    if (location.pathname.includes('/order-list')) return 'orderList';
    if (location.pathname.includes('/orders')) return 'orders';
    if (location.pathname.includes('/wallet')) return 'wallet';
    if (location.pathname.includes('/chat')) return 'chat';
    if (location.pathname.includes('/profile')) return 'profile';
    return 'overview';
  }, [location.pathname]);

  const loadDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const profileData = await getPharmacyProfile(token);
      const resolvedPharmacyId = profileData?.pharmacyId || currentUserId;
      setProfile(profileData);

      const results = await Promise.allSettled([
        resolvedPharmacyId ? pharmacyApi.getOrdersByPharmacy(resolvedPharmacyId) : Promise.resolve([]),
        resolvedPharmacyId ? pharmacyApi.getConsultationRequestsByPharmacy(resolvedPharmacyId) : Promise.resolve([]),
        resolvedPharmacyId ? pharmacyApi.getWorkItemsByPharmacy(resolvedPharmacyId) : Promise.resolve([]),
        resolvedPharmacyId ? paymentApi.getPartnerBalance(resolvedPharmacyId, 'PHARMACY') : Promise.resolve(null),
        resolvedPharmacyId ? paymentApi.getPartnerTransactions(resolvedPharmacyId) : Promise.resolve([]),
        resolvedPharmacyId ? paymentApi.getPartnerSettlements(resolvedPharmacyId) : Promise.resolve([]),
      ]);
      const [orderResult, requestResult, workItemResult, balanceResult, transactionResult, settlementResult] = results;

      if (orderResult.status === 'fulfilled') setOrders(Array.isArray(orderResult.value) ? orderResult.value : []);
      if (requestResult.status === 'fulfilled') setRequests(Array.isArray(requestResult.value) ? requestResult.value : []);
      if (workItemResult.status === 'fulfilled') setWorkItems(Array.isArray(workItemResult.value) ? workItemResult.value : []);
      if (balanceResult.status === 'fulfilled') setBalance(balanceResult.value);
      if (transactionResult.status === 'fulfilled') setTransactions(Array.isArray(transactionResult.value) ? transactionResult.value : []);
      if (settlementResult.status === 'fulfilled') setSettlements(Array.isArray(settlementResult.value) ? settlementResult.value : []);
    } catch (error) {
      console.error('Failed to load pharmacy dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [token, currentUserId]);

  useEffect(() => {
    const latest = notifications?.[0];
    if (!latest || ![
      'NEW_PHARMACY_REQUEST',
      'INVOICE_PAID',
      'NEW_ORDER',
      'ORDER_STATUS',
    ].includes(latest.type)) return;

    const notificationKey = latest.notificationId || `${latest.type}-${latest.relatedId}-${latest.createdAt || latest.timestamp || ''}`;
    if (!notificationKey || notificationKey === lastHandledWorkflowNotificationId) return;

    const actionUrl = latest.actionUrl || '';
    const isPharmacyWorkflowEvent =
      latest.type === 'NEW_PHARMACY_REQUEST'
      || actionUrl.includes('/pharmacy-orders/')
      || actionUrl.includes('/pharmacy-requests/');

    if (!isPharmacyWorkflowEvent) return;

    setLastHandledWorkflowNotificationId(notificationKey);
    loadDashboardData();
  }, [notifications, lastHandledWorkflowNotificationId]);

  useEffect(() => {
    if (!showProfileDropdown) return;

    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileDropdown]);

  const closeMobile = () => setMobileOpen(false);
  const closeProfileDropdown = () => setShowProfileDropdown(false);

  const handleNavigateFromDropdown = (path) => {
    closeProfileDropdown();
    navigate(path);
  };

  const handleLogout = () => {
    closeProfileDropdown();
    logout();
  };

  const shellProps = {
    profile,
    orders,
    requests,
    workItems,
    balance,
    transactions,
    settlements,
    pharmacyId,
    loading,
    reload: loadDashboardData,
    navigate,
  };

  return (
    <div className="pharmacy-dashboard">
      <button className="pharmacy-mobile-menu" onClick={() => setMobileOpen(true)} type="button">
        <span className="material-symbols-outlined">menu</span>
      </button>

      {mobileOpen && <button className="pharmacy-backdrop" onClick={closeMobile} type="button" aria-label="Close menu" />}

      <aside className={`pharmacy-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="pharmacy-brand">
          <div className="pharmacy-brand-logo">
            <img src="/logo.png" alt="HealthLink" />
          </div>
          <strong>HealthLink-Pharmacy</strong>
        </div>

        <nav className="pharmacy-nav">
          {navItems.map((item) => (
            <div className="pharmacy-nav-group" key={item.key}>
              <NavLink
                className={({ isActive }) => `pharmacy-nav-link ${isActive ? 'active' : ''}`}
                end={item.end}
                onClick={closeMobile}
                to={item.path}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>

              {item.children?.length ? (
                <div className="pharmacy-nav-children">
                  {item.children.map((child) => (
                    <NavLink
                      className={({ isActive }) => `pharmacy-nav-child ${isActive ? 'active' : ''}`}
                      end={child.end}
                      key={child.key}
                      onClick={closeMobile}
                      to={child.path}
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      </aside>

      <div className="pharmacy-main-shell">
        <header className="pharmacy-topbar">
          <div className="pharmacy-topbar-primary">
            <PharmacyAnnouncementBar />
            <div className="pharmacy-topbar-placeholder">
              <span className="material-symbols-outlined">local_pharmacy</span>
              <span>{getProfileName(profile)}</span>
            </div>
          </div>
          <div className="pharmacy-topbar-actions">
            <PharmacyNotificationDropdown />
            <div className="pharmacy-avatar-menu" ref={profileDropdownRef}>
              <button
                aria-expanded={showProfileDropdown}
                aria-label="Profile menu"
                className="pharmacy-avatar-trigger"
                onClick={() => setShowProfileDropdown((value) => !value)}
                type="button"
              >
                <Avatar profile={profile} compact />
              </button>

                {showProfileDropdown ? (
                  <div className="pharmacy-avatar-dropdown">
                    <div className="pharmacy-avatar-dropdown-card">
                      <Avatar profile={profile} compact />
                      <div className="pharmacy-avatar-dropdown-copy">
                        <strong>{getProfileName(profile)}</strong>
                        <PharmacyOnlineToggle
                          token={token}
                          profile={profile}
                          onProfileUpdated={setProfile}
                        />
                      </div>
                    </div>

                    <div className="pharmacy-avatar-dropdown-actions">
                    <button
                      className="pharmacy-avatar-dropdown-item"
                      onClick={() => handleNavigateFromDropdown(routeByTab.profile)}
                      type="button"
                    >
                      <span className="material-symbols-outlined">person</span>
                      Profile &amp; Security
                    </button>
                    <button
                      className="pharmacy-avatar-dropdown-item"
                      onClick={() => handleNavigateFromDropdown(routeByTab.wallet)}
                      type="button"
                    >
                      <span className="material-symbols-outlined">account_balance_wallet</span>
                      Wallet / Settlement
                    </button>
                    <button
                      className="pharmacy-avatar-dropdown-item is-danger"
                      onClick={handleLogout}
                      type="button"
                    >
                      <span className="material-symbols-outlined">logout</span>
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="pharmacy-content" style={activeTab === 'chat' ? { padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' } : {}}>
          {loading && activeTab !== 'chat' ? (
            <div className="pharmacy-loading">
              <span className="material-symbols-outlined">hourglass_empty</span>
              Loading pharmacy dashboard...
            </div>
          ) : (
            <>
              {activeTab === 'overview' && <PharmacyOverviewTab {...shellProps} />}
              {activeTab === 'inventory' && <PharmacyInventoryTab {...shellProps} />}
              {activeTab === 'inventoryAnalytics' && <PharmacyAnalyticsTab token={token} profile={profile} />}
              {activeTab === 'requests' && <PharmacyRequestsPage {...shellProps} />}
              {activeTab === 'orders' && <PharmacyKanbanOrdersPage {...shellProps} />}
              {activeTab === 'orderList' && <PharmacyOrderListPage {...shellProps} />}
              {activeTab === 'wallet' && <PharmacyWalletTab {...shellProps} />}
              {activeTab === 'chat' && <ChatPage showBot={false} />}
              {activeTab === 'profile' && <PharmacyProfileTab token={token} logout={logout} {...shellProps} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
