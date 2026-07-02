export const LOW_STOCK_THRESHOLD = 10;
export const EXPIRING_SOON_DAYS = 30;
export const INVENTORY_SUMMARY_PAGE_SIZE = 5000;

export const ACTIVE_ORDER_STAGES = new Set([
  'AWAITING_PAYMENT',
  'REVISION_REQUESTED',
  'PREPARING',
  'READY',
  'SHIPPING',
  'DELIVERED',
]);

export const WORKFLOW_QUEUE_STAGES = [
  { key: 'NEW_REQUESTS', label: 'New Requests', stages: ['NEW_REQUEST'], tone: 'warning' },
  { key: 'CONSULTING', label: 'Consulting', stages: ['CONSULTING', 'REVISION_REQUESTED'], tone: 'info' },
  { key: 'PAYMENT_DUE', label: 'Payment Due', stages: ['AWAITING_PAYMENT'], tone: 'warning' },
  { key: 'PREPARING', label: 'Preparing', stages: ['PREPARING'], tone: 'info' },
  { key: 'READY', label: 'Ready', stages: ['READY'], tone: 'success' },
  { key: 'SHIPPING', label: 'Shipping', stages: ['SHIPPING'], tone: 'info' },
];

export function normalizeStage(item) {
  return String(item?.workflowStage || item?.orderStatus || item?.status || '').toUpperCase();
}

export function normalizePaymentStatus(order) {
  return String(order?.paymentStatus || order?.payment?.status || '').toUpperCase();
}

export function getOrderAmount(order) {
  return Number(order?.totalAmount ?? order?.totalPrice ?? order?.grandTotal ?? 0) || 0;
}

export function isPaidOrder(order) {
  return normalizePaymentStatus(order) === 'PAID';
}

export function isCancelledOrRefunded(item) {
  const stage = normalizeStage(item);
  return stage === 'CANCELLED' || stage === 'REFUNDED';
}

export function summarizePaymentOrders(orders) {
  const items = Array.isArray(orders) ? orders : [];
  const paidOrders = items.filter(isPaidOrder);
  const paidRevenue = paidOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
  const activeOrders = items.filter((o) => {
    if (isPaidOrder(o) || isCancelledOrRefunded(o)) return false;
    return true;
  });
  const unpaidValue = activeOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
  return {
    paidOrders,
    paymentDueOrders: activeOrders,
    paidRevenue,
    unpaidValue,
    averageOrderValue: paidOrders.length > 0 ? paidRevenue / paidOrders.length : 0,
  };
}

const DATE_FIELDS = ['paidAt', 'paymentDate', 'completedAt', 'updatedAt', 'createdAt', 'orderDate'];

export function getOrderDate(order) {
  for (const field of DATE_FIELDS) {
    const val = order?.[field];
    if (val) return val;
  }
  return null;
}

export function isWithinLastDays(date, days, now = new Date()) {
  if (!date) return false;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  const ms = days * 24 * 60 * 60 * 1000;
  return (now.getTime() - d.getTime()) <= ms;
}

export function buildRevenueTrend(orders, now = new Date()) {
  const paid = Array.isArray(orders) ? orders.filter(isPaidOrder) : [];
  const withDates = paid.filter((o) => getOrderDate(o));
  if (withDates.length === 0) return { hasTrend: false, trend: [], revenue30Days: 0, paidCount30Days: 0 };

  const buckets = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    buckets[label] = { label, revenue: 0 };
  }

  let revenue30Days = 0;
  let paidCount30Days = 0;

  for (const order of withDates) {
    const dateVal = getOrderDate(order);
    if (!isWithinLastDays(dateVal, 30, now)) continue;
    const d = new Date(dateVal);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    if (buckets[label]) {
      buckets[label].revenue += getOrderAmount(order);
    }
    revenue30Days += getOrderAmount(order);
    paidCount30Days++;
  }

  return {
    hasTrend: true,
    trend: Object.values(buckets),
    revenue30Days,
    paidCount30Days,
  };
}

export function summarizeInventoryRisk(items, now = new Date()) {
  if (!Array.isArray(items)) return { lowStock: 0, out: 0, expiringSoon: 0, riskTotal: 0, attentionItems: [] };

  const attention = [];

  for (const item of items) {
    const availableQuantity = Number(item.availableQuantity ?? 0);
    const name = item.medicineName || item.name || `Item #${item.inventoryId || item.medicineId || ''}`;
    const key = `${item.inventoryId || item.medicineId || item.id || Math.random()}`;

    if (availableQuantity <= 0) {
      attention.push({ key, name, reason: 'Out of stock', severity: 0, count: 1 });
      continue;
    }
    if (availableQuantity <= LOW_STOCK_THRESHOLD && availableQuantity > 0) {
      attention.push({ key, name, reason: `Low stock (${availableQuantity})`, severity: 2, count: 1 });
      continue;
    }

    const expiryFields = ['expiryDate', 'expirationDate', 'expiresAt', 'expiry'];
    for (const field of expiryFields) {
      const val = item[field];
      if (val) {
        const expDate = new Date(val);
        if (!Number.isNaN(expDate.getTime())) {
          const ms = EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000;
          if (expDate.getTime() - now.getTime() <= ms && expDate.getTime() > now.getTime()) {
            if (availableQuantity > 0) {
              attention.push({ key, name, reason: `Expires ${new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, severity: 1, count: 1 });
            }
            break;
          }
        }
      }
    }
  }

  const lowStock = items.filter((i) => {
    const q = Number(i.availableQuantity ?? 0);
    return q > 0 && q <= LOW_STOCK_THRESHOLD;
  }).length;
  const out = items.filter((i) => Number(i.availableQuantity ?? 0) <= 0).length;
  const expiringSoon = items.filter((i) => {
    if (Number(i.availableQuantity ?? 0) <= 0) return false;
    for (const field of ['expiryDate', 'expirationDate', 'expiresAt', 'expiry']) {
      const val = i[field];
      if (val) {
        const d = new Date(val);
        if (!Number.isNaN(d.getTime())) {
          const ms = EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000;
          if (d.getTime() - now.getTime() <= ms && d.getTime() > now.getTime()) {
            return true;
          }
        }
      }
    }
    return false;
  }).length;

  attention.sort((a, b) => a.severity - b.severity);
  const deDuped = [];
  const seen = new Set();
  for (const a of attention) {
    if (!seen.has(a.key)) {
      seen.add(a.key);
      deDuped.push(a);
    }
  }

  return {
    lowStock,
    out,
    expiringSoon,
    riskTotal: lowStock + out + expiringSoon,
    attentionItems: deDuped.slice(0, 5).map(({ key, name, reason }) => ({ key, name, reason })),
  };
}

export function buildOverviewMetricModel({ workItems, orders, balance, inventorySummary }) {
  const items = Array.isArray(workItems) ? workItems : [];
  const newRequests = items.filter((i) => normalizeStage(i) === 'NEW_REQUEST').length;
  const activeOrders = items.filter((i) => i.hasOrder && ACTIVE_ORDER_STAGES.has(normalizeStage(i))).length;

  const paymentOrders = Array.isArray(orders) ? orders : [];
  const paymentDueOrders = paymentOrders.filter((o) => {
    if (isPaidOrder(o) || isCancelledOrRefunded(o)) return false;
    return true;
  });
  const unpaidValue = paymentDueOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);

  const inventoryRiskTotal = inventorySummary?.riskTotal ?? 0;
  const revenueValue = Number(balance?.totalEarnings ?? 0);
  const revenueHint = 'Lifetime earnings';
  const revenueIsLifetime = true;

  const completed = items.filter((i) => normalizeStage(i) === 'COMPLETED').length;
  const cancelledAndRefunded = items.filter((i) => isCancelledOrRefunded(i)).length;
  const hasOrder = items.filter((i) => i.hasOrder).length;
  const denominator = hasOrder + completed + cancelledAndRefunded;
  const completedRate = denominator > 0 ? Math.round((completed / denominator) * 100) : 0;
  const cancelledRate = denominator > 0 ? Math.round((cancelledAndRefunded / denominator) * 100) : 0;

  return {
    newRequests,
    activeOrders,
    paymentDueCount: paymentDueOrders.length,
    unpaidValue,
    inventoryRiskTotal,
    revenueValue,
    revenueHint,
    revenueIsLifetime,
    completedRate,
    cancelledRate,
  };
}

export function buildWorkflowQueueData(workItems) {
  const items = Array.isArray(workItems) ? workItems : [];
  const total = items.length;
  return WORKFLOW_QUEUE_STAGES.map((group) => {
    const count = items.filter((i) => group.stages.includes(normalizeStage(i))).length;
    return {
      key: group.key,
      label: group.label,
      tone: group.tone,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}

export function buildInventoryRiskData(inventorySummary) {
  const data = [];
  if (!inventorySummary) return data;

  if (inventorySummary.out > 0) {
    data.push({ key: 'out', label: 'Out of Stock', count: inventorySummary.out, className: 'is-out' });
  }
  if (inventorySummary.expiringSoon > 0) {
    data.push({ key: 'expiring', label: 'Expiring Soon', count: inventorySummary.expiringSoon, className: 'is-expiring' });
  }
  if (inventorySummary.lowStock > 0) {
    data.push({ key: 'low', label: 'Low Stock', count: inventorySummary.lowStock, className: 'is-low' });
  }
  return data;
}
