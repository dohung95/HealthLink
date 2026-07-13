import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advancePartnerPinStep,
  createPartnerPinWizardState,
  mapPartnerPinError,
  resetPartnerPinWizardState,
  tickPartnerPinCooldown,
} from './partnerPinWizardState.js';

test('moves through the OTP, PIN, and confirmation steps in order', () => {
  assert.equal(advancePartnerPinStep('otp'), 'pin');
  assert.equal(advancePartnerPinStep('pin'), 'confirmPin');
  assert.equal(advancePartnerPinStep('confirmPin'), null);
});

test('resets every secret and transient error when the wizard closes', () => {
  const dirty = {
    ...createPartnerPinWizardState(12),
    otp: '123456',
    pin: '654321',
    confirmPin: '654321',
    error: 'Invalid withdrawal PIN OTP',
    step: 'confirmPin',
  };

  assert.deepEqual(resetPartnerPinWizardState(dirty), createPartnerPinWizardState());
});

test('maps OTP errors to the required recovery behavior', () => {
  assert.deepEqual(mapPartnerPinError({ code: 'PIN_OTP_INVALID', message: 'Bad code' }, 'verify'), {
    close: false,
    error: 'Bad code',
    retryAfterSeconds: null,
    step: 'otp',
    clearPinFields: false,
  });
  assert.deepEqual(mapPartnerPinError({ code: 'PIN_OTP_ATTEMPTS_EXCEEDED' }, 'verify'), {
    close: true,
    error: 'Too many invalid attempts. Request a new code to continue.',
    retryAfterSeconds: null,
    step: null,
    clearPinFields: true,
  });
  assert.deepEqual(mapPartnerPinError({ code: 'PIN_OTP_EXPIRED' }, 'save'), {
    close: false,
    error: 'This code has expired. Request a new code to continue.',
    retryAfterSeconds: 0,
    step: 'otp',
    clearPinFields: true,
  });
});

test('uses server cooldown values and never decrements below zero', () => {
  const cooldown = mapPartnerPinError({ code: 'PIN_OTP_COOLDOWN', retryAfterSeconds: 7 }, 'request');
  assert.equal(cooldown.retryAfterSeconds, 7);
  assert.equal(tickPartnerPinCooldown(1), 0);
  assert.equal(tickPartnerPinCooldown(0), 0);
});
