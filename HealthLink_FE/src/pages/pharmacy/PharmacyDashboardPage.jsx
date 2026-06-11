import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import '../../components/Css/pharmacy/pharmacy-dashboard/pharmacy-dashboard.css';
import { getPharmacyProfile } from '../../api/account';
import pharmacyApi from '../../api/pharmacyApi';
import { paymentApi } from '../../api/paymentApi';
import { useAuth } from '../../context/AuthContext';
import PharmacyInventoryTab from '../../components/pharmacy/PharmacyInventoryTab';
import PharmacyOverviewTab from '../../components/pharmacy/PharmacyOverviewTab';
import { Avatar, getProfileName, navItems, routeByTab } from '../../components/pharmacy/PharmacyShared';
import PharmacyOrdersTab from '../../components/pharmacy/PharmacyOrdersTab';
import PharmacyProfileTab from '../../components/pharmacy/PharmacyProfileTab';
import PharmacyWalletTab from '../../components/pharmacy/PharmacyWalletTab';

export default function PharmacyDashboardPage() {
  const { token, currentUserId, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  const pharmacyId = profile?.pharmacyId || currentUserId;

  const activeTab = useMemo(() => {
    if (location.pathname.includes('/inventory')) return 'inventory';
    if (location.pathname.includes('/orders')) return 'orders';
    if (location.pathname.includes('/wallet')) return 'wallet';
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

      const [orderData, requestData, workItemData, balanceData, transactionData, settlementData] = await Promise.all([
        resolvedPharmacyId ? pharmacyApi.getOrdersByPharmacy(resolvedPharmacyId) : Promise.resolve([]),
        resolvedPharmacyId ? pharmacyApi.getConsultationRequestsByPharmacy(resolvedPharmacyId) : Promise.resolve([]),
        resolvedPharmacyId ? pharmacyApi.getWorkItemsByPharmacy(resolvedPharmacyId) : Promise.resolve([]),
        resolvedPharmacyId ? paymentApi.getPartnerBalance(resolvedPharmacyId, 'PHARMACY') : Promise.resolve(null),
        resolvedPharmacyId ? paymentApi.getPartnerTransactions(resolvedPharmacyId) : Promise.resolve([]),
        resolvedPharmacyId ? paymentApi.getPartnerSettlements(resolvedPharmacyId) : Promise.resolve([]),
      ]);

      setOrders(Array.isArray(orderData) ? orderData : []);
      setRequests(Array.isArray(requestData) ? requestData : []);
      setWorkItems(Array.isArray(workItemData) ? workItemData : []);
      setBalance(balanceData);
      setTransactions(Array.isArray(transactionData) ? transactionData : []);
      setSettlements(Array.isArray(settlementData) ? settlementData : []);
    } catch (error) {
      console.error('Failed to load pharmacy dashboard', error);
      toast.error(error.response?.data?.message || 'Unable to load pharmacy dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [token, currentUserId]);

  const closeMobile = () => setMobileOpen(false);

  const shellProps = {
    profile,
    orders,
    requests,
    workItems,
    balance,
    transactions,
    settlements,
    pharmacyId,
    globalSearch,
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
            <span className="material-symbols-outlined">local_pharmacy</span>
          </div>
          <div>
            <strong>HealthLink Pharmacy</strong>
            <span>Pharmacy Partner</span>
          </div>
        </div>

        <nav className="pharmacy-nav">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => `pharmacy-nav-link ${isActive ? 'active' : ''}`}
              end={item.end}
              key={item.key}
              onClick={closeMobile}
              to={item.path}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="pharmacy-sidebar-footer">
          <div className="pharmacy-user-card">
            <Avatar profile={profile} />
            <div>
              <strong>{getProfileName(profile)}</strong>
              <span>{profile?.email || 'Pharmacy account'}</span>
            </div>
          </div>
          <button className="pharmacy-logout" onClick={logout} type="button">
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <div className="pharmacy-main-shell">
        <header className="pharmacy-topbar">
          <div className="pharmacy-search">
            <span className="material-symbols-outlined">search</span>
            <input
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder="Search orders, patients, requests..."
              value={globalSearch}
            />
          </div>
          <div className="pharmacy-topbar-actions">
            <span className="pharmacy-online-pill">
              <span />
              Online
            </span>
            <button type="button" title="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button onClick={() => navigate(routeByTab.profile)} type="button" title="Settings">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <Avatar profile={profile} compact />
          </div>
        </header>

        <main className="pharmacy-content">
          {loading ? (
            <div className="pharmacy-loading">
              <span className="material-symbols-outlined">hourglass_empty</span>
              Loading pharmacy dashboard...
            </div>
          ) : (
            <>
              {activeTab === 'overview' && <PharmacyOverviewTab {...shellProps} />}
              {activeTab === 'inventory' && <PharmacyInventoryTab {...shellProps} />}
              {activeTab === 'orders' && <PharmacyOrdersTab {...shellProps} />}
              {activeTab === 'wallet' && <PharmacyWalletTab {...shellProps} />}
              {activeTab === 'profile' && <PharmacyProfileTab token={token} logout={logout} {...shellProps} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
