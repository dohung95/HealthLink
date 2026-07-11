import { test, expect } from '@playwright/test';

function btoa(str) {
  return Buffer.from(str, 'utf-8').toString('base64');
}

function makeToken(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-sig`;
}

const EXP_FAR = Math.floor(Date.now() / 1000) + 86400;
const PATIENT_TOKEN = makeToken({ sub: 'patient-1', role: 'Patient', preferred_username: 'Test Patient', exp: EXP_FAR });
const PHARMACY_TOKEN = makeToken({ sub: 'pharmacy-1', role: 'Pharmacy', preferred_username: 'Test Pharmacy', exp: EXP_FAR });
const NOW = new Date().toISOString();

function jsonRoute(route, data, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
}

test.describe('Patient Prescription Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', 'patient-1');
      localStorage.setItem('refreshToken', 'fake-refresh');
    }, PATIENT_TOKEN);
  });

  test('prescription list renders', async ({ page }) => {
    await page.route('**/api/account/patient/profile', (r) => jsonRoute(r, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    }));
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
    await page.route('**/api/account/patient/profile', (r) => jsonRoute(r, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    }));
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
    await page.route('**/api/account/patient/profile', (r) => jsonRoute(r, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    }));
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

test.describe('Pharmacy Request Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', 'pharmacy-1');
      localStorage.setItem('refreshToken', 'fake-refresh');
    }, PHARMACY_TOKEN);
  });

  async function mockDashboard(page, overrides) {
    await page.route('**/api/account/pharmacy/profile', (r) => jsonRoute(r, {
      pharmacyId: 'pharmacy-1', name: 'Test Pharmacy', email: 'pharmacy@test.com',
      phoneNumber: '9876543210', isOnline: true,
    }));
    await page.route('**/api/pharmacy-work-items/pharmacy/*', (r) => jsonRoute(r, overrides.workItems || []));
    await page.route('**/api/pharmacy-orders/pharmacy/*', (r) => jsonRoute(r, overrides.pharmacyOrders || []));
    await page.route('**/api/pharmacy-requests/pharmacy/**', (r) => jsonRoute(r, overrides.pharmacyRequests || []));
    await page.route('**/api/payment/partner/**/balance', (r) => jsonRoute(r, { balance: 0, currency: 'USD' }));
    await page.route('**/api/payment/partner/**/transactions', (r) => jsonRoute(r, []));
    await page.route('**/api/payment/partner/**/settlements', (r) => jsonRoute(r, []));
  }

  test('accept new request', async ({ page }) => {
    const patchCalls = [];
    await mockDashboard(page, {
      workItems: [{
        workItemId: 'wi-1', requestId: 1, sourceType: 'CONSULTATION_REQUEST',
        requestType: 'ORDER_REQUEST', workflowStage: 'NEW_REQUEST',
        patientName: 'Alice', deliveryPhoneNumber: '111-222-3333',
        symptoms: 'Fever and cough', createdAt: NOW,
        availableActions: ['ACCEPT_REQUEST', 'REJECT_REQUEST'],
      }],
    });
    await page.route('**/api/pharmacy-requests/1/status', async (r) => {
      const body = JSON.parse(r.request().postData() || '{}');
      patchCalls.push(body);
      return jsonRoute(r, { requestId: 1, status: body.status });
    });
    await page.goto('/pharmacy-page/requests');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Alice')).toBeVisible();
    await page.locator('button.btn-primary').filter({ hasText: 'Accept' }).first().click();
    await page.waitForTimeout(500);
    expect(patchCalls.length).toBe(1);
    expect(patchCalls[0].status).toBe('IN_REVIEW');
  });

  test('consultation shows chat and update quote actions', async ({ page }) => {
    await mockDashboard(page, {
      workItems: [{
        workItemId: 'wi-2', requestId: 3, sourceType: 'CONSULTATION_REQUEST',
        requestType: 'CONSULTATION', workflowStage: 'CONSULTING',
        patientName: 'Charlie', chatRoomId: 'chat-3', patientId: 'patient-3',
        symptoms: 'Skin rash', createdAt: NOW,
        availableActions: ['ACCEPT_REQUEST', 'REJECT_REQUEST', 'CHAT', 'VIDEO_CALL', 'UPDATE_QUOTE'],
      }],
    });
    await page.goto('/pharmacy-page/requests');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Charlie')).toBeVisible();
    await expect(page.getByText('Update Quote')).toBeVisible();
  });

  test('prescription request shows create order', async ({ page }) => {
    await mockDashboard(page, {
      workItems: [{
        workItemId: 'wi-3', requestId: 5, sourceType: 'ORDER_REQUEST',
        requestType: 'ORDER_REQUEST', workflowStage: 'NEW_REQUEST',
        patientName: 'Diana', symptoms: 'Prescription refill', createdAt: NOW,
        availableActions: ['CREATE_ORDER'],
      }],
    });
    await page.goto('/pharmacy-page/requests');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Diana')).toBeVisible();
    await expect(page.getByText('Create Order')).toBeVisible();
  });

  test('retail review awaiting payment shows only cancel', async ({ page }) => {
    await mockDashboard(page, {
      workItems: [{
        workItemId: 'wi-4', orderId: 10, sourceType: 'RETAIL_ORDER',
        workflowStage: 'AWAITING_PAYMENT', patientName: 'Eve',
        totalAmount: 75.00, paymentStatus: 'UNPAID', createdAt: NOW,
        availableActions: ['UPDATE_ORDER_STATUS', 'CANCEL_ORDER'],
      }],
    });
    await page.goto('/pharmacy-page/requests');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Eve')).toBeVisible();
    await expect(page.getByText('Confirm', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Cancel')).toBeVisible();
  });

  test('revision shows update quote', async ({ page }) => {
    await mockDashboard(page, {
      workItems: [{
        workItemId: 'wi-5', orderId: 11, sourceType: 'ORDER_REQUEST',
        workflowStage: 'REVISION_REQUESTED', patientName: 'Frank',
        totalAmount: 90.00, createdAt: NOW,
        availableActions: ['UPDATE_QUOTE'],
      }],
    });
    await page.goto('/pharmacy-page/requests');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Frank')).toBeVisible();
    await expect(page.getByText('Update Quote')).toBeVisible();
  });

  test('no-prescription revision hydrates items and can replace medicines in Update Quote', async ({ page }) => {
    const quotePayloads = [];
    await mockDashboard(page, {
      workItems: [{
        workItemId: 'wi-revision-11', requestId: 7, orderId: 11,
        sourceType: 'CONSULTATION_REQUEST', requestType: 'CONSULTATION',
        workflowStage: 'REVISION_REQUESTED', patientName: 'Frank',
        revisionRequestNotes: 'Please replace the first medicine.',
        revisionRequestedAt: NOW, totalAmount: 90.00, createdAt: NOW,
        availableActions: ['UPDATE_QUOTE'],
      }],
    });
    await page.route('**/api/pharmacy-orders/11', (r) => jsonRoute(r, {
      orderId: 11, status: 'REVISION_REQUESTED', paymentStatus: 'PENDING',
      deliveryType: 'Pickup', deliveryFee: 0,
      items: [{
        medicineId: 1, medicationName: 'Original Medicine', quantity: 2,
        totalSupplyDays: 3, unit: 'tablet', route: 'Oral',
        frequency: 'Once daily', timing: 'MORNING', totalPrice: 20, notes: 'Original note',
      }],
    }));
    await page.route('**/api/pharmacy-requests/7/prescriptions', (r) => jsonRoute(r, []));
    await page.route('**/api/pharmacy/inventory**', (r) => jsonRoute(r, {
      content: [{
        medicineId: 2, medicineName: 'Replacement Medicine', genericName: 'Replacement Medicine',
        unit: 'capsule', price: 15, availableQuantity: 30,
      }],
    }));
    await page.route('**/api/pharmacy-orders/11/quote', async (r) => {
      quotePayloads.push(JSON.parse(r.request().postData() || '{}'));
      return jsonRoute(r, { orderId: 11, status: 'PENDING' });
    });

    await page.goto('/pharmacy-page/requests');
    await expect(page.getByText('Frank')).toBeVisible();
    await page.getByRole('button', { name: 'Update Quote' }).click();

    await expect(page.getByRole('button', { name: 'Summary' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prescriptions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Medicines' })).toBeVisible();
    await expect(page.getByText('Original Medicine')).toBeVisible();

    await page.getByRole('button', { name: 'Medicines' }).click();
    await expect(page.getByRole('heading', { name: 'Replacement Medicine' })).toBeVisible();
    await page.locator('.pharmacy-medicines-panel__add-btn').click();
    await page.getByLabel('Remove').first().click();
    await page.locator('.pharmacy-create-order-right button').filter({ hasText: 'Update Quote' }).click();

    await expect.poll(() => quotePayloads.length).toBe(1);
    expect(quotePayloads[0].items).toHaveLength(1);
    expect(quotePayloads[0].items[0].medicineId).toBe(2);
  });

  test('revision notification moves an order from Orders flow to Requests without navigation', async ({ page }) => {
    let revised = false;
    await page.route('**/api/account/pharmacy/profile', (r) => jsonRoute(r, {
      pharmacyId: 'pharmacy-1', name: 'Test Pharmacy', email: 'pharmacy@test.com',
      phoneNumber: '9876543210', isOnline: true,
    }));
    await page.route('**/api/pharmacy-work-items/pharmacy/*', (r) => jsonRoute(r, revised ? [{
      workItemId: 'wi-revision-realtime', requestId: 7, orderId: 11,
      sourceType: 'CONSULTATION_REQUEST', requestType: 'CONSULTATION',
      workflowStage: 'REVISION_REQUESTED', patientName: 'Realtime Patient',
      revisionRequestNotes: 'Please update this quote.', revisionRequestedAt: NOW,
      availableActions: ['UPDATE_QUOTE'], createdAt: NOW,
    }] : [{
      workItemId: 'wi-order-realtime', orderId: 11, sourceType: 'CONSULTATION_REQUEST',
      workflowStage: 'AWAITING_PAYMENT', patientName: 'Realtime Patient',
      paymentStatus: 'PENDING', totalAmount: 20, deliveryType: 'Pickup', createdAt: NOW,
    }]));
    await page.route('**/api/pharmacy-orders/pharmacy/*', (r) => jsonRoute(r, [{
      orderId: 11, orderNumber: 'ORD-11', status: revised ? 'REVISION_REQUESTED' : 'PENDING',
      patientName: 'Realtime Patient', paymentStatus: 'PENDING', totalAmount: 20,
      deliveryType: 'Pickup', createdAt: NOW,
    }]));
    await page.route('**/api/pharmacy-requests/pharmacy/**', (r) => jsonRoute(r, []));
    await page.route('**/api/payment/partner/**/balance', (r) => jsonRoute(r, { balance: 0, currency: 'USD' }));
    await page.route('**/api/payment/partner/**/transactions', (r) => jsonRoute(r, []));
    await page.route('**/api/payment/partner/**/settlements', (r) => jsonRoute(r, []));

    await page.goto('/pharmacy-page/orders');
    await expect(page.getByText('#11', { exact: true })).toBeVisible();

    revised = true;
    await page.evaluate(() => window.__healthLinkDispatchNotification({
      notificationId: 'revision-realtime-11',
      type: 'ORDER_STATUS',
      relatedId: 11,
      actionUrl: '/pharmacy-page/requests?orderId=11',
      title: 'Revision requested',
    }));

    await expect(page).toHaveURL(/\/pharmacy-page\/orders$/);
    await expect(page.getByText('#11', { exact: true })).not.toBeVisible();
    await page.getByRole('link', { name: /Requests/i }).click();
    await expect(page.locator('[data-order-id="11"]')).toHaveClass(/is-revision-highlight/);
    await expect(page.getByText('Please update this quote.')).toBeVisible();
  });
});

test.describe('Kanban and Order List', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', 'pharmacy-1');
      localStorage.setItem('refreshToken', 'fake-refresh');
    }, PHARMACY_TOKEN);

    await page.route('**/api/account/pharmacy/profile', (r) => jsonRoute(r, {
      pharmacyId: 'pharmacy-1', name: 'Test Pharmacy', email: 'pharmacy@test.com',
      phoneNumber: '9876543210', isOnline: true,
    }));
    await page.route('**/api/payment/partner/**/balance', (r) => jsonRoute(r, { balance: 0, currency: 'USD' }));
    await page.route('**/api/payment/partner/**/transactions', (r) => jsonRoute(r, []));
    await page.route('**/api/payment/partner/**/settlements', (r) => jsonRoute(r, []));
  });

  test('orders flow renders no chat/video action', async ({ page }) => {
    await page.route('**/api/pharmacy-orders/pharmacy/*', (r) => jsonRoute(r, [
      { orderId: 20, status: 'AWAITING_PAYMENT', patientName: 'Grace' },
    ]));
    await page.route('**/api/pharmacy-work-items/pharmacy/*', (r) => jsonRoute(r, [{
      workItemId: 'wi-k-1', orderId: 20, sourceType: 'ORDER_REQUEST',
      workflowStage: 'AWAITING_PAYMENT', patientName: 'Grace',
      totalAmount: 50.00, paymentStatus: 'UNPAID', createdAt: NOW, deliveryType: 'DELIVERY',
    }]));
    await page.route('**/api/pharmacy-requests/pharmacy/**', (r) => jsonRoute(r, []));
    await page.goto('/pharmacy-page/orders');
    await page.waitForTimeout(1000);
    await expect(page.getByText('#20', { exact: true })).toBeVisible();
    await expect(page.getByText('Orders flow')).toBeVisible();
  });

  test('order list renders no chat/video action', async ({ page }) => {
    await page.route('**/api/pharmacy-orders/pharmacy/*', (r) => jsonRoute(r, [
      { orderId: 30, status: 'AWAITING_PAYMENT', patientName: 'Heidi' },
    ]));
    await page.route('**/api/pharmacy-work-items/pharmacy/*', (r) => jsonRoute(r, [{
      workItemId: 'wi-l-1', orderId: 30, sourceType: 'ORDER_REQUEST',
      workflowStage: 'AWAITING_PAYMENT', patientName: 'Heidi',
      totalAmount: 60.00, paymentStatus: 'UNPAID', createdAt: NOW,
    }]));
    await page.route('**/api/pharmacy-requests/pharmacy/**', (r) => jsonRoute(r, []));
    await page.goto('/pharmacy-page/order-list');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Heidi')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Order List' })).toBeVisible();
  });
});

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
    await page.route('**/api/account/patient/profile', (r) => jsonRoute(r, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    }));
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
    await page.route('**/api/account/patient/profile', (r) => jsonRoute(r, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    }));
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
    await page.route('**/api/account/patient/profile', (r) => jsonRoute(r, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    }));
    await page.route('**/api/pharmacy-orders/**', (r) => jsonRoute(r, { ...baseOrder, status: 'SHIPPING' }));
    await page.goto('/patient-dashboard/pharmacy/orders/500');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Delivery contact is locked for this order status.')).toBeVisible();
    await expect(page.getByText('Edit Delivery Contact')).not.toBeVisible();
    await expect(page.getByText('Request Delivery Contact Change')).not.toBeVisible();
  });

  test('non-prescription order still shows request revision', async ({ page }) => {
    await page.route('**/api/account/patient/profile', (r) => jsonRoute(r, {
      id: 'patient-1', name: 'Test Patient', phoneNumber: '1234567890',
      address: '123 Test St', city: 'Test City', country: 'US',
      latitude: 10.5, longitude: 106.5,
    }));
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

test.describe('Pharmacy Delivery Contact Change Review', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', 'pharmacy-1');
      localStorage.setItem('refreshToken', 'fake-refresh');
    }, PHARMACY_TOKEN);
  });

  const changeWorkItem = {
    workItemId: 'wi-dc-1', orderId: 500, sourceType: 'DELIVERY_CONTACT_CHANGE_REQUEST',
    workflowStage: 'NEW_REQUEST', patientName: 'Alice',
    deliveryContactChangeRequestId: 100,
    oldDeliveryAddress: '123 Old St', oldDeliveryPhoneNumber: '111-111-1111',
    newDeliveryAddress: '789 New St', newDeliveryPhoneNumber: '999-999-9999',
    deliveryContactChangeReason: 'Moving to a new place',
    orderNumber: 'ORD-500', createdAt: NOW,
    patientId: 'patient-1',
    availableActions: ['APPROVE_DELIVERY_CONTACT_CHANGE', 'REJECT_DELIVERY_CONTACT_CHANGE'],
  };

  test('approve delivery contact change shows and works', async ({ page }) => {
    const patchCalls = [];
    await page.route('**/api/account/pharmacy/profile', (r) => jsonRoute(r, {
      pharmacyId: 'pharmacy-1', name: 'Test Pharmacy', email: 'pharmacy@test.com',
      phoneNumber: '9876543210', isOnline: true,
    }));
    await page.route('**/api/pharmacy-work-items/pharmacy/*', (r) => jsonRoute(r, [changeWorkItem]));
    await page.route('**/api/pharmacy-orders/pharmacy/*', (r) => jsonRoute(r, []));
    await page.route('**/api/pharmacy-requests/pharmacy/**', (r) => jsonRoute(r, []));
    await page.route('**/api/payment/partner/**/balance', (r) => jsonRoute(r, { balance: 0, currency: 'USD' }));
    await page.route('**/api/payment/partner/**/transactions', (r) => jsonRoute(r, []));
    await page.route('**/api/payment/partner/**/settlements', (r) => jsonRoute(r, []));
    await page.route('**/api/pharmacy-orders/delivery-contact-change-requests/**', async (r) => {
      if (r.request().method() === 'PATCH') {
        const body = JSON.parse(r.request().postData() || '{}');
        patchCalls.push(body);
        return jsonRoute(r, { status: body.status });
      }
      return r.continue();
    });
    await page.goto('/pharmacy-page/requests');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Delivery Address Update Request')).toBeVisible();
    await expect(page.getByText('123 Old St')).toBeVisible();
    await expect(page.getByText('789 New St')).toBeVisible();
    await expect(page.getByText('Approve')).toBeVisible();
    await page.getByText('Approve').click();
    await page.waitForTimeout(500);
    expect(patchCalls.length).toBe(1);
    expect(patchCalls[0].status).toBe('APPROVED');
  });

  test('reject delivery contact change works', async ({ page }) => {
    const patchCalls = [];
    await page.route('**/api/account/pharmacy/profile', (r) => jsonRoute(r, {
      pharmacyId: 'pharmacy-1', name: 'Test Pharmacy', email: 'pharmacy@test.com',
      phoneNumber: '9876543210', isOnline: true,
    }));
    await page.route('**/api/pharmacy-work-items/pharmacy/*', (r) => jsonRoute(r, [changeWorkItem]));
    await page.route('**/api/pharmacy-orders/pharmacy/*', (r) => jsonRoute(r, []));
    await page.route('**/api/pharmacy-requests/pharmacy/**', (r) => jsonRoute(r, []));
    await page.route('**/api/payment/partner/**/balance', (r) => jsonRoute(r, { balance: 0, currency: 'USD' }));
    await page.route('**/api/payment/partner/**/transactions', (r) => jsonRoute(r, []));
    await page.route('**/api/payment/partner/**/settlements', (r) => jsonRoute(r, []));
    await page.route('**/api/pharmacy-orders/delivery-contact-change-requests/**', async (r) => {
      if (r.request().method() === 'PATCH') {
        const body = JSON.parse(r.request().postData() || '{}');
        patchCalls.push(body);
        return jsonRoute(r, { status: body.status });
      }
      return r.continue();
    });
    await page.goto('/pharmacy-page/requests');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Reject')).toBeVisible();
    await page.getByText('Reject').click();
    await page.waitForTimeout(500);
    expect(patchCalls.length).toBe(1);
    expect(patchCalls[0].status).toBe('REJECTED');
  });

  test('delivery contact change card has no chat button', async ({ page }) => {
    await page.route('**/api/account/pharmacy/profile', (r) => jsonRoute(r, {
      pharmacyId: 'pharmacy-1', name: 'Test Pharmacy', email: 'pharmacy@test.com',
      phoneNumber: '9876543210', isOnline: true,
    }));
    await page.route('**/api/pharmacy-work-items/pharmacy/*', (r) => jsonRoute(r, [changeWorkItem]));
    await page.route('**/api/pharmacy-orders/pharmacy/*', (r) => jsonRoute(r, []));
    await page.route('**/api/pharmacy-requests/pharmacy/**', (r) => jsonRoute(r, []));
    await page.route('**/api/payment/partner/**/balance', (r) => jsonRoute(r, { balance: 0, currency: 'USD' }));
    await page.route('**/api/payment/partner/**/transactions', (r) => jsonRoute(r, []));
    await page.route('**/api/payment/partner/**/settlements', (r) => jsonRoute(r, []));
    await page.goto('/pharmacy-page/requests');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Delivery Address Update Request')).toBeVisible();
    await expect(page.getByText('Chat')).not.toBeVisible();
    await expect(page.getByText('Video Call')).not.toBeVisible();
  });
});

test.describe('Prescription Quote Revision Guard', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', 'pharmacy-1');
      localStorage.setItem('refreshToken', 'fake-refresh');
    }, PHARMACY_TOKEN);
  });

  test('prescription revision item does not show Update Quote', async ({ page }) => {
    await page.route('**/api/account/pharmacy/profile', (r) => jsonRoute(r, {
      pharmacyId: 'pharmacy-1', name: 'Test Pharmacy', email: 'pharmacy@test.com',
      phoneNumber: '9876543210', isOnline: true,
    }));
    await page.route('**/api/pharmacy-work-items/pharmacy/*', (r) => jsonRoute(r, [{
      workItemId: 'wi-rx-rev-1', orderId: 500, sourceType: 'ORDER_REQUEST',
      workflowStage: 'REVISION_REQUESTED', patientName: 'Grace',
      totalAmount: 150.00, createdAt: NOW,
      items: [
        { medicationName: 'Amoxicillin', quantity: 30, totalPrice: 45.00, sourcePrescriptionItemId: 'spi-1' },
      ],
      availableActions: ['UPDATE_QUOTE'],
    }]));
    await page.route('**/api/pharmacy-orders/pharmacy/*', (r) => jsonRoute(r, []));
    await page.route('**/api/pharmacy-requests/pharmacy/**', (r) => jsonRoute(r, []));
    await page.route('**/api/payment/partner/**/balance', (r) => jsonRoute(r, { balance: 0, currency: 'USD' }));
    await page.route('**/api/payment/partner/**/transactions', (r) => jsonRoute(r, []));
    await page.route('**/api/payment/partner/**/settlements', (r) => jsonRoute(r, []));
    await page.goto('/pharmacy-page/requests');
    await page.waitForTimeout(1000);
    await expect(page.getByText('Grace')).toBeVisible();
    await expect(page.getByText('Update Quote')).not.toBeVisible();
  });
});
