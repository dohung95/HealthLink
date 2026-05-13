import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { commissionApi } from "../../../services/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";

export default function CommissionManagement() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  const [transactionPagination, setTransactionPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0
  });

  const [filters, setFilters] = useState({
    searchTerm: '',
    recipientType: '',
    status: '',
    serviceType: '',
    dateFrom: '',
    dateTo: ''
  });

  const [selectedConfig, setSelectedConfig] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    commissionRate: '',
    minCommission: '',
    maxCommission: '',
    description: '',
    active: false,
    effectiveFrom: '',
    effectiveTo: ''
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const normalizePageData = (response) => {
    const items = response.content ?? response.transactions ?? response.data ?? [];
    const pageNumber = response.number != null ? response.number + 1 : response.pageNumber ?? transactionPagination.pageNumber;
    const pageSize = response.size ?? response.pageSize ?? transactionPagination.pageSize;
    const totalCount = response.totalElements ?? response.totalCount ?? items.length;
    const totalPages = response.totalPages ?? (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1);
    return { items, pageNumber, pageSize, totalCount, totalPages };
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashboardData, configsData, transactionsData] = await Promise.all([
          commissionApi.getDashboard(),
          commissionApi.getConfigs(),
          commissionApi.getTransactions({
            pageNumber: transactionPagination.pageNumber,
            pageSize: transactionPagination.pageSize,
            recipientType: filters.recipientType,
            status: filters.status,
            serviceType: filters.serviceType,
            fromDate: filters.dateFrom,
            toDate: filters.dateTo,
            searchTerm: filters.searchTerm
          })
        ]);

        setDashboard(dashboardData);
        setConfigs(configsData?.configs ?? configsData ?? []);
        const { items, pageNumber, pageSize, totalCount, totalPages } = normalizePageData(transactionsData);
        setTransactions(items);
        setTransactionPagination({ pageNumber, pageSize, totalCount, totalPages });
      } catch (err) {
        setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load commission data');
        console.error('Commission load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [transactionPagination.pageNumber, filters]);

  const handleFilterChange = (field) => (e) => {
    setFilters({ ...filters, [field]: e.target.value });
    setTransactionPagination({ ...transactionPagination, pageNumber: 1 });
  };

  const handleConfigEdit = (config) => {
    setSelectedConfig(config);
    setConfigForm({
      commissionRate: config.commissionRate ?? '',
      minCommission: config.minCommission ?? '',
      maxCommission: config.maxCommission ?? '',
      description: config.description ?? '',
      active: config.active ?? false,
      effectiveFrom: config.effectiveFrom ? config.effectiveFrom.slice(0, 16) : '',
      effectiveTo: config.effectiveTo ? config.effectiveTo.slice(0, 16) : ''
    });
    setShowConfigModal(true);
  };

  const handleConfigChange = (field) => (e) => {
    const value = field === 'active' ? e.target.checked : e.target.value;
    setConfigForm({ ...configForm, [field]: value });
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!selectedConfig?.configId) {
      showToast({ title: 'Save Failed', message: 'No config selected.', type: 'error' });
      return;
    }

    try {
      setSavingConfig(true);
      await commissionApi.updateConfig(selectedConfig.configId, {
        commissionRate: configForm.commissionRate,
        minCommission: configForm.minCommission,
        maxCommission: configForm.maxCommission,
        description: configForm.description,
        active: configForm.active,
        effectiveFrom: configForm.effectiveFrom ? new Date(configForm.effectiveFrom).toISOString() : null,
        effectiveTo: configForm.effectiveTo ? new Date(configForm.effectiveTo).toISOString() : null
      });
      setShowConfigModal(false);
      setSelectedConfig(null);
      showToast({ title: 'Saved', message: 'Commission config updated successfully.', type: 'success' });
      const updatedConfigs = configs.map((item) => item.configId === selectedConfig.configId ? { ...item, ...configForm } : item);
      setConfigs(updatedConfigs);
    } catch (err) {
      showToast({ title: 'Save Failed', message: err.response?.data?.error || err.message || 'Unable to save config', type: 'error', duration: 5000 });
      console.error(err);
    } finally {
      setSavingConfig(false);
    }
  };

  const formatAmount = (value) => {
    if (value == null || value === '') return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <NavbarAdmin sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}>
      <main className="admin-content p-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
          <div>
            <h2 className="admin-page-title mb-2">Commission Management</h2>
            <p className="admin-page-subtitle mb-0">Review commission revenue, configure rates, and manage payouts for doctors and pharmacies.</p>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger admin-alert" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        {loading ? (
          <div className="admin-loading text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="admin-card p-3 h-100">
                  <h6>Total Gross Revenue</h6>
                  <p className="fs-4 fw-semibold mb-0">{formatAmount(dashboard?.totalGrossRevenue)}</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="admin-card p-3 h-100">
                  <h6>Total Commission</h6>
                  <p className="fs-4 fw-semibold mb-0">{formatAmount(dashboard?.totalCommission)}</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="admin-card p-3 h-100">
                  <h6>Total Paid Out</h6>
                  <p className="fs-4 fw-semibold mb-0">{formatAmount(dashboard?.totalPaidOut)}</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="admin-card p-3 h-100">
                  <h6>Total Pending</h6>
                  <p className="fs-4 fw-semibold mb-0">{formatAmount(dashboard?.totalPending)}</p>
                </div>
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <div className="admin-card p-3">
                  <h6>Top Doctors Pending</h6>
                  <ul className="list-group list-group-flush">
                    {dashboard?.topDoctorsPending?.length > 0 ? dashboard.topDoctorsPending.map((item, idx) => (
                      <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                        <span>{item.recipientName || item.recipientId}</span>
                        <span>{formatAmount(item.pendingAmount ?? item.commissionAmount ?? item.totalAmount)}</span>
                      </li>
                    )) : <li className="list-group-item">No pending doctor summaries.</li>}
                  </ul>
                </div>
              </div>
              <div className="col-md-6">
                <div className="admin-card p-3">
                  <h6>Top Pharmacies Pending</h6>
                  <ul className="list-group list-group-flush">
                    {dashboard?.topPharmaciesPending?.length > 0 ? dashboard.topPharmaciesPending.map((item, idx) => (
                      <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                        <span>{item.recipientName || item.recipientId}</span>
                        <span>{formatAmount(item.pendingAmount ?? item.commissionAmount ?? item.totalAmount)}</span>
                      </li>
                    )) : <li className="list-group-item">No pending pharmacy summaries.</li>}
                  </ul>
                </div>
              </div>
            </div>

            <div className="admin-card mb-4 p-3">
              <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
                <div>
                  <h5 className="mb-1">Commission Configurations</h5>
                  <small className="text-muted">Update global rules for commission rates and payout window dates.</small>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Rate</th>
                      <th>Min / Max</th>
                      <th>Active</th>
                      <th>Effective</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configs.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4">No commission configuration found.</td>
                      </tr>
                    ) : configs.map((config) => (
                      <tr key={config.configId || config.serviceType}>
                        <td>{config.serviceType || 'General'}</td>
                        <td>{config.commissionRate != null ? `${config.commissionRate}%` : '—'}</td>
                        <td>{formatAmount(config.minCommission)} / {formatAmount(config.maxCommission)}</td>
                        <td>{config.active ? <span className="badge bg-success">Active</span> : <span className="badge bg-secondary">Inactive</span>}</td>
                        <td>{formatDate(config.effectiveFrom)} - {formatDate(config.effectiveTo)}</td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => handleConfigEdit(config)}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-card p-3">
              <div className="row align-items-center gy-2 mb-3">
                <div className="col-md-3">
                  <input type="text" className="form-control" placeholder="Search transactions" value={filters.searchTerm} onChange={handleFilterChange('searchTerm')} />
                </div>
                <div className="col-md-2">
                  <select className="form-select" value={filters.recipientType} onChange={handleFilterChange('recipientType')}>
                    <option value="">Recipient type</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Pharmacy">Pharmacy</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <select className="form-select" value={filters.serviceType} onChange={handleFilterChange('serviceType')}>
                    <option value="">Service type</option>
                    <option value="Telemedicine">Telemedicine</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Consultation">Consultation</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <select className="form-select" value={filters.status} onChange={handleFilterChange('status')}>
                    <option value="">Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="SETTLED">Settled</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
                <div className="col-md-3 row g-2">
                  <div className="col-6">
                    <input type="date" className="form-control" value={filters.dateFrom} onChange={handleFilterChange('dateFrom')} />
                  </div>
                  <div className="col-6">
                    <input type="date" className="form-control" value={filters.dateTo} onChange={handleFilterChange('dateTo')} />
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Transaction</th>
                      <th>Recipient</th>
                      <th>Service</th>
                      <th>Gross</th>
                      <th>Commission</th>
                      <th>Net</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">No commission transactions available.</td>
                      </tr>
                    ) : transactions.map((transaction) => (
                      <tr key={transaction.transactionId || transaction.transactionNumber}>
                        <td>{transaction.transactionNumber || transaction.sourceId || '—'}</td>
                        <td>{transaction.recipientName || transaction.recipientId || '—'}</td>
                        <td>{transaction.serviceType || transaction.sourceType || '—'}</td>
                        <td>{formatAmount(transaction.grossAmount)}</td>
                        <td>{formatAmount(transaction.commissionAmount)}</td>
                        <td>{formatAmount(transaction.netAmount)}</td>
                        <td>{transaction.status || '—'}</td>
                        <td>{formatDate(transaction.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {transactionPagination.totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="text-muted">Page {transactionPagination.pageNumber} of {transactionPagination.totalPages}</div>
                  <div className="btn-group">
                    <button className="btn btn-outline-secondary btn-sm" disabled={transactionPagination.pageNumber === 1} onClick={() => setTransactionPagination({ ...transactionPagination, pageNumber: transactionPagination.pageNumber - 1 })}>
                      Previous
                    </button>
                    <button className="btn btn-outline-secondary btn-sm" disabled>{transactionPagination.pageNumber}</button>
                    <button className="btn btn-outline-secondary btn-sm" disabled={transactionPagination.pageNumber === transactionPagination.totalPages} onClick={() => setTransactionPagination({ ...transactionPagination, pageNumber: transactionPagination.pageNumber + 1 })}>
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {showConfigModal && selectedConfig && (
          <div className="modal d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
              <div className="modal-content">
                <form onSubmit={handleSaveConfig}>
                  <div className="modal-header">
                    <h5 className="modal-title">Edit Commission Config</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowConfigModal(false)} />
                  </div>
                  <div className="modal-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Commission Rate (%)</label>
                        <input type="number" step="0.01" className="form-control" value={configForm.commissionRate} onChange={handleConfigChange('commissionRate')} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Active</label>
                        <div className="form-check form-switch mt-2">
                          <input className="form-check-input" type="checkbox" checked={configForm.active} onChange={handleConfigChange('active')} id="commissionActiveSwitch" />
                          <label className="form-check-label" htmlFor="commissionActiveSwitch">Enabled</label>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Min Commission</label>
                        <input type="number" step="0.01" className="form-control" value={configForm.minCommission} onChange={handleConfigChange('minCommission')} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Max Commission</label>
                        <input type="number" step="0.01" className="form-control" value={configForm.maxCommission} onChange={handleConfigChange('maxCommission')} />
                      </div>
                      <div className="col-md-12">
                        <label className="form-label">Description</label>
                        <textarea className="form-control" rows="3" value={configForm.description} onChange={handleConfigChange('description')} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Effective From</label>
                        <input type="datetime-local" className="form-control" value={configForm.effectiveFrom} onChange={handleConfigChange('effectiveFrom')} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Effective To</label>
                        <input type="datetime-local" className="form-control" value={configForm.effectiveTo} onChange={handleConfigChange('effectiveTo')} />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowConfigModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={savingConfig}>
                      {savingConfig ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <Toast show={toast.show} onClose={hideToast} title={toast.title} message={toast.message} type={toast.type} duration={toast.duration} />
      </main>
    </NavbarAdmin>
  );
}
