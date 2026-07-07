import React, { useState, useEffect, useCallback } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { commissionApi, financialApi } from "../../../api/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";

// Service type mapping for display
const SERVICE_TYPE_LABELS = {
  'CONSULTATION_ONLINE': 'Online Consultation',
  'CONSULTATION_HOME_VISIT': 'Home Visit Consultation',
  'PHARMACY_ORDER': 'Pharmacy Order'
};

export default function CommissionManagement() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, partners, configs, transactions
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  // Dashboard data
  const [dashboard, setDashboard] = useState(null);

  // Global configs
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    commissionRate: '',
    minCommission: '',
    maxCommission: '',
    description: '',
    effectiveFrom: '',
    effectiveTo: '',
    reason: ''
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Partners data
  const [partnerType, setPartnerType] = useState('DOCTOR');
  const [partners, setPartners] = useState([]);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerPagination, setPartnerPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0
  });
  const [expandedPartnerId, setExpandedPartnerId] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    // For Doctors - Online
    customCommissionRateOnline: '',
    effectiveFromOnline: '',
    effectiveToOnline: '',
    // For Doctors - Offline
    customCommissionRateOffline: '',
    effectiveFromOffline: '',
    effectiveToOffline: '',
    // For Pharmacy
    customCommissionRate: '',
    effectiveFrom: '',
    effectiveTo: '',
    // Reason for change
    reason: ''
  });
  const [savingPartner, setSavingPartner] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Transactions data
  const [transactions, setTransactions] = useState([]);
  const [transactionFilters, setTransactionFilters] = useState({
    pageNumber: 1,
    pageSize: 10,
    status: "",
    fromDate: "",
    toDate: "",
    searchTerm: ""
  });
  const [transactionPagination, setTransactionPagination] = useState({
    totalCount: 0,
    totalPages: 0
  });

  // Normalize page data from different API response formats
  const normalizePageData = (response, currentPagination) => {
    const items = response.content ?? response.data ?? [];
    const pageNumber = response.number != null ? response.number + 1 : response.pageNumber ?? currentPagination.pageNumber;
    const pageSize = response.size ?? response.pageSize ?? currentPagination.pageSize;
    const totalCount = response.totalElements ?? response.totalCount ?? items.length;
    const totalPages = response.totalPages ?? (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1);
    return { items, pageNumber, pageSize, totalCount, totalPages };
  };

  // Load dashboard and configs
  const loadDashboardAndConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardData, configsData] = await Promise.all([
        commissionApi.getDashboard(),
        commissionApi.getConfigs()
      ]);
      setDashboard(dashboardData);
      setConfigs(configsData?.configs ?? configsData ?? []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load partners
  const loadPartners = useCallback(async () => {
    try {
      setLoading(true);
      const response = await commissionApi.getPartners({
        type: partnerType,
        searchTerm: partnerSearch,
        pageNumber: partnerPagination.pageNumber,
        pageSize: partnerPagination.pageSize
      });
      const { items, pageNumber, pageSize, totalCount, totalPages } = normalizePageData(response, partnerPagination);
      setPartners(items);
      setPartnerPagination({ pageNumber, pageSize, totalCount, totalPages });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, [partnerType, partnerSearch, partnerPagination.pageNumber, partnerPagination.pageSize]);

  // Initial load
  useEffect(() => {
    loadDashboardAndConfigs();
  }, [loadDashboardAndConfigs]);

  // Load partners when tab changes or filters change
  useEffect(() => {
    if (activeTab === 'partners') {
      loadPartners();
    }
  }, [activeTab, loadPartners]);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await financialApi.getTransactions(transactionFilters);
      setTransactions(data.transactions || []);
      setTransactionPagination({
        totalCount: data.totalCount || 0,
        totalPages: data.totalPages || 0
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [transactionFilters]);

  // Load transactions when tab changes
  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    }
  }, [activeTab, loadTransactions]);

  // Refresh all data based on current tab
  const handleRefresh = useCallback(async () => {
    setError(null);
    try {
      // Always refresh dashboard and configs
      await loadDashboardAndConfigs();

      // Refresh tab-specific data
      if (activeTab === 'partners') {
        await loadPartners();
      } else if (activeTab === 'transactions') {
        await loadTransactions();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to refresh data');
    }
  }, [activeTab, loadDashboardAndConfigs, loadPartners, loadTransactions]);

  // Handlers
  const handlePartnerTypeChange = (type) => {
    setPartnerType(type);
    setPartnerPagination({ ...partnerPagination, pageNumber: 1 });
    setExpandedPartnerId(null);
  };

  const handlePartnerSearch = (e) => {
    setPartnerSearch(e.target.value);
    setPartnerPagination({ ...partnerPagination, pageNumber: 1 });
  };

  // Config modal handlers
  const handleConfigEdit = (config) => {
    setSelectedConfig(config);
    setConfigForm({
      commissionRate: config.commissionRate != null ? (config.commissionRate * 100).toFixed(2) : '',
      minCommission: config.minCommission ?? '',
      maxCommission: config.maxCommission ?? '',
      description: config.description ?? '',
      effectiveFrom: config.effectiveFrom ? config.effectiveFrom.slice(0, 16) : '',
      effectiveTo: config.effectiveTo ? config.effectiveTo.slice(0, 16) : '',
      reason: ''
    });
    setShowConfigModal(true);
  };

  const handleConfigChange = (field) => (e) => {
    const value = e.target.value;
    setConfigForm({ ...configForm, [field]: value });
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!selectedConfig?.configId) {
      showToast({ title: 'Error', message: 'No config selected.', type: 'error' });
      return;
    }
    if (!configForm.reason.trim()) {
      showToast({ title: 'Validation Error', message: 'Please provide a reason for this change.', type: 'error' });
      return;
    }

    try {
      setSavingConfig(true);
      const rateValue = parseFloat(configForm.commissionRate) / 100;
      await commissionApi.updateConfig(selectedConfig.configId, {
        commissionRate: rateValue,
        minCommission: configForm.minCommission ? parseFloat(configForm.minCommission) : null,
        maxCommission: configForm.maxCommission ? parseFloat(configForm.maxCommission) : null,
        description: configForm.description,
        effectiveFrom: configForm.effectiveFrom ? new Date(configForm.effectiveFrom).toISOString() : null,
        effectiveTo: configForm.effectiveTo ? new Date(configForm.effectiveTo).toISOString() : null,
        reason: configForm.reason
      });
      setShowConfigModal(false);
      showToast({ title: 'Success', message: 'Commission config updated successfully.', type: 'success' });
      loadDashboardAndConfigs();
    } catch (err) {
      showToast({ title: 'Error', message: err.response?.data?.error || err.message, type: 'error' });
    } finally {
      setSavingConfig(false);
    }
  };

  // Partner modal handlers
  const handlePartnerEdit = (partner) => {
    setSelectedPartner(partner);
    if (partner.partnerType === 'DOCTOR') {
      // Doctor - set both online and offline rates
      setPartnerForm({
        customCommissionRateOnline: partner.customCommissionRateOnline != null ? (partner.customCommissionRateOnline * 100).toFixed(2) : '',
        effectiveFromOnline: partner.customCommissionRateOnlineEffectiveFrom ? partner.customCommissionRateOnlineEffectiveFrom.slice(0, 16) : '',
        effectiveToOnline: partner.customCommissionRateOnlineEffectiveTo ? partner.customCommissionRateOnlineEffectiveTo.slice(0, 16) : '',
        customCommissionRateOffline: partner.customCommissionRateOffline != null ? (partner.customCommissionRateOffline * 100).toFixed(2) : '',
        effectiveFromOffline: partner.customCommissionRateOfflineEffectiveFrom ? partner.customCommissionRateOfflineEffectiveFrom.slice(0, 16) : '',
        effectiveToOffline: partner.customCommissionRateOfflineEffectiveTo ? partner.customCommissionRateOfflineEffectiveTo.slice(0, 16) : '',
        customCommissionRate: '',
        effectiveFrom: '',
        effectiveTo: '',
        reason: ''
      });
    } else {
      // Pharmacy - single rate
      setPartnerForm({
        customCommissionRateOnline: '',
        effectiveFromOnline: '',
        effectiveToOnline: '',
        customCommissionRateOffline: '',
        effectiveFromOffline: '',
        effectiveToOffline: '',
        customCommissionRate: partner.customCommissionRate != null ? (partner.customCommissionRate * 100).toFixed(2) : '',
        effectiveFrom: partner.customCommissionRateEffectiveFrom ? partner.customCommissionRateEffectiveFrom.slice(0, 16) : '',
        effectiveTo: partner.customCommissionRateEffectiveTo ? partner.customCommissionRateEffectiveTo.slice(0, 16) : '',
        reason: ''
      });
    }
    setShowPartnerModal(true);
  };

  const handlePartnerFormChange = (field) => (e) => {
    setPartnerForm({ ...partnerForm, [field]: e.target.value });
  };

  const handleSavePartner = async (e) => {
    e.preventDefault();
    if (!selectedPartner?.partnerId) {
      showToast({ title: 'Error', message: 'No partner selected.', type: 'error' });
      return;
    }
    if (!partnerForm.reason.trim()) {
      showToast({ title: 'Validation Error', message: 'Please provide a reason for this change.', type: 'error' });
      return;
    }

    try {
      setSavingPartner(true);

      let payload;
      if (selectedPartner.partnerType === 'DOCTOR') {
        // Doctor - send both online and offline rates
        payload = {
          customCommissionRateOnline: partnerForm.customCommissionRateOnline ? parseFloat(partnerForm.customCommissionRateOnline) / 100 : null,
          effectiveFromOnline: partnerForm.effectiveFromOnline ? new Date(partnerForm.effectiveFromOnline).toISOString() : null,
          effectiveToOnline: partnerForm.effectiveToOnline ? new Date(partnerForm.effectiveToOnline).toISOString() : null,
          customCommissionRateOffline: partnerForm.customCommissionRateOffline ? parseFloat(partnerForm.customCommissionRateOffline) / 100 : null,
          effectiveFromOffline: partnerForm.effectiveFromOffline ? new Date(partnerForm.effectiveFromOffline).toISOString() : null,
          effectiveToOffline: partnerForm.effectiveToOffline ? new Date(partnerForm.effectiveToOffline).toISOString() : null,
          reason: partnerForm.reason
        };
      } else {
        // Pharmacy - single rate
        payload = {
          customCommissionRate: partnerForm.customCommissionRate ? parseFloat(partnerForm.customCommissionRate) / 100 : null,
          effectiveFrom: partnerForm.effectiveFrom ? new Date(partnerForm.effectiveFrom).toISOString() : null,
          effectiveTo: partnerForm.effectiveTo ? new Date(partnerForm.effectiveTo).toISOString() : null,
          reason: partnerForm.reason
        };
      }

      await commissionApi.updatePartnerCommission(selectedPartner.partnerType, selectedPartner.partnerId, payload);
      setShowPartnerModal(false);
      showToast({ title: 'Success', message: 'Partner commission updated successfully.', type: 'success' });
      loadPartners();
    } catch (err) {
      showToast({ title: 'Error', message: err.response?.data?.error || err.message, type: 'error' });
    } finally {
      setSavingPartner(false);
    }
  };

  const handleRemoveCustomRate = () => {
    if (!selectedPartner?.partnerId) return;
    setResetReason('');
    setShowResetConfirm(true);
  };

  const handleConfirmRemoveCustomRate = async () => {
    if (!resetReason.trim()) {
      showToast({ title: 'Validation Error', message: 'Please provide a reason for removing custom rate.', type: 'error' });
      return;
    }

    try {
      setSavingPartner(true);
      await commissionApi.removePartnerCustomRate(selectedPartner.partnerType, selectedPartner.partnerId, resetReason);
      setShowResetConfirm(false);
      setShowPartnerModal(false);
      showToast({ title: 'Success', message: 'Custom commission rate removed.', type: 'success' });
      loadPartners();
    } catch (err) {
      showToast({ title: 'Error', message: err.response?.data?.error || err.message, type: 'error' });
    } finally {
      setSavingPartner(false);
    }
  };

  // Formatting helpers
  const formatAmount = (value) => {
    if (value == null || value === '') return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
  };

  const formatRate = (value) => {
    if (value == null || value === '') return '—';
    return `${(Number(value) * 100).toFixed(2)}%`;
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getServiceTypeLabel = (type) => SERVICE_TYPE_LABELS[type] || type || '—';

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "success";
      case "pending":
      case "scheduled":
        return "warning";
      case "cancelled":
      case "failed":
        return "danger";
      default:
        return "secondary";
    }
  };

  const handleTransactionPageChange = (newPage) => {
    setTransactionFilters({ ...transactionFilters, pageNumber: newPage });
  };

  // Check if custom rate is expired
  const isCustomRateExpired = (partner, rateType = null) => {
    const now = new Date();
    if (partner.partnerType === 'DOCTOR') {
      if (rateType === 'online') {
        if (!partner.customCommissionRateOnline) return false;
        if (!partner.customCommissionRateOnlineEffectiveTo) return false;
        return new Date(partner.customCommissionRateOnlineEffectiveTo) < now;
      } else if (rateType === 'offline') {
        if (!partner.customCommissionRateOffline) return false;
        if (!partner.customCommissionRateOfflineEffectiveTo) return false;
        return new Date(partner.customCommissionRateOfflineEffectiveTo) < now;
      }
      // If no rateType specified, check both
      const onlineExpired = partner.customCommissionRateOnlineEffectiveTo && new Date(partner.customCommissionRateOnlineEffectiveTo) < now;
      const offlineExpired = partner.customCommissionRateOfflineEffectiveTo && new Date(partner.customCommissionRateOfflineEffectiveTo) < now;
      return onlineExpired || offlineExpired;
    }
    // Pharmacy
    if (!partner.customCommissionRate) return false;
    if (!partner.customCommissionRateEffectiveTo) return false;
    return new Date(partner.customCommissionRateEffectiveTo) < now;
  };

  // Check if doctor has any custom rate set
  const hasDoctorCustomRate = (partner) => {
    return partner.customCommissionRateOnline != null || partner.customCommissionRateOffline != null;
  };

  return (
    <NavbarAdmin sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}>
      <main className="admin-content p-4">
        {/* Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
          <div>
            <h2 className="admin-page-title mb-2">
              Commission Management
            </h2>
            <p className="admin-page-subtitle mb-0">
              Configure commission rates, manage partner earnings, and track transactions.
            </p>
          </div>
          <button className="btn btn-outline-primary btn-sm" onClick={handleRefresh} disabled={loading}>
            {loading ? (
              <span className="spinner-border spinner-border-sm me-1"></span>
            ) : (
              <i className="bi bi-arrow-clockwise me-1"></i>
            )}
            Refresh
          </button>
        </div>

        {error && (
          <div className="alert alert-danger alert-dismissible" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
            <button type="button" className="btn-close" onClick={() => setError(null)}></button>
          </div>
        )}

        {/* Tabs */}
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              <i className="bi bi-speedometer2 me-1"></i> Overview
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'partners' ? 'active' : ''}`} onClick={() => setActiveTab('partners')}>
              <i className="bi bi-people me-1"></i> Partners
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'configs' ? 'active' : ''}`} onClick={() => setActiveTab('configs')}>
              <i className="bi bi-gear me-1"></i> Global Rates
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
              <i className="bi bi-list-ul me-1"></i> Transactions
            </button>
          </li>
        </ul>

        {loading && activeTab === 'overview' ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && dashboard && (
              <>
                {/* Summary Cards */}
                <div className="row g-3 mb-4">
                  <div className="col-md-3">
                    <div className="admin-card p-3 h-100 border-start border-primary border-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="text-muted mb-1">Total Gross Revenue</h6>
                          <p className="fs-4 fw-bold mb-0 text-primary">{formatAmount(dashboard.totalGrossRevenue)}</p>
                        </div>
                        <i className="bi bi-cash-stack fs-2 text-primary opacity-50"></i>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="admin-card p-3 h-100 border-start border-success border-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="text-muted mb-1">Platform Commission</h6>
                          <p className="fs-4 fw-bold mb-0 text-success">{formatAmount(dashboard.totalCommission)}</p>
                        </div>
                        <i className="bi bi-graph-up-arrow fs-2 text-success opacity-50"></i>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="admin-card p-3 h-100 border-start border-info border-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="text-muted mb-1">Total Paid Out</h6>
                          <p className="fs-4 fw-bold mb-0 text-info">{formatAmount(dashboard.totalPaidOut)}</p>
                        </div>
                        <i className="bi bi-wallet2 fs-2 text-info opacity-50"></i>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="admin-card p-3 h-100 border-start border-warning border-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="text-muted mb-1">Pending Settlement</h6>
                          <p className="fs-4 fw-bold mb-0 text-warning">{formatAmount(dashboard.totalPending)}</p>
                        </div>
                        <i className="bi bi-hourglass-split fs-2 text-warning opacity-50"></i>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Doctor vs Pharmacy Breakdown */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className="admin-card p-3">
                      <h6 className="mb-3">
                        <i className="bi bi-person-badge me-2 text-primary"></i>
                        Doctor Revenue
                      </h6>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Gross Revenue:</span>
                        <strong>{formatAmount(dashboard.doctorGross)}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Platform Commission:</span>
                        <strong className="text-success">{formatAmount(dashboard.doctorCommission)}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Doctor Earnings:</span>
                        <strong className="text-primary">
                          {formatAmount((dashboard.doctorGross || 0) - (dashboard.doctorCommission || 0))}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="admin-card p-3">
                      <h6 className="mb-3">
                        <i className="bi bi-shop me-2 text-info"></i>
                        Pharmacy Revenue
                      </h6>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Gross Revenue:</span>
                        <strong>{formatAmount(dashboard.pharmacyGross)}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Platform Commission:</span>
                        <strong className="text-success">{formatAmount(dashboard.pharmacyCommission)}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Pharmacy Earnings:</span>
                        <strong className="text-info">
                          {formatAmount((dashboard.pharmacyGross || 0) - (dashboard.pharmacyCommission || 0))}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Pending */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className="admin-card p-3">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">
                          <i className="bi bi-clock-history me-2"></i>
                          Top Doctors Pending Settlement
                        </h6>
                        <button
                          className="btn btn-link btn-sm p-0"
                          onClick={() => { setPartnerType('DOCTOR'); setActiveTab('partners'); }}
                        >
                          View All <i className="bi bi-arrow-right"></i>
                        </button>
                      </div>
                      <ul className="list-group list-group-flush">
                        {dashboard.topDoctorsPending?.length > 0 ? dashboard.topDoctorsPending.slice(0, 3).map((item, idx) => (
                          <li key={idx} className="list-group-item d-flex justify-content-between align-items-center px-0">
                            <span>{item.recipientName || item.recipientId}</span>
                            <span className="badge bg-warning text-dark">{formatAmount(item.pendingAmount)}</span>
                          </li>
                        )) : <li className="list-group-item px-0 text-muted">No pending settlements</li>}
                      </ul>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="admin-card p-3">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">
                          <i className="bi bi-clock-history me-2"></i>
                          Top Pharmacies Pending Settlement
                        </h6>
                        <button
                          className="btn btn-link btn-sm p-0"
                          onClick={() => { setPartnerType('PHARMACY'); setActiveTab('partners'); }}
                        >
                          View All <i className="bi bi-arrow-right"></i>
                        </button>
                      </div>
                      <ul className="list-group list-group-flush">
                        {dashboard.topPharmaciesPending?.length > 0 ? dashboard.topPharmaciesPending.slice(0, 3).map((item, idx) => (
                          <li key={idx} className="list-group-item d-flex justify-content-between align-items-center px-0">
                            <span>{item.recipientName || item.recipientId}</span>
                            <span className="badge bg-warning text-dark">{formatAmount(item.pendingAmount)}</span>
                          </li>
                        )) : <li className="list-group-item px-0 text-muted">No pending settlements</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Partners Tab */}
            {activeTab === 'partners' && (
              <div className="admin-card p-3">
                <div className="d-flex flex-wrap gap-3 align-items-center mb-3">
                  <div className="btn-group">
                    <button
                      className={`btn ${partnerType === 'DOCTOR' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handlePartnerTypeChange('DOCTOR')}
                    >
                      <i className="bi bi-person-badge me-1"></i> Doctors
                    </button>
                    <button
                      className={`btn ${partnerType === 'PHARMACY' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handlePartnerTypeChange('PHARMACY')}
                    >
                      <i className="bi bi-shop me-1"></i> Pharmacies
                    </button>
                  </div>
                  <div className="flex-grow-1">
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Search ${partnerType === 'DOCTOR' ? 'doctors' : 'pharmacies'}...`}
                      value={partnerSearch}
                      onChange={handlePartnerSearch}
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary"></div>
                  </div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}></th>
                            <th>Partner</th>
                            <th>{partnerType === 'DOCTOR' ? 'Specialty' : 'Location'}</th>
                            {partnerType === 'DOCTOR' ? (
                              <>
                                <th>Online Rate</th>
                                <th>Home Visit Rate</th>
                              </>
                            ) : (
                              <th>Commission Rate</th>
                            )}
                            <th>Total Earnings</th>
                            <th>Pending Payout</th>
                            <th>Total Commission</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {partners.length === 0 ? (
                            <tr>
                              <td colSpan={partnerType === 'DOCTOR' ? 9 : 8} className="text-center py-4 text-muted">
                                No {partnerType === 'DOCTOR' ? 'doctors' : 'pharmacies'} found
                              </td>
                            </tr>
                          ) : partners.map((partner) => (
                            <React.Fragment key={partner.partnerId}>
                              <tr
                                style={{ cursor: 'pointer' }}
                                onClick={() => setExpandedPartnerId(expandedPartnerId === partner.partnerId ? null : partner.partnerId)}
                              >
                                <td>
                                  <i className={`bi ${expandedPartnerId === partner.partnerId ? 'bi-chevron-down' : 'bi-chevron-right'}`}></i>
                                </td>
                                <td>
                                  <div className="d-flex align-items-center">
                                    {partner.avatarUrl ? (
                                      <img src={partner.avatarUrl} alt="" className="rounded-circle me-2" style={{ width: 32, height: 32, objectFit: 'cover' }} />
                                    ) : (
                                      <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-2" style={{ width: 32, height: 32 }}>
                                        <i className={`bi ${partnerType === 'DOCTOR' ? 'bi-person' : 'bi-shop'}`}></i>
                                      </div>
                                    )}
                                    <div>
                                      <div className="fw-medium">{partner.partnerName}</div>
                                      <small className="text-muted">{partner.partnerId}</small>
                                    </div>
                                  </div>
                                </td>
                                <td>{partner.specialty || partner.location || '—'}</td>
                                {partnerType === 'DOCTOR' ? (
                                  <>
                                    {/* Online Rate */}
                                    <td>
                                      <div>
                                        <span className={`fw-bold ${partner.usingCustomRateOnline ? 'text-primary' : ''}`}>
                                          {formatRate(partner.effectiveCommissionRateOnline)}
                                        </span>
                                        {partner.usingCustomRateOnline && (
                                          <span className="badge bg-primary ms-1">Custom</span>
                                        )}
                                        {isCustomRateExpired(partner, 'online') && (
                                          <span className="badge bg-danger ms-1">Expired</span>
                                        )}
                                      </div>
                                      {partner.customCommissionRateOnline && (
                                        <small className="text-muted d-block">
                                          {formatDate(partner.customCommissionRateOnlineEffectiveFrom)} - {partner.customCommissionRateOnlineEffectiveTo ? formatDate(partner.customCommissionRateOnlineEffectiveTo) : '∞'}
                                        </small>
                                      )}
                                    </td>
                                    {/* Offline Rate */}
                                    <td>
                                      <div>
                                        <span className={`fw-bold ${partner.usingCustomRateOffline ? 'text-info' : ''}`}>
                                          {formatRate(partner.effectiveCommissionRateOffline)}
                                        </span>
                                        {partner.usingCustomRateOffline && (
                                          <span className="badge bg-info ms-1">Custom</span>
                                        )}
                                        {isCustomRateExpired(partner, 'offline') && (
                                          <span className="badge bg-danger ms-1">Expired</span>
                                        )}
                                      </div>
                                      {partner.customCommissionRateOffline && (
                                        <small className="text-muted d-block">
                                          {formatDate(partner.customCommissionRateOfflineEffectiveFrom)} - {partner.customCommissionRateOfflineEffectiveTo ? formatDate(partner.customCommissionRateOfflineEffectiveTo) : '∞'}
                                        </small>
                                      )}
                                    </td>
                                  </>
                                ) : (
                                  <td>
                                    <div>
                                      <span className={`fw-bold ${partner.usingCustomRate ? 'text-primary' : ''}`}>
                                        {formatRate(partner.effectiveCommissionRate)}
                                      </span>
                                      {partner.usingCustomRate && (
                                        <span className="badge bg-primary ms-1">Custom</span>
                                      )}
                                      {isCustomRateExpired(partner) && (
                                        <span className="badge bg-danger ms-1">Expired</span>
                                      )}
                                    </div>
                                    {partner.customCommissionRate && (
                                      <small className="text-muted d-block">
                                        {formatDate(partner.customCommissionRateEffectiveFrom)} - {partner.customCommissionRateEffectiveTo ? formatDate(partner.customCommissionRateEffectiveTo) : '∞'}
                                      </small>
                                    )}
                                  </td>
                                )}
                                <td className="text-success fw-medium">{formatAmount(partner.totalEarnings)}</td>
                                <td className="text-warning fw-medium">{formatAmount(partner.pendingSettlement)}</td>
                                <td>{formatAmount(partner.totalCommissionPaid)}</td>
                                <td className="text-end" onClick={(e) => e.stopPropagation()}>
                                  <button className="btn btn-sm btn-outline-primary" onClick={() => handlePartnerEdit(partner)}>
                                    <i className="bi bi-pencil"></i> Set Rate
                                  </button>
                                </td>
                              </tr>
                              {/* Expanded Detail Row */}
                              {expandedPartnerId === partner.partnerId && (
                                <tr>
                                  <td colSpan={partnerType === 'DOCTOR' ? 9 : 8} className="bg-light p-3">
                                    <div className="row g-3">
                                      {partnerType === 'DOCTOR' ? (
                                        <>
                                          {/* Online Appointments Breakdown */}
                                          <div className="col-md-6">
                                            <div className="card border-0 shadow-sm h-100">
                                              <div className="card-header bg-primary bg-opacity-10 py-2">
                                                <h6 className="mb-0 text-primary">
                                                  <i className="bi bi-camera-video me-2"></i>Online Consultations
                                                </h6>
                                              </div>
                                              <div className="card-body py-2">
                                                <div className="d-flex justify-content-between align-items-center py-1 border-bottom">
                                                  <span className="text-info">
                                                    <i className="bi bi-hourglass-split me-1"></i>In Progress
                                                  </span>
                                                  <span>
                                                    <span className="badge bg-info me-2">{partner.onlinePendingCount || 0}</span>
                                                    <strong>{formatAmount(partner.onlinePendingAmount)}</strong>
                                                  </span>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center py-1 border-bottom">
                                                  <span className="text-success">
                                                    <i className="bi bi-check-circle me-1"></i>Completed
                                                  </span>
                                                  <span>
                                                    <span className="badge bg-success me-2">{partner.onlineCompletedCount || 0}</span>
                                                    <strong>{formatAmount(partner.onlineCompletedAmount)}</strong>
                                                  </span>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center py-1">
                                                  <span className="text-secondary">
                                                    <i className="bi bi-x-circle me-1"></i>Cancelled
                                                  </span>
                                                  <span>
                                                    <span className="badge bg-secondary me-2">{partner.onlineCancelledCount || 0}</span>
                                                    <strong>{formatAmount(partner.onlineCancelledAmount)}</strong>
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          {/* Home Visit Appointments Breakdown */}
                                          <div className="col-md-6">
                                            <div className="card border-0 shadow-sm h-100">
                                              <div className="card-header bg-info bg-opacity-10 py-2">
                                                <h6 className="mb-0 text-info">
                                                  <i className="bi bi-building me-2"></i>Home Visit Consultations
                                                </h6>
                                              </div>
                                              <div className="card-body py-2">
                                                <div className="d-flex justify-content-between align-items-center py-1 border-bottom">
                                                  <span className="text-info">
                                                    <i className="bi bi-hourglass-split me-1"></i>In Progress
                                                  </span>
                                                  <span>
                                                    <span className="badge bg-info me-2">{partner.offlinePendingCount || 0}</span>
                                                    <strong>{formatAmount(partner.offlinePendingAmount)}</strong>
                                                  </span>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center py-1 border-bottom">
                                                  <span className="text-success">
                                                    <i className="bi bi-check-circle me-1"></i>Completed
                                                  </span>
                                                  <span>
                                                    <span className="badge bg-success me-2">{partner.offlineCompletedCount || 0}</span>
                                                    <strong>{formatAmount(partner.offlineCompletedAmount)}</strong>
                                                  </span>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center py-1">
                                                  <span className="text-secondary">
                                                    <i className="bi bi-x-circle me-1"></i>Cancelled
                                                  </span>
                                                  <span>
                                                    <span className="badge bg-secondary me-2">{partner.offlineCancelledCount || 0}</span>
                                                    <strong>{formatAmount(partner.offlineCancelledAmount)}</strong>
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </>
                                      ) : (
                                        /* Pharmacy Orders Breakdown */
                                        <div className="col-12">
                                          <div className="card border-0 shadow-sm">
                                            <div className="card-header bg-success bg-opacity-10 py-2">
                                              <h6 className="mb-0 text-success">
                                                <i className="bi bi-box-seam me-2"></i>Pharmacy Orders
                                              </h6>
                                            </div>
                                            <div className="card-body py-2">
                                              <div className="row">
                                                <div className="col-md-4">
                                                  <div className="d-flex justify-content-between align-items-center py-1">
                                                    <span className="text-info">
                                                      <i className="bi bi-hourglass-split me-1"></i>In Progress
                                                    </span>
                                                    <span>
                                                      <span className="badge bg-info me-2">{partner.pharmacyPendingCount || 0}</span>
                                                      <strong>{formatAmount(partner.pharmacyPendingAmount)}</strong>
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="col-md-4">
                                                  <div className="d-flex justify-content-between align-items-center py-1">
                                                    <span className="text-success">
                                                      <i className="bi bi-check-circle me-1"></i>Completed
                                                    </span>
                                                    <span>
                                                      <span className="badge bg-success me-2">{partner.pharmacyCompletedCount || 0}</span>
                                                      <strong>{formatAmount(partner.pharmacyCompletedAmount)}</strong>
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="col-md-4">
                                                  <div className="d-flex justify-content-between align-items-center py-1">
                                                    <span className="text-secondary">
                                                      <i className="bi bi-x-circle me-1"></i>Cancelled
                                                    </span>
                                                    <span>
                                                      <span className="badge bg-secondary me-2">{partner.pharmacyCancelledCount || 0}</span>
                                                      <strong>{formatAmount(partner.pharmacyCancelledAmount)}</strong>
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {partnerPagination.totalPages > 1 && (
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <div className="text-muted">
                          Page {partnerPagination.pageNumber} of {partnerPagination.totalPages}
                          <span className="ms-2">({partnerPagination.totalCount} total)</span>
                        </div>
                        <div className="btn-group">
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            disabled={partnerPagination.pageNumber === 1}
                            onClick={() => setPartnerPagination({ ...partnerPagination, pageNumber: partnerPagination.pageNumber - 1 })}
                          >
                            Previous
                          </button>
                          <button className="btn btn-outline-secondary btn-sm" disabled>
                            {partnerPagination.pageNumber}
                          </button>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            disabled={partnerPagination.pageNumber === partnerPagination.totalPages}
                            onClick={() => setPartnerPagination({ ...partnerPagination, pageNumber: partnerPagination.pageNumber + 1 })}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Global Rates Tab */}
            {activeTab === 'configs' && (
              <div className="admin-card p-3">
                <div className="mb-3">
                  <h5 className="mb-1">Global Commission Rates</h5>
                  <p className="text-muted mb-0">
                    These rates apply to all partners who don't have a custom rate configured.
                    Custom partner rates take precedence over these global settings.
                  </p>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Service Type</th>
                        <th>Commission Rate</th>
                        <th>Min / Max</th>
                        <th>Effective Period</th>
                        <th>Description</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configs.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-4 text-muted">No commission configurations found</td>
                        </tr>
                      ) : configs.map((config) => (
                        <tr key={config.configId || config.serviceType}>
                          <td>
                            <span className="fw-medium">{getServiceTypeLabel(config.serviceType)}</span>
                            <br />
                            <small className="text-muted">{config.serviceType}</small>
                          </td>
                          <td className="fs-5 fw-bold text-primary">{formatRate(config.commissionRate)}</td>
                          <td>
                            <small>
                              Min: {formatAmount(config.minCommission)}<br />
                              Max: {config.maxCommission ? formatAmount(config.maxCommission) : 'No limit'}
                            </small>
                          </td>
                          <td>
                            <small>
                              From: {formatDateTime(config.effectiveFrom) || 'Immediate'}<br />
                              To: {formatDateTime(config.effectiveTo) || 'No end date'}
                            </small>
                          </td>
                          <td><small>{config.description || '—'}</small></td>
                          <td className="text-end">
                            <button className="btn btn-sm btn-outline-primary" onClick={() => handleConfigEdit(config)}>
                              <i className="bi bi-pencil"></i> Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div className="admin-card">
                <div className="card-header bg-white py-3 px-4">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <h5 className="mb-0">
                      <i className="bi bi-list-ul me-2 text-info"></i>
                      Transaction History
                    </h5>
                    <div className="d-flex gap-2 flex-wrap">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Search..."
                        value={transactionFilters.searchTerm}
                        onChange={(e) =>
                          setTransactionFilters({
                            ...transactionFilters,
                            searchTerm: e.target.value,
                            pageNumber: 1
                          })
                        }
                        style={{ width: "150px" }}
                      />
                      <select
                        className="form-select form-select-sm"
                        value={transactionFilters.status}
                        onChange={(e) =>
                          setTransactionFilters({
                            ...transactionFilters,
                            status: e.target.value,
                            pageNumber: 1
                          })
                        }
                        style={{ width: "130px" }}
                      >
                        <option value="">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={transactionFilters.fromDate}
                        onChange={(e) =>
                          setTransactionFilters({
                            ...transactionFilters,
                            fromDate: e.target.value,
                            pageNumber: 1
                          })
                        }
                        style={{ width: "140px" }}
                      />
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={transactionFilters.toDate}
                        onChange={(e) =>
                          setTransactionFilters({
                            ...transactionFilters,
                            toDate: e.target.value,
                            pageNumber: 1
                          })
                        }
                        style={{ width: "140px" }}
                      />
                    </div>
                  </div>
                </div>
                <div className="card-body p-0">
                  {loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="bg-light">
                            <tr>
                              <th style={{ width: "80px" }}>ID</th>
                              <th>Patient</th>
                              <th>Doctor</th>
                              <th className="text-end">Amount</th>
                              <th className="text-end">Platform Fee</th>
                              <th className="text-end">Doctor Earning</th>
                              <th>Status</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transactions.length === 0 ? (
                              <tr>
                                <td colSpan="8" className="text-center py-5 text-muted">
                                  <i className="bi bi-inbox d-block mb-2" style={{ fontSize: "32px" }}></i>
                                  No transactions found
                                </td>
                              </tr>
                            ) : (
                              transactions.map((tx) => (
                                <tr key={tx.transactionId}>
                                  <td>
                                    <span className="badge bg-light text-dark">#{tx.transactionId}</span>
                                  </td>
                                  <td>
                                    <div className="d-flex align-items-center gap-2">
                                      <div
                                        className="rounded-circle d-flex align-items-center justify-content-center"
                                        style={{
                                          width: "32px",
                                          height: "32px",
                                          background: "linear-gradient(135deg, #00a08b 0%, #00c4ac 100%)",
                                          color: "white",
                                          fontSize: "12px",
                                          fontWeight: "600"
                                        }}
                                      >
                                        {tx.patientName?.charAt(0) || "?"}
                                      </div>
                                      <span>{tx.patientName || "N/A"}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="d-flex align-items-center gap-2">
                                      <div
                                        className="rounded-circle d-flex align-items-center justify-content-center"
                                        style={{
                                          width: "32px",
                                          height: "32px",
                                          background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
                                          color: "white",
                                          fontSize: "12px",
                                          fontWeight: "600"
                                        }}
                                      >
                                        {tx.providerName?.charAt(0) || "?"}
                                      </div>
                                      <span>{tx.providerName || "N/A"}</span>
                                    </div>
                                  </td>
                                  <td className="text-end fw-semibold">{formatAmount(tx.amount)}</td>
                                  <td className="text-end text-purple">{formatAmount(tx.platformFee)}</td>
                                  <td className="text-end text-success">{formatAmount(tx.providerEarning)}</td>
                                  <td>
                                    <span className={`badge bg-${getStatusBadgeClass(tx.status)}`}>
                                      {tx.status}
                                    </span>
                                  </td>
                                  <td>
                                    <small className="text-muted">{formatDateTime(tx.createdAt)}</small>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {transactionPagination.totalPages > 1 && (
                        <div className="d-flex justify-content-between align-items-center px-4 py-3 border-top">
                          <span className="text-muted" style={{ fontSize: "13px" }}>
                            Page {transactionFilters.pageNumber} of {transactionPagination.totalPages} •{" "}
                            {transactionPagination.totalCount} total
                          </span>
                          <nav>
                            <ul className="pagination pagination-sm mb-0">
                              <li className={`page-item ${transactionFilters.pageNumber === 1 ? "disabled" : ""}`}>
                                <button
                                  className="page-link"
                                  onClick={() => handleTransactionPageChange(transactionFilters.pageNumber - 1)}
                                >
                                  Previous
                                </button>
                              </li>
                              {[...Array(Math.min(5, transactionPagination.totalPages))].map((_, i) => {
                                const page = i + 1;
                                return (
                                  <li
                                    key={page}
                                    className={`page-item ${transactionFilters.pageNumber === page ? "active" : ""}`}
                                  >
                                    <button className="page-link" onClick={() => handleTransactionPageChange(page)}>
                                      {page}
                                    </button>
                                  </li>
                                );
                              })}
                              <li
                                className={`page-item ${
                                  transactionFilters.pageNumber === transactionPagination.totalPages ? "disabled" : ""
                                }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={() => handleTransactionPageChange(transactionFilters.pageNumber + 1)}
                                >
                                  Next
                                </button>
                              </li>
                            </ul>
                          </nav>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Global Config Edit Modal */}
        {showConfigModal && selectedConfig && (
          <div
            className="modal fade show"
            style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
            tabIndex="-1"
            onClick={() => setShowConfigModal(false)}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                  <form onSubmit={handleSaveConfig}>
                    <div className="modal-header">
                      <h5 className="modal-title">
                        <i className="bi bi-gear me-2"></i>
                        Edit Global Commission Rate
                      </h5>
                      <button type="button" className="btn-close" onClick={() => setShowConfigModal(false)} />
                    </div>
                    <div className="modal-body">
                      <div className="alert alert-info">
                        <i className="bi bi-info-circle me-2"></i>
                        <strong>{getServiceTypeLabel(selectedConfig.serviceType)}</strong>
                        <br />
                        <small>This rate applies to all {selectedConfig.serviceType?.includes('CONSULTATION') ? 'doctors' : 'pharmacies'} without a custom rate.</small>
                      </div>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Commission Rate (%)</label>
                          <div className="input-group">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              className="form-control"
                              value={configForm.commissionRate}
                              onChange={handleConfigChange('commissionRate')}
                              required
                            />
                          </div>
                          <small className="text-muted">Platform fee percentage</small>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Min Commission ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-control"
                            value={configForm.minCommission}
                            onChange={handleConfigChange('minCommission')}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Max Commission ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-control"
                            value={configForm.maxCommission}
                            onChange={handleConfigChange('maxCommission')}
                            placeholder="Leave empty for no limit"
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Effective From</label>
                          <input
                            type="datetime-local"
                            className="form-control"
                            value={configForm.effectiveFrom}
                            onChange={handleConfigChange('effectiveFrom')}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Effective To</label>
                          <input
                            type="datetime-local"
                            className="form-control"
                            value={configForm.effectiveTo}
                            onChange={handleConfigChange('effectiveTo')}
                            placeholder="Leave empty for no end date"
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label">Description</label>
                          <textarea
                            className="form-control"
                            rows="2"
                            value={configForm.description}
                            onChange={handleConfigChange('description')}
                            placeholder="Optional description for this rate configuration"
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label">
                            <i className="bi bi-chat-left-text me-1"></i>
                            Reason for Change <span className="text-danger">*</span>
                          </label>
                          <textarea
                            className="form-control"
                            rows="2"
                            value={configForm.reason}
                            onChange={handleConfigChange('reason')}
                            placeholder="Please provide a reason for this change (required for audit log)"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowConfigModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={savingConfig}>
                        {savingConfig ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1"></span>
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
        )}

        {/* Partner Commission Edit Modal */}
        {showPartnerModal && selectedPartner && (
          <div
            className="modal fade show"
            style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
            tabIndex="-1"
            onClick={() => setShowPartnerModal(false)}
          >
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: selectedPartner.partnerType === 'DOCTOR' ? '700px' : '600px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                  <form onSubmit={handleSavePartner}>
                    <div className="modal-header border-0 pb-0">
                      <div className="d-flex align-items-center">
                        {selectedPartner.avatarUrl ? (
                          <img src={selectedPartner.avatarUrl} alt="" className="rounded-circle me-3" style={{ width: 48, height: 48, objectFit: 'cover' }} />
                        ) : (
                          <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${selectedPartner.partnerType === 'DOCTOR' ? 'bg-primary' : 'bg-success'} bg-opacity-10`} style={{ width: 48, height: 48 }}>
                            <i className={`bi ${selectedPartner.partnerType === 'DOCTOR' ? 'bi-person-badge text-primary' : 'bi-shop text-success'} fs-4`}></i>
                          </div>
                        )}
                        <div>
                          <h5 className="modal-title mb-0">{selectedPartner.partnerName}</h5>
                          <small className="text-muted">
                            {selectedPartner.partnerType === 'DOCTOR' ? (
                              <><i className="bi bi-award me-1"></i>{selectedPartner.specialty}</>
                            ) : (
                              <><i className="bi bi-geo-alt me-1"></i>{selectedPartner.location}</>
                            )}
                          </small>
                        </div>
                      </div>
                      <button type="button" className="btn-close" onClick={() => setShowPartnerModal(false)} />
                    </div>
                    <div className="modal-body pt-3">

                      {selectedPartner.partnerType === 'DOCTOR' ? (
                        <div className="d-flex flex-column gap-3">
                          {/* Online Consultation Rate */}
                          <div className="border rounded overflow-hidden">
                            <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-primary bg-opacity-10 border-bottom">
                              <div className="d-flex align-items-center">
                                <i className="bi bi-camera-video text-primary me-2"></i>
                                <span className="fw-semibold">Online Consultation</span>
                              </div>
                              <div>
                                <span className="text-muted me-1">Current:</span>
                                <span className={`fw-bold ${selectedPartner.usingCustomRateOnline ? 'text-primary' : ''}`}>
                                  {formatRate(selectedPartner.effectiveCommissionRateOnline)}
                                </span>
                                {selectedPartner.usingCustomRateOnline && (
                                  <span className="badge bg-primary ms-1">Custom</span>
                                )}
                              </div>
                            </div>
                            <div className="p-3">
                              <div className="row g-3">
                                <div className="col-4">
                                  <label className="form-label fw-medium">
                                    Commission Rate (%) <span className="text-danger">*</span>
                                  </label>
                                  <div className="input-group">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="100"
                                      className="form-control text-center fw-bold"
                                      value={partnerForm.customCommissionRateOnline}
                                      onChange={handlePartnerFormChange('customCommissionRateOnline')}
                                      required
                                      style={{ fontSize: '1.1rem' }}
                                    />
                                  </div>
                                </div>
                                <div className="col-4">
                                  <label className="form-label fw-medium">
                                    Start Date <span className="text-danger">*</span>
                                  </label>
                                  <input
                                    type="datetime-local"
                                    className="form-control"
                                    value={partnerForm.effectiveFromOnline}
                                    onChange={handlePartnerFormChange('effectiveFromOnline')}
                                    required
                                  />
                                </div>
                                <div className="col-4">
                                  <label className="form-label fw-medium">
                                    End Date <span className="text-danger">*</span>
                                  </label>
                                  <input
                                    type="datetime-local"
                                    className="form-control"
                                    value={partnerForm.effectiveToOnline}
                                    onChange={handlePartnerFormChange('effectiveToOnline')}
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Home Visit Consultation Rate */}
                          <div className="border rounded overflow-hidden">
                            <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-info bg-opacity-10 border-bottom">
                              <div className="d-flex align-items-center">
                                <i className="bi bi-building text-info me-2"></i>
                                <span className="fw-semibold">Home Visit Consultation</span>
                              </div>
                              <div>
                                <span className="text-muted me-1">Current:</span>
                                <span className={`fw-bold ${selectedPartner.usingCustomRateOffline ? 'text-info' : ''}`}>
                                  {formatRate(selectedPartner.effectiveCommissionRateOffline)}
                                </span>
                                {selectedPartner.usingCustomRateOffline && (
                                  <span className="badge bg-info ms-1">Custom</span>
                                )}
                              </div>
                            </div>
                            <div className="p-3">
                              <div className="row g-3">
                                <div className="col-4">
                                  <label className="form-label fw-medium">
                                    Commission Rate (%) <span className="text-danger">*</span>
                                  </label>
                                  <div className="input-group">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="100"
                                      className="form-control text-center fw-bold"
                                      value={partnerForm.customCommissionRateOffline}
                                      onChange={handlePartnerFormChange('customCommissionRateOffline')}
                                      required
                                      style={{ fontSize: '1.1rem' }}
                                    />
                                  </div>
                                </div>
                                <div className="col-4">
                                  <label className="form-label fw-medium">
                                    Start Date <span className="text-danger">*</span>
                                  </label>
                                  <input
                                    type="datetime-local"
                                    className="form-control"
                                    value={partnerForm.effectiveFromOffline}
                                    onChange={handlePartnerFormChange('effectiveFromOffline')}
                                    required
                                  />
                                </div>
                                <div className="col-4">
                                  <label className="form-label fw-medium">
                                    End Date <span className="text-danger">*</span>
                                  </label>
                                  <input
                                    type="datetime-local"
                                    className="form-control"
                                    value={partnerForm.effectiveToOffline}
                                    onChange={handlePartnerFormChange('effectiveToOffline')}
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Pharmacy - Single Rate */}
                          <div className="border rounded overflow-hidden">
                            <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-success bg-opacity-10 border-bottom">
                              <div className="d-flex align-items-center">
                                <i className="bi bi-shop text-success me-2"></i>
                                <span className="fw-semibold">Pharmacy Order Commission</span>
                              </div>
                              <div>
                                <span className="text-muted me-1">Current:</span>
                                <span className={`fw-bold ${selectedPartner.usingCustomRate ? 'text-success' : ''}`}>
                                  {formatRate(selectedPartner.effectiveCommissionRate)}
                                </span>
                                {selectedPartner.usingCustomRate && (
                                  <span className="badge bg-success ms-1">Custom</span>
                                )}
                              </div>
                            </div>
                            <div className="p-3">
                              <div className="row g-3">
                                <div className="col-4">
                                  <label className="form-label fw-medium">
                                    Commission Rate(%) <span className="text-danger">*</span>
                                  </label>
                                  <div className="input-group">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="100"
                                      className="form-control text-center fw-bold"
                                      value={partnerForm.customCommissionRate}
                                      onChange={handlePartnerFormChange('customCommissionRate')}
                                      required
                                      style={{ fontSize: '1.1rem' }}
                                    />
                                  </div>
                                </div>
                                <div className="col-4">
                                  <label className="form-label fw-medium">
                                    Start Date <span className="text-danger">*</span>
                                  </label>
                                  <input
                                    type="datetime-local"
                                    className="form-control"
                                    value={partnerForm.effectiveFrom}
                                    onChange={handlePartnerFormChange('effectiveFrom')}
                                    required
                                  />
                                </div>
                                <div className="col-4">
                                  <label className="form-label fw-medium">
                                    End Date <span className="text-danger">*</span>
                                  </label>
                                  <input
                                    type="datetime-local"
                                    className="form-control"
                                    value={partnerForm.effectiveTo}
                                    onChange={handlePartnerFormChange('effectiveTo')}
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Reason for Change */}
                      <div className="mt-3 p-3 border rounded bg-light">
                        <label className="form-label fw-medium">
                          <i className="bi bi-chat-left-text me-1"></i>
                          Reason for Change <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control"
                          rows="2"
                          value={partnerForm.reason}
                          onChange={handlePartnerFormChange('reason')}
                          placeholder="Please provide a reason for this change (required for audit log)"
                          required
                        />
                      </div>
                    </div>
                    <div className="modal-footer bg-light">
                      {(selectedPartner.partnerType === 'DOCTOR' ? hasDoctorCustomRate(selectedPartner) : selectedPartner.customCommissionRate) && (
                        <button
                          type="button"
                          className="btn btn-outline-danger me-auto"
                          onClick={handleRemoveCustomRate}
                          disabled={savingPartner}
                        >
                          <i className="bi bi-arrow-counterclockwise me-1"></i>
                          Reset to Default
                        </button>
                      )}
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPartnerModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary px-4" disabled={savingPartner}>
                        {savingPartner ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-lg me-1"></i>
                            Apply Rates
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
        )}

        {/* Reset Custom Rate Confirm Modal */}
        {showResetConfirm && selectedPartner && (
          <div
            className="modal fade show"
            style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}
            tabIndex="-1"
            onClick={() => setShowResetConfirm(false)}
          >
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header bg-danger bg-opacity-10 border-0">
                  <h5 className="modal-title text-danger">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Reset to Default Rate
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowResetConfirm(false)} />
                </div>
                <div className="modal-body">
                  <div className="alert alert-warning">
                    <i className="bi bi-info-circle me-2"></i>
                    This will remove the custom commission rate for <strong>{selectedPartner.partnerName}</strong>. The default rate will be applied.
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      <i className="bi bi-chat-left-text me-1"></i>
                      Reason for Reset <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={resetReason}
                      onChange={(e) => setResetReason(e.target.value)}
                      placeholder="Please provide a reason for resetting to default rate (required for audit log)"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowResetConfirm(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleConfirmRemoveCustomRate}
                    disabled={savingPartner || !resetReason.trim()}
                  >
                    {savingPartner ? (
                      <><span className="spinner-border spinner-border-sm me-1"></span>Processing...</>
                    ) : (
                      <><i className="bi bi-arrow-counterclockwise me-1"></i>Confirm Reset</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Toast show={toast.show} onClose={hideToast} title={toast.title} message={toast.message} type={toast.type} duration={toast.duration} />
      </main>
    </NavbarAdmin>
  );
}
