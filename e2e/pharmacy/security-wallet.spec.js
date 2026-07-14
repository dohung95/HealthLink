import { test, expect } from '@playwright/test';
import { PHARMACY_TOKEN } from '../fixtures/auth.js';
import { jsonRoute, routeNotifications, routePharmacyProfile } from '../fixtures/routes.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', 'pharmacy-1');
    localStorage.setItem('refreshToken', 'fake-refresh');
  }, PHARMACY_TOKEN);
  await routePharmacyProfile(page, { pharmacyId: 'pharmacy-1', name: 'Test Pharmacy', email: 'pharmacy@test.com', paypalEmail: 'payout@pharmacy.test', phoneNumber: '9876543210', isOnline: true });
  await routeNotifications(page);
  await page.route('**/api/pharmacy-work-items/pharmacy/*', (route) => jsonRoute(route, []));
  await page.route('**/api/pharmacy-orders/pharmacy/*', (route) => jsonRoute(route, []));
  await page.route('**/api/pharmacy-requests/pharmacy/**', (route) => jsonRoute(route, []));
  await page.route('**/api/payment/partner/**/balance**', (route) => jsonRoute(route, { pendingBalance: 50, totalEarnings: 100, eligibleForWithdrawal: true }));
  await page.route('**/api/payment/partner/**/transactions', (route) => jsonRoute(route, []));
  await page.route('**/api/payment/partner/**/settlements', (route) => jsonRoute(route, []));
});

async function completePinWizard(page) {
  await expect(page.getByText('Step 1/3')).toBeVisible();
  await page.getByLabel('OTP code').fill('123456');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Step 2/3')).toBeVisible();
  await page.waitForTimeout(300);
  // Use ID selector for the PIN input (more reliable than getByLabel in portal)
  await page.locator('#partner-pin-value').fill('654321');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Step 3/3')).toBeVisible();
  await page.locator('#partner-pin-confirm').fill('654321');
  await page.getByRole('button', { name: 'Save PIN' }).click();
}

test('uses a unified pharmacy profile layout and creates a withdrawal PIN in three steps', async ({ page }) => {
  let configured = false;
  const pinApiSteps = [];
  await page.route('**/api/payment/partner/security/pin', async (route) => {
    if (route.request().method() === 'PUT') {
      expect(route.request().postDataJSON()).toEqual({ otp: '123456', pin: '654321', confirmPin: '654321' });
      pinApiSteps.push('save');
      configured = true;
      return route.fulfill({ status: 204 });
    }
    return jsonRoute(route, { configured, locked: false, lockedUntil: null });
  });
  await page.route('**/api/payment/partner/security/pin/request-otp', (route) => { pinApiSteps.push('request'); return jsonRoute(route, { message: 'OTP sent' }); });
  await page.route('**/api/payment/partner/security/pin/verify-otp', (route) => { expect(route.request().postDataJSON()).toEqual({ otp: '123456' }); pinApiSteps.push('verify'); return route.fulfill({ status: 204 }); });

  await page.goto('/pharmacy-page/profile');
  await expect(page.locator('.pharmacy-profile-unified')).toBeVisible();
  await expect(page.locator('.pharmacy-profile-nav')).toHaveCount(0);
  await page.getByRole('button', { name: 'Create PIN' }).click();
  await completePinWizard(page);
  expect(pinApiSteps).toEqual(['request', 'verify', 'save']);
  await expect(page.getByText('Withdrawal PIN configured.')).toHaveCount(1);
  await expect(page.getByText('Withdrawal PIN is configured')).toBeVisible();
});

test('traps wizard focus and resets secrets after Escape closes it', async ({ page }) => {
  await page.route('**/api/payment/partner/security/pin', (route) => jsonRoute(route, { configured: false, locked: false, lockedUntil: null }));
  await page.route('**/api/payment/partner/security/pin/request-otp', (route) => jsonRoute(route, { message: 'OTP sent' }));

  await page.goto('/pharmacy-page/profile');
  await page.getByRole('button', { name: 'Create PIN' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Continue' }).focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close withdrawal PIN setup' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Continue' })).toBeFocused();
  await page.getByLabel('OTP code').fill('123456');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Create PIN' }).click();
  await expect(page.getByLabel('OTP code')).toHaveValue('');
});

test('restores the withdrawal form after configuring a required PIN', async ({ page }) => {
  let configured = false;
  await page.route('**/api/payment/partner/security/pin', async (route) => {
    if (route.request().method() === 'PUT') {
      configured = true;
      return route.fulfill({ status: 204 });
    }
    return jsonRoute(route, { configured, locked: false, lockedUntil: null });
  });
  await page.route('**/api/payment/partner/security/pin/request-otp', (route) => jsonRoute(route, { message: 'OTP sent' }));
  await page.route('**/api/payment/partner/security/pin/verify-otp', (route) => route.fulfill({ status: 204 }));

  await page.goto('/pharmacy-page/wallet');
  await page.getByRole('button', { name: /withdraw/i }).click();
  await page.getByLabel('Withdrawal Amount').fill('20');
  await page.getByRole('button', { name: 'Create PIN' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByLabel('Withdrawal Amount')).toHaveValue('20');
  await expect(page.getByLabel('PayPal Email')).toHaveValue('payout@pharmacy.test');
  await page.getByRole('button', { name: 'Create PIN' }).click();
  await completePinWizard(page);
  await expect(page.getByLabel('Withdrawal Amount')).toHaveValue('20');
  await expect(page.getByLabel('PayPal Email')).toHaveValue('payout@pharmacy.test');
  await expect(page.locator('#withdrawal-pin')).toBeVisible();
});

test('uses registered PayPal email and sends configured PIN with withdrawal', async ({ page }) => {
  let settlementPayload;
  await page.route('**/api/payment/partner/security/pin', (route) => jsonRoute(route, { configured: true, locked: false, lockedUntil: null }));
  await page.route('**/api/payment/partner/pharmacy-1/settle**', (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    settlementPayload = route.request().postDataJSON();
    return jsonRoute(route, { settlementId: 1, status: 'COMPLETED' }, 201);
  });

  await page.goto('/pharmacy-page/wallet');
  await page.getByRole('button', { name: /withdraw/i }).click();
  await expect(page.getByLabel('PayPal Email')).toHaveValue('payout@pharmacy.test');
  await expect(page.getByLabel('PayPal Email')).toBeDisabled();
  await page.getByLabel('Withdrawal Amount').fill('20');
  await page.locator('#withdrawal-pin').fill('654321');
  await page.getByRole('button', { name: 'Confirm Withdrawal' }).click();
  await expect.poll(() => settlementPayload).toMatchObject({ amount: 20, paypalEmail: 'payout@pharmacy.test', pin: '654321' });
  await expect(page.getByRole('dialog', { name: 'Withdraw funds' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Withdraw via PayPal' }).click();
  await expect(page.getByLabel('Withdrawal Amount')).toHaveValue('');
  await expect(page.locator('#withdrawal-pin')).toHaveValue('');
  await page.getByLabel('Withdrawal Amount').fill('20');
  await page.getByRole('button', { name: 'Confirm Withdrawal' }).click();
  await expect(page.getByText('Enter your six-digit withdrawal PIN.')).toBeVisible();
});

test('traps and restores focus for the withdrawal dialog', async ({ page }) => {
  await page.route('**/api/payment/partner/security/pin', (route) => jsonRoute(route, { configured: true, locked: false, lockedUntil: null }));

  await page.goto('/pharmacy-page/wallet');
  const opener = page.getByRole('button', { name: /withdraw/i });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Withdraw funds' });
  await expect(page.getByLabel('Withdrawal Amount')).toBeFocused();
  await dialog.getByRole('button', { name: 'Confirm Withdrawal' }).focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close withdrawal' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('keeps the withdrawal dialog open while a withdrawal is in flight', async ({ page }) => {
  let releaseSettlement;
  const settlementPending = new Promise((resolve) => { releaseSettlement = resolve; });
  await page.route('**/api/payment/partner/security/pin', (route) => jsonRoute(route, { configured: true, locked: false, lockedUntil: null }));
  await page.route('**/api/payment/partner/pharmacy-1/settle**', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await settlementPending;
    return jsonRoute(route, { settlementId: 1, status: 'COMPLETED' }, 201);
  });

  await page.goto('/pharmacy-page/wallet');
  await page.getByRole('button', { name: /withdraw/i }).click();
  const dialog = page.getByRole('dialog', { name: 'Withdraw funds' });
  await page.getByLabel('Withdrawal Amount').fill('20');
  await page.locator('#withdrawal-pin').fill('654321');
  await page.getByRole('button', { name: 'Confirm Withdrawal' }).click();
  await expect(page.getByText('Processing...')).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close withdrawal' })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.locator('.wallet-modal-backdrop').click({ force: true });
  await expect(dialog).toBeVisible();
  releaseSettlement();
  await expect(dialog).toHaveCount(0);
});

test('changes the pharmacy password through the OTP modal flow', async ({ page }) => {
  let otpRequestCount = 0;
  let passwordPayload;
  await page.route('**/api/account/pharmacy/auth/password/request-otp', (route) => {
    otpRequestCount += 1;
    return jsonRoute(route, { message: 'OTP sent' });
  });
  await page.route('**/api/account/pharmacy/auth/password/change-with-otp', (route) => {
    passwordPayload = route.request().postDataJSON();
    return jsonRoute(route, { message: 'Password changed' });
  });

  await page.goto('/pharmacy-page/profile');
  await page.getByRole('button', { name: 'Change password' }).click();
  await page.getByRole('textbox', { name: 'New password', exact: true }).fill('new-secret');
  await page.getByLabel('Confirm new password').fill('new-secret');
  await page.getByRole('button', { name: 'Request code' }).click();
  await expect.poll(() => otpRequestCount).toBe(1);
  await expect(page.getByLabel('OTP code')).toBeVisible();
  await page.getByLabel('OTP code').fill('123456');
  await page.getByRole('dialog').getByRole('button', { name: 'Change password' }).click();
  await expect.poll(() => passwordPayload).toEqual({ otp: '123456', newPassword: 'new-secret', confirmNewPassword: 'new-secret' });
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
