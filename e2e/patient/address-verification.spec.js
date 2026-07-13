import { test, expect } from '@playwright/test';
import { makeToken } from '../fixtures/auth.js';
import { jsonRoute, routeNotifications } from '../fixtures/routes.js';

test('address verification preserves Vietnamese patient text through request submission', async ({ page }) => {
  const requestCalls = [];
  await page.route('**/api/account/patient/profile', (route) => jsonRoute(route, {
    id: 'patient-1',
    name: 'Test Patient',
    phoneNumber: '1234567890',
    address: '12 Nguyễn Huệ',
    city: 'Hồ Chí Minh',
    country: 'Vietnam',
  }));
  await page.route('**/api/prescriptions/patient/*', (route) => jsonRoute(route, []));
  await routeNotifications(page);
  await page.route('**/api/chat/rooms/me', (route) => jsonRoute(route, []));
  await page.route('**/api/geocoding/geocode', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ address: 'chợ bến thành' });
    return jsonRoute(route, {
      formattedAddress: 'Chợ Bến Thành, Quận 1, Thành phố Thủ Đức, 71009, Việt Nam',
      latitude: 10.772,
      longitude: 106.6983,
      provider: 'GEOAPIFY',
    });
  });
  await page.route('**/api/account/pharmacy/public/recommendations**', (route) => jsonRoute(route, [
    {
      pharmacyId: 'pharm-1',
      name: 'City Pharmacy',
      address: '456 Main St',
      averageRating: 4.5,
      deliveryAvailable: true,
      distanceLabel: '1.2 km',
      stockStatus: 'FULL',
    },
  ]));
  await page.route('**/api/pharmacy-requests', (route) => {
    if (route.request().method() === 'POST') {
      requestCalls.push(route.request().postDataJSON());
      return jsonRoute(route, {
        requestId: 100,
        status: 'PENDING',
        pharmacyOrderId: null,
        pharmacyName: 'City Pharmacy',
        patientId: 'patient-1',
        requestType: 'CONSULTATION',
      });
    }
    return jsonRoute(route, {});
  });

  await page.goto('/');
  await page.evaluate((token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', 'test-refresh-token');
    localStorage.setItem('userId', 'patient-1');
  }, makeToken({ sub: 'patient-1', role: 'Patient', preferred_username: 'Test Patient', exp: 4_102_444_800 }));

  await page.reload();
  await expect(page).toHaveURL(/\/patient-dashboard$/);
  await page.locator('a[href="/patient-dashboard/pharmacy"]').click();
  await page.locator('a[href="/patient-dashboard/pharmacy/consult"]').click();
  await page.getByText("Skip, I don't have a prescription").click();

  const address = page.locator('textarea').first();
  await address.fill('chợ bến thành');
  await page.getByRole('button', { name: 'Verify address' }).click();
  await expect(page.getByText(/Location verified:/)).toBeVisible();
  await expect(address).toHaveValue('chợ bến thành');

  await page.locator('button.btn-primary').filter({ hasText: 'Continue' }).click();
  await page.locator('button.btn-outline-primary').filter({ hasText: 'Send Order' }).first().click();
  await expect.poll(() => requestCalls.length).toBe(1);
  expect(requestCalls[0].deliveryAddress).toBe('chợ bến thành');
});
