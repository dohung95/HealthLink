import { test, expect } from '@playwright/test';

function makeToken(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.test-signature`;
}

test('address verification sends Vietnamese text and renders the verified result', async ({ page }) => {
  await page.route('**/api/account/patient/profile', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890', address: '12 Nguyễn Huệ', city: 'Hồ Chí Minh', country: 'Vietnam' }),
  }));
  await page.route('**/api/prescriptions/patient/*', (route) => route.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.route('**/api/notifications**', (route) => route.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.route('**/api/chat/rooms/me', (route) => route.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.route('**/api/geocoding/geocode', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ address: 'chợ bến thành' });
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ formattedAddress: 'Chợ Bến Thành, Quận 1, Hồ Chí Minh', latitude: 10.772, longitude: 106.6983, provider: 'GEOAPIFY' }),
    });
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
});
