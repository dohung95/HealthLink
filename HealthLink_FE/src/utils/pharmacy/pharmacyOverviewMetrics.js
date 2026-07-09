import {
  getWorkflowStage,
  mergeWorkflowItemsWithOrders,
} from '../../components/pharmacy/workflow/pharmacyWorkflow';

export const LOW_STOCK_THRESHOLD = 10;
export const EXPIRING_SOON_DAYS = 30;
export const INVENTORY_SUMMARY_PAGE_SIZE = 5000;

export const ACTIVE_ORDER_STAGES = new Set([
  'AWAITING_PAYMENT',
  'PREPARING',
  'READY',
  'SHIPPING',
]);

export const TERMINAL_COMPLETED_STAGES = new Set(['COMPLETED']);
export const TERMINAL_CANCELLED_STAGES = new Set(['CANCELLED', 'REFUNDED']);

export const WORKFLOW_QUEUE_STAGES = [
  { key: 'NEW_REQUESTS', label: 'New Requests', stages: ['NEW_REQUEST'] },
  { key: 'PAYMENT_DUE', label: 'Payment Due', stages: ['AWAITING_PAYMENT'] },
  { key: 'PREPARING', label: 'Preparing', stages: ['PREPARING'] },
  { key: 'READY', label: 'Ready', stages: ['READY'] },
];

export const REVENUE_RANGES = {
  WEEK: { key: 'WEEK', label: 'Week', days: 7, bucket: 'day' },
  MONTH: { key: 'MONTH', label: 'Month', days: 30, bucket: 'day' },
  YEAR: { key: 'YEAR', label: 'Year', months: 12, bucket: 'month' },
};

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

export function getOverviewItems(workItems, orders) {
  return mergeWorkflowItemsWithOrders(workItems, orders);
}

export function getOverviewStage(item) {
  return getWorkflowStage(item);
}

export function isActiveOverviewOrder(item) {
  return ACTIVE_ORDER_STAGES.has(getOverviewStage(item));
}

export function isCompletedOverviewOrder(item) {
  return TERMINAL_COMPLETED_STAGES.has(getOverviewStage(item));
}

export function isCancelledOverviewOrder(item) {
  return TERMINAL_CANCELLED_STAGES.has(getOverviewStage(item));
}

export function buildOverviewMetricModel({ workItems, orders, balance, inventorySummary }) {
  const items = getOverviewItems(workItems, orders);
  const activeOrders = items.filter((item) => item?.hasOrder && isActiveOverviewOrder(item)).length;
  const completed = items.filter((item) => item?.hasOrder && isCompletedOverviewOrder(item)).length;
  const cancelledAndRefunded = items.filter((item) => item?.hasOrder && isCancelledOverviewOrder(item)).length;
  const terminalTotal = completed + cancelledAndRefunded;
  const completedRate = terminalTotal > 0 ? Math.round((completed / terminalTotal) * 100) : 0;
  const cancelledRate = terminalTotal > 0 ? Math.round((cancelledAndRefunded / terminalTotal) * 100) : 0;

  return {
    activeOrders,
    inventoryRiskTotal: inventorySummary?.riskTotal ?? 0,
    revenueValue: Number(balance?.totalEarnings ?? 0),
    revenueHint: 'Lifetime earnings',
    completed,
    cancelledAndRefunded,
    completedRate,
    cancelledRate,
  };
}

function queueTone(count) {
  if (count <= 0) return 'neutral';
  if (count <= 4) return 'success';
  if (count <= 8) return 'warning';
  return 'danger';
}

export function buildWorkflowQueueData({ workItems, orders } = {}) {
  const items = getOverviewItems(workItems, orders);
  return WORKFLOW_QUEUE_STAGES.map((group) => {
    const count = items.filter((item) => group.stages.includes(getOverviewStage(item))).length;
    return {
      key: group.key,
      label: group.label,
      count,
      tone: queueTone(count),
      percent: Math.min(100, Math.round((Math.min(count, 10) / 10) * 100)),
    };
  });
}

function getTransactionAmount(transaction) {
  return Number(transaction?.netAmount ?? transaction?.amount ?? transaction?.grossAmount ?? 0) || 0;
}

function getTransactionDate(transaction) {
  return transaction?.createdAt || transaction?.paidAt || transaction?.paymentDate || transaction?.updatedAt || null;
}

function getRevenueEntries({ transactions, orders }) {
  const transactionEntries = (Array.isArray(transactions) ? transactions : [])
    .map((t) => ({
      amount: getTransactionAmount(t),
      date: getTransactionDate(t),
      source: 'transactions',
    }))
    .filter((entry) => entry.amount > 0 && entry.date);

  if (transactionEntries.length > 0) return transactionEntries;

  return (Array.isArray(orders) ? orders : [])
    .filter(isPaidOrder)
    .map((order) => ({
      amount: getOrderAmount(order),
      date: getOrderDate(order),
      source: 'orders',
    }))
    .filter((entry) => entry.amount > 0 && entry.date);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function dayKey(date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function dayLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function monthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

function buildRevenueBuckets(rangeConfig, now) {
  if (rangeConfig.bucket === 'month') {
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now);
      date.setDate(1);
      date.setMonth(date.getMonth() - (11 - index));
      return { key: monthKey(date), label: monthLabel(date), revenue: 0, count: 0 };
    });
  }

  return Array.from({ length: rangeConfig.days }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (rangeConfig.days - 1 - index));
    return { key: dayKey(date), label: dayLabel(date), revenue: 0, count: 0 };
  });
}

export function formatRevenueAxisTick(value) {
  const numeric = Number(value) || 0;
  if (numeric === 0) return '$0';
  if (Math.abs(numeric) < 1000) return `$${Math.round(numeric)}`;
  if (Math.abs(numeric) < 1000000) {
    const formatted = numeric >= 10000 ? Math.round(numeric / 1000) : Number((numeric / 1000).toFixed(1));
    return `$${formatted}K`;
  }
  return `$${Number((numeric / 1000000).toFixed(1))}M`;
}

function getNiceMax(value) {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const factor = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

function buildRevenueYAxisTicks(maxRevenue) {
  if (maxRevenue <= 0) return [0];
  const niceMax = getNiceMax(maxRevenue);
  const rawTicks = Array.from({ length: 5 }, (_, index) => Math.round((niceMax / 4) * index));
  const seenLabels = new Set();
  return rawTicks.filter((tick) => {
    const label = formatRevenueAxisTick(tick);
    if (seenLabels.has(label)) return false;
    seenLabels.add(label);
    return true;
  });
}

export function buildRevenueTrend({ orders, transactions, range = 'MONTH', now = new Date() } = {}) {
  const rangeConfig = REVENUE_RANGES[range] || REVENUE_RANGES.MONTH;
  const buckets = buildRevenueBuckets(rangeConfig, now);
  const bucketMap = new Map(buckets.map((b) => [b.key, b]));
  const entries = getRevenueEntries({ transactions, orders });
  const firstBucketKey = buckets[0]?.key;
  const lastBucketKey = buckets[buckets.length - 1]?.key;

  for (const entry of entries) {
    const date = new Date(entry.date);
    if (Number.isNaN(date.getTime())) continue;
    const key = rangeConfig.bucket === 'month' ? monthKey(date) : dayKey(date);
    if (!bucketMap.has(key)) continue;
    const bucket = bucketMap.get(key);
    bucket.revenue += entry.amount;
    bucket.count += 1;
  }

  const trend = buckets.map((bucket) => ({
    ...bucket,
    revenue: Math.round(bucket.revenue * 100) / 100,
  }));
  const revenueTotal = trend.reduce((sum, bucket) => sum + bucket.revenue, 0);
  const paidCount = trend.reduce((sum, bucket) => sum + bucket.count, 0);
  const maxRevenue = Math.max(...trend.map((bucket) => bucket.revenue), 0);

  return {
    hasTrend: entries.length > 0,
    range: rangeConfig.key,
    rangeLabel: rangeConfig.label,
    sourceLabel: entries[0]?.source === 'transactions' ? 'Net earnings' : 'Paid order revenue',
    firstBucketKey,
    lastBucketKey,
    trend,
    revenueTotal,
    paidCount,
    averageOrderValue: paidCount > 0 ? revenueTotal / paidCount : 0,
    yTicks: buildRevenueYAxisTicks(maxRevenue),
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

export function buildInventoryRiskData(inventorySummary) {
  if (!inventorySummary) {
    return {
      stock: [
        { key: 'out', label: 'Out of Stock', count: 0, className: 'is-out' },
        { key: 'low', label: 'Low Stock', count: 0, className: 'is-low' },
      ],
      expiring: { key: 'expiring', label: 'Expiring Soon', count: 0, className: 'is-expiring' },
    };
  }

  const expiringSoonCount = inventorySummary.expiringSoon || 0;

  return {
    stock: [
      { key: 'out', label: 'Out of Stock', count: inventorySummary.out || 0, className: 'is-out' },
      { key: 'low', label: 'Low Stock', count: inventorySummary.lowStock || 0, className: 'is-low' },
    ],
    expiring: {
      key: 'expiring',
      label: 'Expiring Soon',
      count: expiringSoonCount,
      className: expiringSoonCount > 0 ? 'is-warning' : 'is-success',
    },
  };
}

export function buildOverviewRecommendations({ workflowQueueData, inventorySummary, revenueTrend, overviewMetrics }) {
  const recommendations = [];
  const queueTotal = (workflowQueueData || []).reduce((sum, row) => sum + row.count, 0);
  const ready = (workflowQueueData || []).find((row) => row.key === 'READY')?.count || 0;
  const paymentDue = (workflowQueueData || []).find((row) => row.key === 'PAYMENT_DUE')?.count || 0;

  if (ready > 0) {
    recommendations.push({
      key: 'ready',
      icon: 'inventory',
      title: `${ready} ready order${ready > 1 ? 's' : ''}`,
      text: 'Prioritize pickup or shipping handoff before the queue grows.',
      tone: 'success',
    });
  }

  if (paymentDue > 0) {
    recommendations.push({
      key: 'payment',
      icon: 'payments',
      title: `${paymentDue} payment due`,
      text: 'Watch paid confirmations so newly paid orders move into preparation quickly.',
      tone: 'warning',
    });
  }

  if ((inventorySummary?.out || 0) > 0 || (inventorySummary?.lowStock || 0) > 0) {
    recommendations.push({
      key: 'stock',
      icon: 'inventory_2',
      title: 'Stock needs review',
      text: `${inventorySummary.out || 0} out of stock and ${inventorySummary.lowStock || 0} low stock items need replenishment.`,
      tone: 'danger',
    });
  }

  if ((revenueTrend?.revenueTotal || 0) > 0) {
    recommendations.push({
      key: 'revenue',
      icon: 'monitoring',
      title: `${formatRevenueAxisTick(revenueTrend.revenueTotal)} in ${revenueTrend.rangeLabel.toLowerCase()} view`,
      text: `${revenueTrend.paidCount} paid transaction${revenueTrend.paidCount === 1 ? '' : 's'} are included in this chart.`,
      tone: 'info',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      key: 'steady',
      icon: 'task_alt',
      title: 'Queue is clear',
      text: `${overviewMetrics?.activeOrders || 0} active orders are currently in the pharmacy workflow.`,
      tone: 'success',
    });
  }

  if (queueTotal >= 9 && !recommendations.some((r) => r.key === 'queue')) {
    recommendations.unshift({
      key: 'queue',
      icon: 'priority_high',
      title: 'Queue pressure is high',
      text: 'Shift attention to the largest workflow lane before new requests arrive.',
      tone: 'danger',
    });
  }

  return recommendations.slice(0, 4);
}
