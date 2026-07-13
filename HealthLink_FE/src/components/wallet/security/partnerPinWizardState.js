export const PARTNER_PIN_STEPS = ['otp', 'pin', 'confirmPin'];

export function createPartnerPinWizardState(retryAfterSeconds = 60) {
  return {
    step: 'otp',
    otp: '',
    pin: '',
    confirmPin: '',
    error: '',
    retryAfterSeconds,
  };
}

export function resetPartnerPinWizardState() {
  return createPartnerPinWizardState();
}

export function advancePartnerPinStep(step) {
  const index = PARTNER_PIN_STEPS.indexOf(step);
  return PARTNER_PIN_STEPS[index + 1] || null;
}

export function tickPartnerPinCooldown(seconds) {
  return Math.max(0, Number(seconds || 0) - 1);
}

export function mapPartnerPinError(payload = {}, phase) {
  const code = payload.code;
  if (code === 'PIN_OTP_INVALID') {
    return { close: false, error: payload.message || 'Invalid withdrawal PIN OTP.', retryAfterSeconds: null, step: 'otp', clearPinFields: false };
  }
  if (code === 'PIN_OTP_ATTEMPTS_EXCEEDED') {
    return { close: true, error: 'Too many invalid attempts. Request a new code to continue.', retryAfterSeconds: null, step: null, clearPinFields: true };
  }
  if (code === 'PIN_OTP_EXPIRED') {
    return { close: false, error: 'This code has expired. Request a new code to continue.', retryAfterSeconds: 0, step: 'otp', clearPinFields: phase === 'save', };
  }
  if (code === 'PIN_OTP_COOLDOWN') {
    return {
      close: false,
      error: payload.message || 'Please wait before requesting another code.',
      retryAfterSeconds: Math.max(0, Number(payload.retryAfterSeconds || 0)),
      step: 'otp',
      clearPinFields: false,
    };
  }
  return { close: false, error: payload.message || 'Unable to complete withdrawal PIN setup.', retryAfterSeconds: null, step: null, clearPinFields: false };
}
