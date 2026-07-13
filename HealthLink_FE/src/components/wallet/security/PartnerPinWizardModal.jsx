import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { paymentApi } from '../../../api/paymentApi';
import { useModalFocus } from '../../shared/modalFocus';
import PinCodeInput from './PinCodeInput';
import {
  advancePartnerPinStep,
  createPartnerPinWizardState,
  mapPartnerPinError,
  resetPartnerPinWizardState,
  tickPartnerPinCooldown,
} from './partnerPinWizardState';

const titleByStep = {
  otp: 'Verify withdrawal PIN code',
  pin: 'Create withdrawal PIN',
  confirmPin: 'Confirm withdrawal PIN',
};

export default function PartnerPinWizardModal({ initialRetryAfterSeconds = 60, open, onClose, onConfigured, openerRef }) {
  const [state, setState] = useState(createPartnerPinWizardState);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open) setState(createPartnerPinWizardState(initialRetryAfterSeconds));
  }, [initialRetryAfterSeconds, open]);

  const close = useCallback((force = false) => {
    if (saving && !force) return;
    setState(resetPartnerPinWizardState());
    onClose();
  }, [onClose, saving]);

  useModalFocus({ active: open, closeDisabled: saving, dialogRef, focusKey: state.step, onClose: close, openerRef });

  useEffect(() => {
    if (!open || state.retryAfterSeconds <= 0) return undefined;
    const timer = window.setInterval(() => setState((current) => ({ ...current, retryAfterSeconds: tickPartnerPinCooldown(current.retryAfterSeconds) })), 1000);
    return () => window.clearInterval(timer);
  }, [open, state.retryAfterSeconds]);

  const applyError = (requestError, phase) => {
    const recovery = mapPartnerPinError(requestError.response?.data, phase);
    if (recovery.close) {
      toast.error(recovery.error);
      close(true);
      return;
    }
    setState((current) => ({
      ...current,
      error: recovery.error,
      step: recovery.step || current.step,
      retryAfterSeconds: recovery.retryAfterSeconds ?? current.retryAfterSeconds,
      pin: recovery.clearPinFields ? '' : current.pin,
      confirmPin: recovery.clearPinFields ? '' : current.confirmPin,
    }));
  };

  const resendOtp = async () => {
    if (saving || state.retryAfterSeconds > 0) return;
    setSaving(true);
    setState((current) => ({ ...current, error: '' }));
    try {
      await paymentApi.requestPartnerPinOtp();
      setState((current) => ({ ...current, error: '', otp: '', retryAfterSeconds: 60 }));
    } catch (requestError) {
      applyError(requestError, 'request');
    } finally {
      setSaving(false);
    }
  };

  const continueStep = async () => {
    if (saving) return;
    if (state.step === 'otp') {
      if (state.otp.length !== 6) return setState((current) => ({ ...current, error: 'Enter the six-digit code.' }));
      setSaving(true);
      setState((current) => ({ ...current, error: '' }));
      try {
        await paymentApi.verifyPartnerPinOtp({ otp: state.otp });
        setState((current) => ({ ...current, step: advancePartnerPinStep(current.step), error: '' }));
      } catch (requestError) {
        applyError(requestError, 'verify');
      } finally {
        setSaving(false);
      }
      return;
    }
    if (state.step === 'pin') {
      if (state.pin.length !== 6) return setState((current) => ({ ...current, error: 'Enter a six-digit withdrawal PIN.' }));
      setState((current) => ({ ...current, step: advancePartnerPinStep(current.step), error: '' }));
      return;
    }
    if (state.confirmPin.length !== 6 || state.pin !== state.confirmPin) return setState((current) => ({ ...current, error: 'PIN and confirmation must match.' }));
    setSaving(true);
    setState((current) => ({ ...current, error: '' }));
    try {
      await paymentApi.setPartnerPin({ otp: state.otp, pin: state.pin, confirmPin: state.confirmPin });
      const next = { configured: true, locked: false, lockedUntil: null };
      setState(resetPartnerPinWizardState());
      onConfigured?.(next);
      toast.success('Withdrawal PIN configured.');
      onClose();
    } catch (requestError) {
      applyError(requestError, 'save');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  const inputProps = state.step === 'otp'
    ? { id: 'partner-pin-otp', label: 'OTP code', value: state.otp, onChange: (otp) => setState((current) => ({ ...current, otp, error: '' })), autoComplete: 'one-time-code' }
    : state.step === 'pin'
      ? { id: 'partner-pin-value', label: 'Withdrawal PIN', value: state.pin, onChange: (pin) => setState((current) => ({ ...current, pin, error: '' })), autoComplete: 'new-password' }
      : { id: 'partner-pin-confirm', label: 'Confirm withdrawal PIN', value: state.confirmPin, onChange: (confirmPin) => setState((current) => ({ ...current, confirmPin, error: '' })), autoComplete: 'new-password' };

  return createPortal(
    <div className="partner-pin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section aria-labelledby="partner-pin-modal-title" aria-modal="true" className="partner-pin-modal" ref={dialogRef} role="dialog">
        <header className="partner-pin-modal-header"><div><p className="partner-pin-progress">Step {['otp', 'pin', 'confirmPin'].indexOf(state.step) + 1}/3</p><h2 id="partner-pin-modal-title">{titleByStep[state.step]}</h2></div><button aria-label="Close withdrawal PIN setup" className="partner-pin-icon-button" disabled={saving} onClick={() => close()} type="button"><span className="material-symbols-outlined">close</span></button></header>
        <div className="partner-pin-modal-body"><p className="partner-pin-modal-copy">{state.step === 'otp' ? 'Enter the code sent to your registered email.' : state.step === 'pin' ? 'Choose a six-digit PIN for withdrawals.' : 'Enter the same six-digit PIN again.'}</p><PinCodeInput {...inputProps} disabled={saving} error={state.error} />{state.step === 'otp' && <button className="partner-pin-resend" disabled={saving || state.retryAfterSeconds > 0} onClick={resendOtp} type="button">{state.retryAfterSeconds > 0 ? `Resend code in ${state.retryAfterSeconds}s` : 'Resend code'}</button>}</div>
        <footer className="partner-pin-modal-footer"><button className="partner-pin-secondary-button" disabled={saving} onClick={() => close()} type="button">Cancel</button><button className="partner-pin-primary-button" disabled={saving} onClick={continueStep} type="button">{saving ? 'Please wait...' : state.step === 'confirmPin' ? 'Save PIN' : 'Continue'}</button></footer>
      </section>
    </div>,
    document.body,
  );
}
