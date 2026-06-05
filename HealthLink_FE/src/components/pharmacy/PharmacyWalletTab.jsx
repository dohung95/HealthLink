import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { paymentApi } from '../../api/paymentApi';
import {
  MetricCard,
  Modal,
  Pagination,
  dateTime,
  money,
  statusClass,
} from './PharmacyShared';

export default function PharmacyWalletTab({ profile, balance, transactions, settlements, pharmacyId, reload, loading }) {
  const [activeHistory, setActiveHistory] = useState('settlements');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState(profile?.paypalEmail || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setPaypalEmail(profile?.paypalEmail || ''), [profile?.paypalEmail]);

  const pendingBalance = Number(balance?.pendingBalance ?? profile?.pendingSettlement ?? 0);
  const requestedAmount = Number(withdrawAmount || 0);
  const canWithdraw = requestedAmount > 0 && pendingBalance - requestedAmount > 10 && paypalEmail.trim() && !submitting;

  const rows = activeHistory === 'settlements'
    ? settlements.map((item) => ({
      id: item.settlementId,
      number: item.settlementNumber,
      type: 'Withdrawal',
      amount: Number(item.netAmount || 0) * -1,
      status: item.status,
      date: item.createdAt,
      raw: item,
    }))
    : transactions.map((item) => ({
      id: item.transactionId,
      number: item.transactionNumber,
      type: item.serviceType || 'Commission',
      amount: item.netAmount,
      status: item.status,
      date: item.createdAt,
      raw: item,
    }));

  const filtered = rows.filter((item) => [item.number, item.type, item.status].join(' ').toLowerCase().includes(query.toLowerCase()));
  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [activeHistory, query]);

  const submitWithdraw = async (event) => {
    event.preventDefault();
    if (!canWithdraw) return;
    setSubmitting(true);
    try {
      await paymentApi.requestPartnerSettlement(pharmacyId, {
        amount: requestedAmount,
        paypalEmail: paypalEmail.trim(),
        notes: 'Pharmacy wallet withdrawal request',
      }, 'PHARMACY');
      toast.success('Withdrawal request submitted.');
      setWithdrawOpen(false);
      setWithdrawAmount('');
      await reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to submit withdrawal.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="pharmacy-loading">
        <span className="material-symbols-outlined">hourglass_empty</span>
        Loading wallet data...
      </div>
    );
  }

  return (
    <>
      <div className="pharmacy-wallet-actions pharmacy-wallet-actions--standalone">
        <span className={balance?.eligibleForWithdrawal ? 'eligible' : 'blocked'}>
          {balance?.eligibleForWithdrawal ? 'Eligible for withdrawal' : 'Not eligible yet'}
        </span>
        <button onClick={() => setWithdrawOpen(true)} type="button">Request Withdrawal</button>
      </div>

      <div className="pharmacy-metrics-grid is-three">
        <MetricCard label="Current Available Balance" value={money(pendingBalance)} hint={balance?.withdrawalStatus} icon="account_balance" />
        <MetricCard label="Pending Balance" value={money(pendingBalance)} hint="Available for approved withdrawals" icon="schedule" tone="warning" />
        <MetricCard label="Total Revenue" value={money(balance?.totalEarnings ?? profile?.totalEarnings)} hint="Lifetime earnings" icon="monitoring" tone="success" />
      </div>

      <section className="pharmacy-card">
        <div className="pharmacy-tabs">
          <button className={activeHistory === 'settlements' ? 'active' : ''} onClick={() => setActiveHistory('settlements')} type="button">Settlement History</button>
          <button className={activeHistory === 'commission' ? 'active' : ''} onClick={() => setActiveHistory('commission')} type="button">Commission History</button>
        </div>
        <div className="pharmacy-filter-bar">
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Search transactions..." value={query} />
        </div>
        <div className="pharmacy-table-wrap">
          <table className="pharmacy-table">
            <thead>
              <tr><th>Date</th><th>Transaction ID</th><th>Type</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {visible.length ? visible.map((item) => (
                <tr key={`${activeHistory}-${item.id}`}>
                  <td>{dateTime(item.date)}</td>
                  <td><strong>{item.number || `#${item.id}`}</strong></td>
                  <td>{item.type}</td>
                  <td className={Number(item.amount) >= 0 ? 'positive' : 'negative'}>{Number(item.amount) >= 0 ? '+' : ''}{money(item.amount)}</td>
                  <td><span className={`pharmacy-status ${statusClass(item.status)}`}>{item.status || '-'}</span></td>
                </tr>
              )) : (
                <tr><td colSpan="5"><div className="pharmacy-empty"><h3>No wallet entries yet</h3></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={pages} total={filtered.length} onPage={setPage} label="entries" />
      </section>

      {withdrawOpen && (
        <Modal title="Request Withdrawal" icon="account_balance" onClose={() => setWithdrawOpen(false)}>
          <div className="wd-modal-body">
            <div className="wd-balance-card">
              <div className="wd-balance-card-inner">
                <div className="wd-balance-icon-wrap">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                </div>
                <div>
                  <p className="wd-balance-label">Current Balance</p>
                  <p className="wd-balance-amount">{money(pendingBalance)}</p>
                </div>
              </div>
            </div>
            <form onSubmit={submitWithdraw}>
              <div className="wd-field">
                <label className="wd-label" htmlFor="paypalEmail">PayPal Email</label>
                <div className="wd-input-group">
                  <span className="wd-input-icon"><i className="bi bi-paypal"></i></span>
                  <input className="wd-input" id="paypalEmail" onChange={(event) => setPaypalEmail(event.target.value)} placeholder="user@example.com" required type="email" value={paypalEmail} />
                </div>
              </div>
              <div className="wd-field" style={{ marginTop: '24px' }}>
                <label className="wd-label" htmlFor="amount">Amount</label>
                <div className="wd-input-group">
                  <span className="wd-input-icon"><span className="material-symbols-outlined">attach_money</span></span>
                  <input className="wd-input" id="amount" min="0" onChange={(event) => setWithdrawAmount(event.target.value)} placeholder="0.00" required step="0.01" type="number" value={withdrawAmount} />
                </div>
                <p className={'wd-hint mt-3' + (pendingBalance - requestedAmount > 10 ? '' : ' wd-hint-error')}>
                  <span className="material-symbols-outlined">info</span>
                  Remaining balance after withdrawal must be greater than $10.00.
                </p>
              </div>
              <div className="wd-actions" style={{ marginTop: '28px' }}>
                <button className="wd-btn wd-btn-secondary" onClick={() => setWithdrawOpen(false)} type="button">Cancel</button>
                <button className="wd-btn wd-btn-primary" disabled={!canWithdraw} type="submit">{submitting ? 'Submitting...' : 'Withdraw'}</button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
}
