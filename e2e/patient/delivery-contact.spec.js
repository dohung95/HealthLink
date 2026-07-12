import { test, expect } from '@playwright/test';
import { PATIENT_TOKEN } from '../fixtures/auth.js';
import { jsonRoute, routePatientProfile } from '../fixtures/routes.js';

const NOW = new Date().toISOString();

test.describe('Patient Delivery Contact Update', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', 'patient-1');
      localStorage.setItem('refreshToken', 'fake-refresh');
    }, PATIENT_TOKEN);
  });

  const baseOrder = {
    orderId: 500, orderNumber: 'ORD-500', pharmacyName: 'City Pharmacy',
    totalAmount: 150.00, medicineAmount: 130.00, deliveryFee: 20.00,
    paymentStatus: 'UNPAID', deliveryType: 'Delivery',
    deliveryAddress: '456 Main St', deliveryPhoneNumber: '111-222-3333',
    prescriptionHeaderId: 'rx-1',
    items: [
      { medicationName: 'Amoxicillin', quantity: 30, totalPrice: 45.00, sourcePrescriptionItemId: 'spi-1' },
      { medicationName: 'Ibuprofen', quantity: 20, totalPrice: 25.00, sourcePrescriptionItemId: 'spi-2' },
    ], createdAt: NOW,
  };

  test('prescription order detail shows delivery contact edit for PENDING status', async ({ page }) => {
    const patchCalls = [];
    await routePatientProfile(page, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    });
    await page.route('**/api/pharmacy-orders/**', async (r) => {
      const url = r.request().url();
      const method = r.request().method();
      if (url.includes('/delivery-contact') && method === 'PATCH') {
        const body = JSON.parse(r.request().postData() || '{}');
        patchCalls.push(body);
        return jsonRoute(r, { ...baseOrder, status: 'PENDING', deliveryAddress: body.deliveryAddress, deliveryPhoneNumber: body.deliveryPhoneNumber });
      }
      if (method === 'GET') {
        return jsonRoute(r, { ...baseOrder, status: 'PENDING' });
      }
      return r.continue();
    });
    await page.goto('/patient-dashboard/pharmacy/orders/500');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Edit Delivery Contact')).toBeVisible();
    await expect(page.getByText('Request Changes')).not.toBeVisible();
    await page.getByText('Edit Delivery Contact').click();
    await page.waitForTimeout(300);
    await page.fill('input.form-control.form-control-sm', '789 New St');
    await page.fill('input.form-control.form-control-sm', '999-888-7777');
    await page.getByText('Save').click();
    await page.waitForTimeout(500);
    expect(patchCalls.length).toBe(1);
    expect(patchCalls[0].deliveryAddress).toBe('789 New St');
    expect(patchCalls[0].deliveryPhoneNumber).toBe('999-888-7777');
  });

  test('prescription order at READY shows request delivery contact change', async ({ page }) => {
    const postCalls = [];
    await routePatientProfile(page, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    });
    await page.route('**/api/pharmacy-orders/**', async (r) => {
      const url = r.request().url();
      const method = r.request().method();
      if (url.includes('/delivery-contact-change-requests') && method === 'POST') {
        const body = JSON.parse(r.request().postData() || '{}');
        postCalls.push(body);
        return jsonRoute(r, { ...baseOrder, status: 'READY', deliveryAddress: body.deliveryAddress, deliveryPhoneNumber: body.deliveryPhoneNumber });
      }
      if (method === 'GET') {
        return jsonRoute(r, { ...baseOrder, status: 'READY' });
      }
      return r.continue();
    });
    await page.goto('/patient-dashboard/pharmacy/orders/500');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Request Delivery Contact Change')).toBeVisible();
    await page.getByText('Request Delivery Contact Change').click();
    await page.waitForTimeout(300);
    await page.fill('input.form-control.form-control-sm', '789 New St');
    await page.fill('input.form-control.form-control-sm', '999-888-7777');
    await page.fill('textarea.form-control', 'Moving to a new place');
    await page.getByText('Send Request').click();
    await page.waitForTimeout(500);
    expect(postCalls.length).toBe(1);
    expect(postCalls[0].deliveryAddress).toBe('789 New St');
    expect(postCalls[0].deliveryPhoneNumber).toBe('999-888-7777');
    expect(postCalls[0].reason).toBe('Moving to a new place');
  });

  test('prescription order at SHIPPING locks delivery contact', async ({ page }) => {
    await routePatientProfile(page, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    });
    await page.route('**/api/pharmacy-orders/**', (r) => jsonRoute(r, { ...baseOrder, status: 'SHIPPING' }));
    await page.goto('/patient-dashboard/pharmacy/orders/500');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Delivery contact is locked for this order status.')).toBeVisible();
    await expect(page.getByText('Edit Delivery Contact')).not.toBeVisible();
    await expect(page.getByText('Request Delivery Contact Change')).not.toBeVisible();
  });

  test('non-prescription order still shows request revision', async ({ page }) => {
    await routePatientProfile(page, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    });
    const consultOrder = {
      orderId: 600, orderNumber: 'ORD-600', pharmacyName: 'City Pharmacy',
      totalAmount: 80.00, medicineAmount: 70.00, deliveryFee: 10.00,
      paymentStatus: 'UNPAID', deliveryType: 'Delivery',
      deliveryAddress: '456 Main St', deliveryPhoneNumber: '111-222-3333',
      pharmacyRequestId: 100,
      items: [
        { medicationName: 'Vitamin C', quantity: 30, totalPrice: 45.00 },
      ], createdAt: NOW, status: 'PENDING',
    };
    await page.route('**/api/pharmacy-orders/**', (r) => jsonRoute(r, consultOrder));
    await page.goto('/patient-dashboard/pharmacy/orders/600');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Request Changes')).toBeVisible();
    await expect(page.getByText('Edit Delivery Contact')).not.toBeVisible();
  });
});
