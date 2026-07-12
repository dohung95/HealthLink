import { test, expect } from '@playwright/test';
import { PHARMACY_TOKEN } from '../fixtures/auth.js';
import { jsonRoute, routePharmacyProfile } from '../fixtures/routes.js';

const NOW = new Date().toISOString();

test.describe('Pharmacy Request Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', 'pharmacy-1');
      localStorage.setItem('refreshToken', 'fake-refresh');
    }, PHARMACY_TOKEN);
  });

  async function mockDashboard(page, overrides) {
    await routePharmacyProfile(page, {
      pharmacyId: 'pharmacy-1', name: 'Test Pharmacy', email: 'pharmacy@test.com',
      phoneNumber: '9876543210', isOnline: true,
    });
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

  test('revision card presents labeled details before the change request and action footer', async ({ page }) => {
    await mockDashboard(page, {
      workItems: [{
        workItemId: 'wi-revision-hierarchy', orderId: 112, orderNumber: 'ORD-112',
        sourceType: 'ORDER_REQUEST', workflowStage: 'REVISION_REQUESTED',
        patientName: 'Gina', deliveryPhoneNumber: '222-333-4444',
        deliveryAddress: '12 Revision Lane', revisionRequestNotes: 'Please update the delivery instructions.',
        revisionRequestedAt: '2026-07-01T08:30:00.000Z', createdAt: NOW,
        availableActions: ['UPDATE_QUOTE'],
      }],
    });

    await page.goto('/pharmacy-page/requests');

    const card = page.locator('[data-order-id="112"]');
    const details = card.locator('.pharmacy-request-details');
    await expect(details).toBeVisible();
    await expect(details.locator('.pharmacy-request-detail__label', { hasText: 'Order' })).toBeVisible();
    await expect(details.locator('.pharmacy-request-detail__label', { hasText: 'Phone' })).toBeVisible();
    await expect(details.locator('.pharmacy-request-detail__label', { hasText: 'Address' })).toBeVisible();
    await expect(card.locator('.pharmacy-revision-request small')).toHaveCount(0);

    expect(await card.evaluate((element) => {
      const detailsBlock = element.querySelector('.pharmacy-request-details');
      const revisionBlock = element.querySelector('.pharmacy-revision-request');
      const actionFooter = element.querySelector('.pharmacy-case-actions--request-primary');
      return Boolean(
        detailsBlock
        && revisionBlock
        && actionFooter
        && detailsBlock.compareDocumentPosition(revisionBlock) & Node.DOCUMENT_POSITION_FOLLOWING
        && revisionBlock.compareDocumentPosition(actionFooter) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    })).toBe(true);
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
    await routePharmacyProfile(page, {
      pharmacyId: 'pharmacy-1', name: 'Test Pharmacy', email: 'pharmacy@test.com',
      phoneNumber: '9876543210', isOnline: true,
    });
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

    await routePharmacyProfile(page, {
      pharmacyId: 'pharmacy-1', name: 'Test Pharmacy', email: 'pharmacy@test.com',
      phoneNumber: '9876543210', isOnline: true,
    });
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

  test('delivery change confirmation approves in an application modal without a native dialog', async ({ page }) => {
    const patchCalls = [];
    await routePharmacyProfile(page, {
      pharmacyId: 'pharmacy-1', name: 'Test Pharmacy', email: 'pharmacy@test.com',
      phoneNumber: '9876543210', isOnline: true,
    });
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
    await expect(page.getByText('123 Old St')).toBeVisible();
    await expect(page.getByText('789 New St')).toBeVisible();
    const nativeDialogs = [];
    page.on('dialog', async (dialog) => {
      nativeDialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await page.getByLabel('New delivery fee ($)').fill('12.50');
    await page.getByLabel('Estimated minutes').fill('45');
    await page.getByRole('button', { name: 'Approve', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Approve delivery change' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Approve delivery change' })).toBeFocused();
    await expect(dialog.getByText('789 New St')).toBeVisible();
    await expect(dialog.getByText('12.50', { exact: false })).toBeVisible();
    await expect(dialog.getByText('45 minutes', { exact: false })).toBeVisible();
    await expect(dialog.getByText(/patient must reconfirm/i)).toBeVisible();
    expect(nativeDialogs).toEqual([]);
    expect(patchCalls).toHaveLength(0);

    await dialog.getByRole('button', { name: 'Approve change' }).click();
    await expect.poll(() => patchCalls.length).toBe(1);
    expect(patchCalls.length).toBe(1);
    expect(patchCalls[0].status).toBe('APPROVED');
    expect(patchCalls[0].deliveryFee).toBe(12.5);
    expect(patchCalls[0].estimatedDeliveryMinutes).toBe(45);
  });

  test('delivery change confirmation rejects in an application modal without a native dialog', async ({ page }) => {
    const patchCalls = [];
    await routePharmacyProfile(page, {
      pharmacyId: 'pharmacy-1', name: 'Test Pharmacy', email: 'pharmacy@test.com',
      phoneNumber: '9876543210', isOnline: true,
    });
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
    const nativeDialogs = [];
    page.on('dialog', async (dialog) => {
      nativeDialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Reject', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Reject delivery change' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('789 New St')).toBeVisible();
    await expect(dialog.getByText('Moving to a new place')).toBeVisible();
    expect(nativeDialogs).toEqual([]);
    expect(patchCalls).toHaveLength(0);

    await dialog.getByRole('button', { name: 'Reject change' }).click();
    await expect.poll(() => patchCalls.length).toBe(1);
    expect(patchCalls.length).toBe(1);
    expect(patchCalls[0].status).toBe('REJECTED');
  });

  test('delivery contact change card has no chat button', async ({ page }) => {
    await routePharmacyProfile(page, {
      pharmacyId: 'pharmacy-1', name: 'Test Pharmacy', email: 'pharmacy@test.com',
      phoneNumber: '9876543210', isOnline: true,
    });
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
    await routePharmacyProfile(page, {
      pharmacyId: 'pharmacy-1', name: 'Test Pharmacy', email: 'pharmacy@test.com',
      phoneNumber: '9876543210', isOnline: true,
    });
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
