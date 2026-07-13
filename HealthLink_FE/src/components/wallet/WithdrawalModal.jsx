import React, { useCallback, useEffect, useRef, useState } from 'react';
import { formatCurrency } from './WalletHelpers';
import DetailRow from './DetailRow';
import { paymentApi } from '../../api/paymentApi';
import PartnerPinStatusAction from './security/PartnerPinStatusAction';
import PartnerPinWizardModal from './security/PartnerPinWizardModal';
import { mapPartnerPinError } from './security/partnerPinWizardState';
import PinCodeInput from './security/PinCodeInput';
import { useModalFocus } from '../shared/modalFocus';
import './wallet-shared.css';

export default function WithdrawalModal({
  show,
  onClose,
  onSubmit,
  maxAmount,
  theme,
  withdrawing,
  registeredPaypalEmail = '',
  paypalReadOnly = false,
  pinRequired = false,
  openerRef,
}) {
  const [amount, setAmount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [pin, setPin] = useState('');
  const [pinStatus, setPinStatus] = useState(null);
  const [pinWizardOpen, setPinWizardOpen] = useState(false);
  const [pinSetupLoading, setPinSetupLoading] = useState(false);
  const [pinSetupError, setPinSetupError] = useState('');
  const [pinInitialRetryAfterSeconds, setPinInitialRetryAfterSeconds] = useState(60);
  const pinSetupOpenerRef = useRef(null);
  const withdrawalDialogRef = useRef(null);
  const withdrawalOpenerRef = useRef(null);
  const wasShownRef = useRef(false);
  const c = theme.colors;
  const requestedAmount = Number(amount || 0);

  const resetForm = useCallback(() => {
    setAmount('');
    setPaypalEmail('');
    setErrors({});
    setPin('');
    setPinStatus(null);
    setPinWizardOpen(false);
    setPinSetupLoading(false);
    setPinSetupError('');
    setPinInitialRetryAfterSeconds(60);
  }, []);

  useEffect(() => {
    if (!show) {
      if (wasShownRef.current) resetForm();
      return;
    }
    setPaypalEmail(registeredPaypalEmail || '');
    paymentApi.getPartnerPinStatus().then(setPinStatus).catch(() => setPinStatus({ configured: false, locked: false }));
  }, [show, registeredPaypalEmail, resetForm]);

  useEffect(() => {
    if (show && !wasShownRef.current) withdrawalOpenerRef.current = openerRef?.current || document.activeElement;
    wasShownRef.current = show;
  }, [openerRef, show]);

  const handleClose = () => {
    if (withdrawing) return;
    resetForm();
    onClose();
  };
  const startPinSetup = async (event) => {
    pinSetupOpenerRef.current = event.currentTarget;
    setPinSetupLoading(true);
    setPinSetupError('');
    try {
      await paymentApi.requestPartnerPinOtp();
      setPinInitialRetryAfterSeconds(60);
      setPinWizardOpen(true);
    } catch (requestError) {
      const recovery = mapPartnerPinError(requestError.response?.data, 'request');
      setPinSetupError(recovery.error);
      if (recovery.retryAfterSeconds !== null) {
        setPinInitialRetryAfterSeconds(recovery.retryAfterSeconds);
        setPinWizardOpen(true);
      }
    } finally {
      setPinSetupLoading(false);
    }
  };
  const validate = () => {
    const nextErrors = {};
    const numAmount = Number(amount);
    if (!amount || Number.isNaN(numAmount) || numAmount <= 0) nextErrors.amount = 'Please enter a valid positive amount.';
    else if (numAmount > Number(maxAmount)) nextErrors.amount = `Amount exceeds eligible balance of ${formatCurrency(maxAmount)}.`;
    if (!paypalEmail.trim()) nextErrors.paypalEmail = 'PayPal email is required.';
    else if (!/\S+@\S+\.\S+/.test(paypalEmail)) nextErrors.paypalEmail = 'Please enter a valid PayPal email address.';
    if (pinStatus?.configured && pin.length !== 6) nextErrors.pin = 'Enter your six-digit withdrawal PIN.';
    if (pinRequired && pinStatus && !pinStatus.configured) nextErrors.pin = 'Configure a withdrawal PIN before continuing.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    onSubmit({ amount: requestedAmount, paypalEmail: paypalEmail.trim(), pin: pin || undefined });
  };
  const configured = (next) => {
    setPinStatus(next);
    setPinSetupError('');
    setPinWizardOpen(false);
  };
  useModalFocus({
    active: show && !pinWizardOpen,
    closeDisabled: withdrawing,
    dialogRef: withdrawalDialogRef,
    onClose: handleClose,
    openerRef: withdrawalOpenerRef,
    restoreOnDeactivate: !show,
  });

  return <>
    {show && !pinWizardOpen && <>
      <div className="wallet-modal-backdrop" onClick={handleClose} />
      <div className="wallet-modal" role="dialog" aria-modal="true" aria-label="Withdraw funds" ref={withdrawalDialogRef}>
        <div className="wallet-modal-content" style={{ background: c.modalBg }}>
          <div className="wallet-modal-header" style={{ background: c.modalHeaderBg, borderBottomColor: c.border }}>
            <div className="wallet-modal-header-left"><div className="wallet-modal-header-icon" style={{ background: c.modalIconBg, color: c.modalIconColor }}><span className="material-symbols-outlined">payments</span></div><div><h5 className="wallet-modal-title">Withdraw Funds</h5><p className="wallet-modal-subtitle">Request a payout to your PayPal account</p></div></div>
            <button aria-label="Close withdrawal" className="wallet-modal-close" disabled={withdrawing} onClick={handleClose} type="button"><span className="material-symbols-outlined">close</span></button>
          </div>
          <form noValidate onSubmit={handleSubmit}>
            <div className="wallet-modal-body">
              <div className="wallet-modal-field"><label className="wallet-modal-field-label" htmlFor="withdrawal-paypal-email">PayPal Email <span className="text-danger">*</span></label><input aria-label="PayPal Email" className={`form-control ${errors.paypalEmail ? 'is-invalid' : ''}`} disabled={paypalReadOnly} id="withdrawal-paypal-email" onChange={(event) => setPaypalEmail(event.target.value)} placeholder="your@paypal.email" style={{ background: c.fieldBg, borderColor: c.border }} type="email" value={paypalEmail} /><p className="wallet-modal-hint">Must match the PayPal email in your profile settings.</p>{errors.paypalEmail && <div className="invalid-feedback">{errors.paypalEmail}</div>}</div>
              <div className="wallet-modal-field"><div className="wallet-modal-field-header"><label className="wallet-modal-field-label" htmlFor="withdrawal-amount">Withdrawal Amount <span className="text-danger">*</span></label><span className="wallet-modal-field-balance">Available: <strong>{formatCurrency(maxAmount)}</strong></span></div><div className="input-group"><span className="input-group-text" style={{ background: c.fieldBg, borderColor: c.border }}>$</span><input aria-label="Withdrawal Amount" className={`form-control ${errors.amount ? 'is-invalid' : ''}`} id="withdrawal-amount" min="0.01" onChange={(event) => setAmount(event.target.value)} placeholder="0.00" step="0.01" style={{ background: c.fieldBg, borderColor: c.border }} type="number" value={amount} />{errors.amount && <div className="invalid-feedback">{errors.amount}</div>}</div></div>
              <div className="wallet-modal-security">{pinRequired && pinStatus && !pinStatus.configured ? <PartnerPinStatusAction compact error={pinSetupError} loading={pinSetupLoading} onStart={startPinSetup} status={pinStatus} /> : pinStatus?.configured ? <PinCodeInput id="withdrawal-pin" label="Withdrawal PIN" value={pin} onChange={setPin} disabled={withdrawing} error={errors.pin} autoComplete="current-password" /> : <p className="wallet-modal-hint">Withdrawal PIN is optional until you configure it.</p>}</div>
              <div className="wallet-modal-summary"><p className="wallet-modal-summary-title">Withdrawal Summary</p><DetailRow label="Withdrawal Amount" value={formatCurrency(requestedAmount)} /><DetailRow label="Transaction Fee" value={formatCurrency(0)} valueClassName="text-success" /><div className="wallet-modal-summary-divider" /><div className="wallet-modal-summary-total"><span>You will receive</span><span style={{ color: c.modalBalanceColor }}>{formatCurrency(requestedAmount)}</span></div></div>
            </div>
            <div className="wallet-modal-footer" style={{ borderTopColor: c.border }}><button className="btn wallet-modal-btn wallet-modal-btn--cancel" disabled={withdrawing} onClick={handleClose} type="button">Cancel</button><button className="btn wallet-modal-btn wallet-modal-btn--submit" disabled={withdrawing} style={{ background: !withdrawing ? c.modalBtnBg : c.fieldBg, color: !withdrawing ? c.modalBtnColor : 'var(--text-muted)' }} type="submit">{withdrawing ? <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />Processing...</> : <><span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>verified</span>Confirm Withdrawal</>}</button></div>
          </form>
        </div>
      </div>
    </>}
    <PartnerPinWizardModal initialRetryAfterSeconds={pinInitialRetryAfterSeconds} onClose={() => setPinWizardOpen(false)} onConfigured={configured} open={pinWizardOpen} openerRef={pinSetupOpenerRef} />
  </>;
}
