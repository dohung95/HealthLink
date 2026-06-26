import React, { useState } from 'react';
import { formatCurrency } from './WalletHelpers';
import DetailRow from './DetailRow';
import './wallet-shared.css';

export default function WithdrawalModal({
  show,
  onClose,
  onSubmit,
  maxAmount,
  theme,
  withdrawing,
  balanceLabel,
}) {
  const [amount, setAmount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [errors, setErrors] = useState({});
  const c = theme.colors;

  const requestedAmount = Number(amount || 0);

  const resetForm = () => {
    setAmount('');
    setPaypalEmail('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = () => {
    const e = {};
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      e.amount = 'Please enter a valid positive amount.';
    } else if (numAmount > Number(maxAmount)) {
      e.amount = `Amount exceeds eligible balance of ${formatCurrency(maxAmount)}.`;
    }
    if (!paypalEmail.trim()) {
      e.paypalEmail = 'PayPal email is required.';
    } else if (!/\S+@\S+\.\S+/.test(paypalEmail)) {
      e.paypalEmail = 'Please enter a valid PayPal email address.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ amount: requestedAmount, paypalEmail: paypalEmail.trim() });
      handleClose();
    }
  };

  if (!show) return null;

  return (
    <>
      <div className="wallet-modal-backdrop" onClick={handleClose} />
      <div className="wallet-modal" role="dialog" aria-modal="true">
        <div className="wallet-modal-content" style={{ background: c.modalBg }}>
          <div className="wallet-modal-header" style={{ background: c.modalHeaderBg, borderBottomColor: c.border }}>
            <div className="wallet-modal-header-left">
              <div
                className="wallet-modal-header-icon"
                style={{ background: c.modalIconBg, color: c.modalIconColor }}
              >
                <span className="material-symbols-outlined">payments</span>
              </div>
              <div>
                <h5 className="wallet-modal-title">Withdraw Funds</h5>
                <p className="wallet-modal-subtitle">Request a payout to your PayPal account</p>
              </div>
            </div>
            <button className="wallet-modal-close" onClick={handleClose} type="button">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form noValidate onSubmit={handleSubmit}>
            <div className="wallet-modal-body">
              <div className="wallet-modal-field">
                <label className="wallet-modal-field-label">
                  PayPal Email <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  className={`form-control ${errors.paypalEmail ? 'is-invalid' : ''}`}
                  placeholder="your@paypal.email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  style={{ background: c.fieldBg, borderColor: c.border }}
                />
                <p className="wallet-modal-hint">
                  Must match the PayPal email in your profile settings.
                </p>
                {errors.paypalEmail && (
                  <div className="invalid-feedback">{errors.paypalEmail}</div>
                )}
              </div>

              <div className="wallet-modal-field">
                <div className="wallet-modal-field-header">
                  <label className="wallet-modal-field-label">
                    Withdrawal Amount <span className="text-danger">*</span>
                  </label>
                  <span className="wallet-modal-field-balance">
                    Available: <strong>{formatCurrency(maxAmount)}</strong>
                  </span>
                </div>
                <div className="input-group">
                  <span
                    className="input-group-text"
                    style={{ background: c.fieldBg, borderColor: c.border }}
                  >$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className={`form-control ${errors.amount ? 'is-invalid' : ''}`}
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ background: c.fieldBg, borderColor: c.border }}
                  />
                  {errors.amount && (
                    <div className="invalid-feedback">{errors.amount}</div>
                  )}
                </div>
              </div>

              <div className="wallet-modal-summary">
                <p className="wallet-modal-summary-title">Withdrawal Summary</p>
                <DetailRow label="Withdrawal Amount" value={formatCurrency(requestedAmount)} />
                <DetailRow label="Transaction Fee" value={formatCurrency(0)} valueClassName="text-success" />
                <div className="wallet-modal-summary-divider" />
                <div className="wallet-modal-summary-total">
                  <span>You will receive</span>
                  <span style={{ color: c.modalBalanceColor }}>{formatCurrency(requestedAmount)}</span>
                </div>
              </div>
            </div>

            <div className="wallet-modal-footer" style={{ borderTopColor: c.border }}>
              <button
                type="button"
                className="btn wallet-modal-btn wallet-modal-btn--cancel"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn wallet-modal-btn wallet-modal-btn--submit"
                disabled={withdrawing}
                style={{
                  background: !withdrawing ? c.modalBtnBg : c.fieldBg,
                  color: !withdrawing ? c.modalBtnColor : 'var(--text-muted)',
                }}
              >
                {withdrawing ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>verified</span>
                    Confirm Withdrawal
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
