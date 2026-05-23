import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { paymentApi } from '../api/paymentApi';

const formatCurrency = (value) => {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-US');
};

export default function DoctorWalletTab({ profile, onRefreshProfile }) {
  const doctorId = profile?.doctorId || profile?.doctorID;
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState(profile?.paypalEmail || '');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    setPaypalEmail(profile?.paypalEmail || '');
  }, [profile?.paypalEmail]);

  const loadWallet = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const [balanceData, transactionData, settlementData] = await Promise.all([
        paymentApi.getPartnerBalance(doctorId, 'DOCTOR'),
        paymentApi.getPartnerTransactions(doctorId),
        paymentApi.getPartnerSettlements(doctorId),
      ]);
      setBalance(balanceData);
      setTransactions(Array.isArray(transactionData) ? transactionData : []);
      setSettlements(Array.isArray(settlementData) ? settlementData : []);
    } catch (error) {
      console.error('Failed to load wallet', error);
      toast.error(error.response?.data?.message || 'Unable to load wallet.');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const pendingBalance = Number(balance?.pendingBalance ?? profile?.pendingSettlement ?? 0);
  const totalEarnings = Number(balance?.totalEarnings ?? profile?.totalEarnings ?? 0);
  const requestedAmount = Number(withdrawAmount || 0);
  const remainingAfterWithdrawal = pendingBalance - requestedAmount;
  const canWithdraw =
    requestedAmount > 0 &&
    remainingAfterWithdrawal > 10 &&
    paypalEmail.trim().length > 0 &&
    !withdrawing;

  const history = useMemo(() => {
    const earningEntries = transactions.map((item) => ({
      kind: 'earning',
      id: `earning-${item.transactionId}`,
      title: `Appointment #${item.appointmentId || '-'}`,
      amount: item.netAmount,
      status: item.status,
      createdAt: item.createdAt,
      raw: item,
    }));

    const withdrawalEntries = settlements.map((item) => ({
      kind: 'withdrawal',
      id: `withdrawal-${item.settlementId}`,
      title: item.settlementNumber || `Withdrawal #${item.settlementId}`,
      amount: Number(item.netAmount || 0) * -1,
      status: item.status,
      createdAt: item.createdAt,
      raw: item,
    }));

    return [...earningEntries, ...withdrawalEntries].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [transactions, settlements]);

  const handleWithdraw = async (event) => {
    event.preventDefault();
    if (!canWithdraw) return;

    setWithdrawing(true);
    try {
      await paymentApi.requestPartnerSettlement(
        doctorId,
        {
          amount: requestedAmount,
          paypalEmail: paypalEmail.trim(),
          notes: 'Doctor wallet withdrawal request',
        },
        'DOCTOR'
      );
      toast.success('Withdrawal request submitted.');
      setWithdrawAmount('');
      await loadWallet();
      await onRefreshProfile?.();
    } catch (error) {
      console.error('Withdrawal failed', error);
      toast.error(error.response?.data?.message || 'Unable to submit withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="doctor-wallet-tab">
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="border rounded-4 p-4 h-100 bg-light-subtle">
            <p className="text-muted mb-1">Current balance</p>
            <h2 className="h3 mb-0 text-success">{formatCurrency(pendingBalance)}</h2>
          </div>
        </div>
        <div className="col-md-4">
          <div className="border rounded-4 p-4 h-100">
            <p className="text-muted mb-1">Total earnings</p>
            <h2 className="h3 mb-0">{formatCurrency(totalEarnings)}</h2>
          </div>
        </div>
        <div className="col-md-4">
          <div className="border rounded-4 p-4 h-100">
            <p className="text-muted mb-1">Withdrawal status</p>
            <p className="mb-0">{balance?.withdrawalStatus || 'Wallet is ready.'}</p>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <form className="border rounded-4 p-4 h-100" onSubmit={handleWithdraw}>
            <h2 className="h5 mb-3">Withdraw to PayPal</h2>
            <div className="mb-3">
              <label className="form-label">PayPal Email</label>
              <input
                type="email"
                className="form-control"
                value={paypalEmail}
                onChange={(event) => setPaypalEmail(event.target.value)}
                placeholder="doctor@example.com"
              />
              <div className="form-text">Must match the PayPal email saved in your profile.</div>
            </div>
            <div className="mb-3">
              <label className="form-label">Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
                placeholder="0.00"
              />
              <div className={remainingAfterWithdrawal > 10 ? 'form-text text-success' : 'form-text text-danger'}>
                Remaining balance after withdrawal must be greater than $10.00.
              </div>
            </div>
            <button type="submit" className="btn btn-success w-100" disabled={!canWithdraw}>
              {withdrawing ? 'Submitting...' : 'Request Withdrawal'}
            </button>
          </form>
        </div>

        <div className="col-lg-7">
          <div className="border rounded-4 p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h5 mb-0">Balance History</h2>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadWallet} disabled={loading}>
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="text-muted mb-0">Loading wallet...</p>
            ) : history.length === 0 ? (
              <p className="text-muted mb-0">No wallet transactions yet.</p>
            ) : (
              <div className="list-group list-group-flush">
                {history.map((entry) => (
                  <button
                    type="button"
                    key={entry.id}
                    className="list-group-item list-group-item-action d-flex justify-content-between align-items-center px-0"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <span>
                      <strong>{entry.title}</strong>
                      <small className="d-block text-muted">{formatDateTime(entry.createdAt)} - {entry.status}</small>
                    </span>
                    <strong className={Number(entry.amount) >= 0 ? 'text-success' : 'text-danger'}>
                      {Number(entry.amount) >= 0 ? '+' : ''}
                      {formatCurrency(entry.amount)}
                    </strong>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedEntry && (
        <div className="modal d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title">Transaction Details</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedEntry(null)}></button>
              </div>
              <div className="modal-body">
                {selectedEntry.kind === 'earning' ? (
                  <>
                    <DetailRow label="Time" value={formatDateTime(selectedEntry.raw.createdAt)} />
                    <DetailRow label="Appointment ID" value={`#${selectedEntry.raw.appointmentId || '-'}`} />
                    <DetailRow label="Patient paid" value={formatCurrency(selectedEntry.raw.grossAmount)} />
                    <DetailRow
                      label="Commission"
                      value={`-${formatCurrency(selectedEntry.raw.commissionAmount).replace('-', '')}`}
                      valueClassName="text-danger"
                    />
                    <DetailRow
                      label="Net received"
                      value={formatCurrency(selectedEntry.raw.netAmount)}
                      valueClassName="text-success"
                    />
                  </>
                ) : (
                  <>
                    <DetailRow label="Time" value={formatDateTime(selectedEntry.raw.createdAt)} />
                    <DetailRow label="Settlement" value={selectedEntry.raw.settlementNumber || selectedEntry.raw.settlementId} />
                    <DetailRow label="PayPal" value={selectedEntry.raw.paypalEmail || '-'} />
                    <DetailRow label="Amount" value={formatCurrency(selectedEntry.raw.netAmount)} valueClassName="text-danger" />
                    <DetailRow label="Status" value={selectedEntry.raw.status} />
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedEntry(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, valueClassName = '' }) {
  return (
    <div className="d-flex justify-content-between gap-3 py-2 border-bottom">
      <span className="text-muted">{label}</span>
      <strong className={valueClassName}>{value}</strong>
    </div>
  );
}
