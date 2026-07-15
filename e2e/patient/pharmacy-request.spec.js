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

test.describe('Patient Pharmacy Chat & Revision Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', 'patient-1');
      localStorage.setItem('refreshToken', 'fake-refresh');
    }, PATIENT_TOKEN);
  });

  test('active consultation request opens editable pharmacy chat', async ({ page }) => {
    await routePatientProfile(page, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    });
    await page.route('**/api/pharmacy-requests/patient/*', (r) => jsonRoute(r, [{
      requestId: 200, pharmacyName: 'City Pharmacy', status: 'IN_REVIEW',
      requestType: 'CONSULTATION', chatRoomId: 'patient-chat-room',
      symptoms: 'Consultation needed', createdAt: NOW,
    }]));
    await page.route('**/api/chat/rooms/patient-chat-room', (r) => jsonRoute(r, {
      chatRoomId: 'patient-chat-room', user1Id: 'patient-1', user2Id: 'pharmacy-1',
    }));
    await page.route('**/api/chat/rooms/patient-chat-room/messages*', (r) => jsonRoute(r, []));

    await page.goto('/patient-dashboard/pharmacy/requests');
    await expect(page.getByText('City Pharmacy')).toBeVisible();
    await expect(page.getByText('Chat with pharmacy')).toBeVisible();

    await page.getByRole('button', { name: 'Chat with pharmacy' }).click();
    await expect(page.locator('input[placeholder="Type a message..."]')).toBeVisible();
  });

  test('revision order opens editable chat in Order Detail', async ({ page }) => {
    const loadRequests = [];
    await routePatientProfile(page, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    });
    await page.route('**/api/pharmacy-requests/**', async (r) => {
      const url = r.request().url();
      if (url.includes('/requests/')) {
        loadRequests.push(url);
        return jsonRoute(r, {
          requestId: 300, pharmacyName: 'City Pharmacy', status: 'IN_REVIEW',
          requestType: 'CONSULTATION', chatRoomId: 'revision-order-chat',
          pharmacyOrderId: 300, symptoms: 'Consultation', createdAt: NOW,
        });
      }
      return jsonRoute(r, []);
    });
    await page.route('**/api/pharmacy-orders/patient/**', (r) => jsonRoute(r, [{
      orderId: 300, orderNumber: 'ORD-300', pharmacyName: 'City Pharmacy',
      status: 'REVISION_REQUESTED', totalAmount: 120, paymentStatus: 'UNPAID',
      pharmacyRequestId: 300, createdAt: NOW,
    }]));
    await page.route('**/api/pharmacy-orders/300', (r) => jsonRoute(r, {
      orderId: 300, orderNumber: 'ORD-300', pharmacyName: 'City Pharmacy',
      status: 'REVISION_REQUESTED', pharmacyRequestId: 300, paymentStatus: 'UNPAID',
      deliveryType: 'Delivery', deliveryAddress: '123 Test St',
      items: [{ medicationName: 'Test Med', quantity: 1, totalPrice: 120 }],
      totalAmount: 120, medicineAmount: 120, deliveryFee: 0,
      createdAt: NOW,
    }));
    await page.route('**/api/chat/rooms/revision-order-chat', (r) => jsonRoute(r, {
      chatRoomId: 'revision-order-chat', user1Id: 'patient-1', user2Id: 'pharmacy-1',
    }));
    await page.route('**/api/chat/rooms/revision-order-chat/messages*', (r) => jsonRoute(r, []));

    await page.goto('/patient-dashboard/pharmacy/orders/300');
    await expect(page.getByText('ORD-300')).toBeVisible();
    await expect(page.getByText(/Chat with pharmacy/i)).toBeVisible();

    await page.getByRole('button', { name: /Chat with pharmacy/i }).click();
    await expect(page.locator('input[placeholder="Type a message..."]')).toBeVisible();
  });

  test('refetched post-quote order changes chat to read-only history', async ({ page }) => {
    await routePatientProfile(page, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    });
    await page.route('**/api/pharmacy-requests/**', (r) => jsonRoute(r, {
      requestId: 400, pharmacyName: 'City Pharmacy', status: 'ORDER_CREATED',
      requestType: 'CONSULTATION', chatRoomId: 'post-quote-chat',
      pharmacyOrderId: 400, symptoms: 'Consultation done', createdAt: NOW,
    }));
    await page.route('**/api/pharmacy-orders/patient/**', (r) => jsonRoute(r, [{
      orderId: 400, orderNumber: 'ORD-400', pharmacyName: 'City Pharmacy',
      status: 'PENDING', totalAmount: 150, paymentStatus: 'UNPAID',
      pharmacyRequestId: 400, createdAt: NOW,
    }]));
    await page.route('**/api/pharmacy-orders/400', (r) => jsonRoute(r, {
      orderId: 400, orderNumber: 'ORD-400', pharmacyName: 'City Pharmacy',
      status: 'PENDING', pharmacyRequestId: 400, paymentStatus: 'UNPAID',
      deliveryType: 'Delivery', deliveryAddress: '123 Test St',
      items: [{ medicationName: 'Final Med', quantity: 1, totalPrice: 150 }],
      totalAmount: 150, medicineAmount: 150, deliveryFee: 0,
      createdAt: NOW,
    }));
    await page.route('**/api/chat/rooms/post-quote-chat', (r) => jsonRoute(r, {
      chatRoomId: 'post-quote-chat', user1Id: 'patient-1', user2Id: 'pharmacy-1',
    }));
    await page.route('**/api/chat/rooms/post-quote-chat/messages*', (r) => jsonRoute(r, []));

    await page.goto('/patient-dashboard/pharmacy/orders/400');
    await expect(page.getByText('ORD-400')).toBeVisible();
    await expect(page.getByText('Chat history')).toBeVisible();
    await expect(page.getByText('View chat history')).toBeVisible();

    await page.getByRole('button', { name: 'View chat history' }).click();
    await expect(page.locator('input[placeholder="Type a message..."]')).toHaveCount(0);
    await expect(page.getByText(/This (pharmacy )?conversation is read-only/i)).toBeVisible();
  });

  test('missing-room order exposes no chat action', async ({ page }) => {
    await routePatientProfile(page, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    });
    await page.route('**/api/pharmacy-requests/patient/*', (r) => jsonRoute(r, [{
      requestId: 500, pharmacyName: 'City Pharmacy', status: 'IN_REVIEW',
      requestType: 'CONSULTATION', chatRoomId: null,
      symptoms: 'No chat room', createdAt: NOW,
    }]));

    await page.goto('/patient-dashboard/pharmacy/requests');
    await expect(page.getByText('City Pharmacy')).toBeVisible();
    await expect(page.getByRole('button', { name: /chat/i })).toHaveCount(0);
  });
});
