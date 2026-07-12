import { test, expect } from '@playwright/test';
import { PHARMACY_TOKEN } from '../fixtures/auth.js';
import { jsonRoute, routeNotifications, routePharmacyProfile } from '../fixtures/routes.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', 'pharmacy-1');
    localStorage.setItem('refreshToken', 'fake-refresh');
  }, PHARMACY_TOKEN);
  await routePharmacyProfile(page, {
    pharmacyId: 'pharmacy-1', name: 'Test Pharmacy', email: 'pharmacy@test.com',
    paypalEmail: 'payout@pharmacy.test', phoneNumber: '9876543210', isOnline: true,
  });
  await routeNotifications(page);
  await page.route('**/api/pharmacy-work-items/pharmacy/*', (route) => jsonRoute(route, []));
  await page.route('**/api/pharmacy-orders/pharmacy/*', (route) => jsonRoute(route, []));
  await page.route('**/api/pharmacy-requests/pharmacy/**', (route) => jsonRoute(route, []));
  await page.route('**/api/payment/partner/**/balance**', (route) => jsonRoute(route, { pendingBalance: 50, totalEarnings: 100, eligibleForWithdrawal: true }));
  await page.route('**/api/payment/partner/**/transactions', (route) => jsonRoute(route, []));
  await page.route('**/api/payment/partner/**/settlements', (route) => jsonRoute(route, []));
});

test('creates a withdrawal PIN from Pharmacy Security', async ({ page }) => {
  let configured = false;
  await page.route('**/api/payment/partner/security/pin', async (route) => {
    if (route.request().method() === 'PUT') {
      expect(route.request().postDataJSON()).toEqual({ otp: '123456', pin: '654321', confirmPin: '654321' });
      configured = true;
      return route.fulfill({ status: 204 });
    }
    return jsonRoute(route, { configured, locked: false, lockedUntil: null });
  });
  await page.route('**/api/payment/partner/security/pin/request-otp', (route) => jsonRoute(route, { message: 'OTP sent' }));

  await page.goto('/pharmacy-page/profile?section=security');
  await page.getByRole('button', { name: 'Create PIN' }).click();
  await page.getByLabel('OTP code').fill('123456');
  await page.getByLabel('Withdrawal PIN', { exact: true }).fill('654321');
  await page.getByLabel('Confirm withdrawal PIN').fill('654321');
  await page.getByRole('button', { name: 'Save PIN' }).click();
  await expect(page.getByText('Withdrawal PIN is configured')).toBeVisible();
});

test('uses registered PayPal email and sends configured PIN with withdrawal', async ({ page }) => {
  let settlementPayload;
  await page.route('**/api/payment/partner/security/pin', (route) => jsonRoute(route, { configured: true, locked: false, lockedUntil: null }));
  await page.route('**/api/payment/partner/pharmacy-1/settle**', (route) => {
    settlementPayload = route.request().postDataJSON();
    return jsonRoute(route, { settlementId: 1, status: 'COMPLETED' }, 201);
  });

  await page.goto('/pharmacy-page/wallet');
  await page.getByRole('button', { name: /withdraw/i }).click();
  await expect(page.getByLabel('PayPal Email')).toHaveValue('payout@pharmacy.test');
  await expect(page.getByLabel('PayPal Email')).toBeDisabled();
  await page.getByLabel('Withdrawal Amount').fill('20');
  await page.getByLabel('Withdrawal PIN', { exact: true }).fill('654321');
  await page.getByRole('button', { name: 'Confirm Withdrawal' }).click();
  await expect.poll(() => settlementPayload).toMatchObject({ amount: 20, paypalEmail: 'payout@pharmacy.test', pin: '654321' });
});
