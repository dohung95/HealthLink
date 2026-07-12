import { test, expect } from '@playwright/test';
import { DOCTOR_TOKEN } from '../fixtures/auth.js';
import { jsonRoute, routeNotifications } from '../fixtures/routes.js';

test('doctor can manage a withdrawal PIN from Profile', async ({ page }) => {
  await page.addInitScript((token) => {
    localStorage.setItem('token', token); localStorage.setItem('userId', 'doctor-1'); localStorage.setItem('refreshToken', 'fake-refresh');
  }, DOCTOR_TOKEN);
  await page.route('**/api/account/doctors/profile', (route) => jsonRoute(route, { doctorId: 'doctor-1', fullName: 'Test Doctor', paypalEmail: 'doctor@paypal.test' }));
  await page.route('**/api/doctor/reviews?**', (route) => jsonRoute(route, { reviews: [], totalPages: 1, totalElements: 0 }));
  await page.route('**/api/doctor/reviews/stats', (route) => jsonRoute(route, { totalReviews: 0, averageRating: 0, ratingDistribution: {} }));
  await routeNotifications(page);
  await page.route('**/api/chat/rooms/me', (route) => jsonRoute(route, []));
  let configured = false;
  await page.route('**/api/payment/partner/security/pin', (route) => {
    if (route.request().method() === 'PUT') { configured = true; return route.fulfill({ status: 204 }); }
    return jsonRoute(route, { configured, locked: false, lockedUntil: null });
  });
  await page.route('**/api/payment/partner/security/pin/request-otp', (route) => jsonRoute(route, { message: 'OTP sent' }));

  await page.goto('/doctor/profile');
  await page.getByRole('button', { name: 'Create PIN' }).click();
  await page.getByLabel('OTP code').fill('123456');
  await page.getByLabel('Withdrawal PIN', { exact: true }).fill('654321');
  await page.getByLabel('Confirm withdrawal PIN').fill('654321');
  await page.getByRole('button', { name: 'Save PIN' }).click();
  await expect(page.getByText('Withdrawal PIN is configured')).toBeVisible();
});
