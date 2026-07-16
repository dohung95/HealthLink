import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import '../../components/Css/pharmacy/pharmacy-dashboard/pharmacy-dashboard.css';
import { getPharmacyProfile } from '../../api/account';
import pharmacyApi from '../../api/pharmacyApi';
import { paymentApi } from '../../api/paymentApi';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import PharmacyInventoryTab from '../../components/pharmacy/PharmacyInventoryTab';
import PharmacyOverviewTab from '../../components/pharmacy/PharmacyOverviewTab';
import { Avatar, navItems, routeByTab } from '../../components/pharmacy/PharmacyShared';
import PharmacyNotificationDropdown from '../../components/pharmacy/PharmacyNotificationDropdown';
import PharmacyProfileTab from '../../components/pharmacy/PharmacyProfileTab';
import PharmacyWalletTab from '../../components/pharmacy/PharmacyWalletTab';

import PharmacyOnlineToggle from '../../components/pharmacy/PharmacyOnlineToggle';
import ChatPage from '../../components/ChatPage';
import PharmacyAnnouncementBar from '../../components/pharmacy/PharmacyAnnouncementBar';
import {
  getPharmacyNavBadgeCounts,
  getWorkflowNotificationOrderId,
  isPharmacyAnnouncementType,
  isRevisionWorkflowNotification,
} from '../../components/pharmacy/workflow/pharmacyWorkflow';
import { buildFallbackRequestWorkItems } from '../../components/pharmacy/workflow/pharmacyWorkflowFallback';
import PharmacyRequestsPage from '../../components/pharmacy/PharmacyRequestsPage';
import PharmacyKanbanOrdersPage from '../../components/pharmacy/PharmacyKanbanOrdersPage';
import PharmacyOrderListPage from '../../components/pharmacy/PharmacyOrderListPage';

const formatNavBadgeCount = (count) => (count > 99 ? '99+' : String(count));

export default function PharmacyDashboardPage() {
  const { token, currentUserId, logout } = useAuth();
  const { latestRealtimeNotification } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const profileDropdownRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [workItemsError, setWorkItemsError] = useState(null);
  const [workItemsLoading, setWorkItemsLoading] = useState(false);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inventoryRefreshToken, setInventoryRefreshToken] = useState(0);
  const [workflowAttention, setWorkflowAttention] = useState(null);
  const handledWorkflowNotificationsRef = useRef(new Set());
  const workflowAttentionTimerRef = useRef(null);

  const pharmacyId = profile?.pharmacyId || currentUserId;

  const activeTab = useMemo(() => {
    if (location.pathname.includes('/inventory')) return 'inventory';
    if (location.pathname.includes('/requests')) return 'requests';
    if (location.pathname.includes('/order-list')) return 'orderList';
    if (location.pathname.includes('/orders')) return 'orders';
    if (location.pathname.includes('/wallet')) return 'wallet';
    if (location.pathname.includes('/chat')) return 'chat';
    if (location.pathname.includes('/profile')) return 'profile';
    return 'overview';
  }, [location.pathname]);

  const applyWorkflowResults = useCallback((requestResult, workItemResult) => {
    const rawRequests = requestResult.status === 'fulfilled' && Array.isArray(requestResult.value)
      ? requestResult.value
      : [];

    if (requestResult.status === 'fulfilled') {
      setRequests(rawRequests);
    }

    if (workItemResult.status === 'fulfilled') {
      setWorkItems(Array.isArray(workItemResult.value) ? workItemResult.value : []);
      setWorkItemsError(null);
      return;
    }

    setWorkItems(buildFallbackRequestWorkItems(rawRequests, []));
    setWorkItemsError(
      workItemResult.reason?.response?.data?.message
      || 'Workflow data is temporarily unavailable. Showing new requests that can still be handled.',
    );
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setWorkItemsLoading(true);
    try {
      const profileData = await getPharmacyProfile(token);
      const resolvedPharmacyId = profileData?.pharmacyId || currentUserId;
      setProfile(profileData);

      const results = await Promise.allSettled([
        resolvedPharmacyId ? pharmacyApi.getOrdersByPharmacy(resolvedPharmacyId) : Promise.resolve([]),
        resolvedPharmacyId ? pharmacyApi.getConsultationRequestsByPharmacy(resolvedPharmacyId) : Promise.resolve([]),
        resolvedPharmacyId ? pharmacyApi.getWorkItemsByPharmacy(resolvedPharmacyId) : Promise.resolve([]),
        resolvedPharmacyId ? paymentApi.getPartnerBalance(resolvedPharmacyId, 'PHARMACY') : Promise.resolve(null),
      ]);
      const [orderResult, requestResult, workItemResult, balanceResult] = results;

      if (orderResult.status === 'fulfilled') setOrders(Array.isArray(orderResult.value) ? orderResult.value : []);
      applyWorkflowResults(requestResult, workItemResult);
      if (balanceResult.status === 'fulfilled') setBalance(balanceResult.value);
      setInventoryRefreshToken((value) => value + 1);
    } catch (error) {
      console.error('Failed to load pharmacy dashboard', error);
    } finally {
      setLoading(false);
      setWorkItemsLoading(false);
    }
  }, [applyWorkflowResults, currentUserId, token]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const refreshWorkflowData = useCallback(async () => {
    const resolvedPharmacyId = profile?.pharmacyId || currentUserId;
    if (!resolvedPharmacyId) return;
    setWorkItemsLoading(true);
    try {
      const [orderResult, requestResult, workItemResult] = await Promise.allSettled([
        pharmacyApi.getOrdersByPharmacy(resolvedPharmacyId),
        pharmacyApi.getConsultationRequestsByPharmacy(resolvedPharmacyId),
        pharmacyApi.getWorkItemsByPharmacy(resolvedPharmacyId),
      ]);

      if (orderResult.status === 'fulfilled') {
        setOrders(Array.isArray(orderResult.value) ? orderResult.value : []);
      }
      applyWorkflowResults(requestResult, workItemResult);
      setInventoryRefreshToken((value) => value + 1);
    } finally {
      setWorkItemsLoading(false);
    }
  }, [applyWorkflowResults, currentUserId, profile?.pharmacyId]);

  useEffect(() => {
    const latest = latestRealtimeNotification;
    if (!latest) return;
    const isOrderStatus = latest.type === 'ORDER_STATUS';
    if (!isPharmacyAnnouncementType(latest.type) && !isOrderStatus) return;

    const notificationKey = latest.notificationId || `${latest.type}-${latest.relatedId}-${latest.createdAt || latest.timestamp || ''}`;
    if (!notificationKey || handledWorkflowNotificationsRef.current.has(notificationKey)) return;

    const actionUrl = latest.actionUrl || '';
    const isRevision = isRevisionWorkflowNotification(latest);
    const isPharmacyWorkflowEvent =
      latest.type === 'NEW_PHARMACY_REQUEST'
      || isRevision
      || actionUrl.includes('/pharmacy-orders/')
      || actionUrl.includes('/pharmacy-requests/');

    if (!isPharmacyWorkflowEvent) return;

    handledWorkflowNotificationsRef.current.add(notificationKey);
    if (handledWorkflowNotificationsRef.current.size > 100) {
      handledWorkflowNotificationsRef.current.clear();
      handledWorkflowNotificationsRef.current.add(notificationKey);
    }

    refreshWorkflowData().then(() => {
      if (!isRevision) return;
      const orderId = getWorkflowNotificationOrderId(latest);
      if (!orderId) return;

      if (workflowAttentionTimerRef.current) {
        window.clearTimeout(workflowAttentionTimerRef.current);
      }
      setWorkflowAttention({ orderId, notificationId: notificationKey });
      workflowAttentionTimerRef.current = window.setTimeout(() => {
        setWorkflowAttention(null);
      }, 4000);
    }).catch((error) => {
      console.error('Failed to refresh pharmacy workflow', error);
    });
  }, [latestRealtimeNotification, refreshWorkflowData]);

  useEffect(() => () => {
    if (workflowAttentionTimerRef.current) {
      window.clearTimeout(workflowAttentionTimerRef.current);
    }
  }, []);

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

  const latestAnnouncement = useMemo(() => (
    isPharmacyAnnouncementType(latestRealtimeNotification?.type)
      ? latestRealtimeNotification
      : null
  ), [latestRealtimeNotification]);

  const navBadgeCounts = useMemo(
    () => getPharmacyNavBadgeCounts({ workItems, orders }),
    [orders, workItems],
  );

  const shellProps = {
    profile,
    orders,
    requests,
    workItems,
    workItemsError,
    workItemsLoading,
    balance,
    pharmacyId,
    loading,
    reload: loadDashboardData,
    retryWorkItems: refreshWorkflowData,
    navigate,
    workflowAttention,
    inventoryRefreshToken,
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
          {navItems.map((item) => {
            const badgeCount = navBadgeCounts[item.key] || 0;

            return (
              <div className="pharmacy-nav-group" key={item.key}>
                <NavLink
                  className={({ isActive }) => `pharmacy-nav-link ${isActive ? 'active' : ''}`}
                  end={item.end}
                  onClick={closeMobile}
                  to={item.path}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="pharmacy-nav-label">
                    {item.label}
                    {badgeCount > 0 ? (
                      <span
                        aria-label={`${badgeCount} ${item.label.toLowerCase()} need attention`}
                        className="pharmacy-nav-badge"
                      >
                        {formatNavBadgeCount(badgeCount)}
                      </span>
                    ) : null}
                  </span>
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
          );
        })}
        </nav>
      </aside>

      <div className="pharmacy-main-shell">
        <header className="pharmacy-topbar">
          <div className="pharmacy-topbar-primary">
            <PharmacyAnnouncementBar notification={latestAnnouncement} />
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
                <Avatar profile={profile} compact showOnlineStatus />
              </button>

                {showProfileDropdown ? (
                  <div className="pharmacy-avatar-dropdown">
                    <div className="pharmacy-avatar-dropdown-status">
                      <PharmacyOnlineToggle
                        token={token}
                        profile={profile}
                        onProfileUpdated={setProfile}
                      />
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
