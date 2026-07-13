import { test, expect } from '@playwright/test';
import { PATIENT_TOKEN } from '../fixtures/auth.js';
import { jsonRoute, routePatientProfile } from '../fixtures/routes.js';

const NOW = new Date().toISOString();

test.describe('Patient Prescription Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', 'patient-1');
      localStorage.setItem('refreshToken', 'fake-refresh');
    }, PATIENT_TOKEN);
  });

  test('prescription list renders', async ({ page }) => {
    await routePatientProfile(page, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    });
    await page.route('**/api/prescriptions/patient/*', (r) => jsonRoute(r, [
      { prescriptionHeaderID: 'rx-1', doctorName: 'Dr. Smith', issueDate: '2026-01-15', diagnosis: 'Hypertension' },
      { prescriptionHeaderID: 'rx-2', doctorName: 'Dr. Jones', issueDate: '2026-03-01', diagnosis: 'Diabetes' },
    ]));
    await page.goto('/patient-dashboard/pharmacy/consult');
    await expect(page.locator('.nav-tabs')).toBeVisible();
    await expect(page.getByText('Do you have a prescription?')).toBeVisible();
    await expect(page.getByText('Dr. Smith')).toBeVisible();
    await expect(page.getByText('Dr. Jones')).toBeVisible();
  });

  test('selecting prescription sends ORDER_REQUEST and auto-quote navigates to order detail', async ({ page }) => {
    const requestCalls = [];
    await routePatientProfile(page, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    });
    await page.route('**/api/prescriptions/patient/*', (r) => jsonRoute(r, [
      { prescriptionHeaderID: 'rx-1', doctorName: 'Dr. Smith', issueDate: '2026-01-15', diagnosis: 'Hypertension' },
    ]));
    await page.route('**/api/account/pharmacy/public/recommendations**', (r) => jsonRoute(r, [
      { pharmacyId: 'pharm-1', name: 'City Pharmacy', address: '456 Main St',
        averageRating: 4.5, deliveryAvailable: true, distanceLabel: '1.2 km', stockStatus: 'FULL' },
    ]));
    await page.route('**/api/pharmacy-requests', async (r) => {
      if (r.request().method() === 'POST') {
        const body = JSON.parse(r.request().postData() || '{}');
        requestCalls.push(body);
        return jsonRoute(r, { requestId: 100, status: 'ORDER_CREATED', pharmacyOrderId: 500,
          pharmacyName: 'City Pharmacy', patientId: 'patient-1', requestType: 'ORDER_REQUEST', createdAt: NOW });
      }
      return jsonRoute(r, {});
    });
    await page.route('**/api/pharmacy-orders/**', (r) => jsonRoute(r, {
      orderId: 500, orderNumber: 'ORD-500', pharmacyName: 'City Pharmacy',
      status: 'PENDING', totalAmount: 150.00, medicineAmount: 130.00, deliveryFee: 20.00,
      paymentStatus: 'UNPAID', deliveryType: 'Delivery', deliveryAddress: '456 Main St',
      items: [
        { medicationName: 'Amoxicillin', quantity: 30, totalPrice: 45.00 },
        { medicationName: 'Ibuprofen', quantity: 20, totalPrice: 25.00 },
      ], createdAt: NOW,
    }));
    await page.goto('/patient-dashboard/pharmacy/consult');
    await page.getByText('Dr. Smith').click();
    await page.waitForTimeout(300);
    await page.locator('button.btn-primary').filter({ hasText: 'Continue' }).click();
    await page.waitForTimeout(300);
    await page.locator('button.btn-outline-primary').filter({ hasText: 'Send Order' }).first().click();
    await page.waitForTimeout(1000);
    expect(requestCalls.length).toBe(1);
    expect(requestCalls[0].requestType).toBe('ORDER_REQUEST');
    await expect(page).toHaveURL(/\/patient-dashboard\/pharmacy\/orders\/500/);
    await expect(page.getByText('Amoxicillin')).toBeVisible();
  });

  test('skip prescription sends CONSULTATION and shows connect state', async ({ page }) => {
    const requestCalls = [];
    await routePatientProfile(page, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    });
    await page.route('**/api/prescriptions/patient/*', (r) => jsonRoute(r, []));
    await page.route('**/api/account/pharmacy/public/recommendations**', (r) => jsonRoute(r, [
      { pharmacyId: 'pharm-1', name: 'City Pharmacy', address: '456 Main St',
        averageRating: 4.5, deliveryAvailable: true, distanceLabel: '1.2 km', stockStatus: 'FULL' },
    ]));
    await page.route('**/api/pharmacy-requests', async (r) => {
      if (r.request().method() === 'POST') {
        const body = JSON.parse(r.request().postData() || '{}');
        requestCalls.push(body);
        return jsonRoute(r, { requestId: 100, status: 'PENDING', pharmacyOrderId: null,
          pharmacyName: 'City Pharmacy', patientId: 'patient-1', requestType: 'CONSULTATION', createdAt: NOW });
      }
      return jsonRoute(r, {});
    });
    await page.goto('/patient-dashboard/pharmacy/consult');
    await page.getByText("Skip, I don't have a prescription").click();
    await page.waitForTimeout(300);
    await page.locator('button.btn-primary').filter({ hasText: 'Continue' }).click();
    await page.waitForTimeout(300);
    await page.locator('button.btn-outline-primary').filter({ hasText: 'Send Order' }).first().click();
    await page.waitForTimeout(1000);
    expect(requestCalls.length).toBe(1);
    expect(requestCalls[0].requestType).toBe('CONSULTATION');
    expect(requestCalls[0].prescriptionHeaderIds).toEqual([]);
    await expect(page.getByText('Waiting for pharmacy to accept')).toBeVisible();
  });
});
