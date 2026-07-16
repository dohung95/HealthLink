import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getWalletEntryPresentation,
  toWalletTransactionEntry,
} from '../src/components/wallet/wallet-entry-view-model.js';

test('maps a pending earning to a warning incoming entry', () => {
  assert.deepEqual(
    getWalletEntryPresentation({ entryType: 'EARNING', status: 'PENDING', amount: 50 }),
    {
      direction: 'positive',
      icon: 'schedule',
      badgeTone: 'warning',
      statusLabel: 'Pending',
      amountTone: 'warning',
      strikeAmount: false,
      kind: 'earning',
    },
  );
});

test('maps a vested earning to a successful incoming entry', () => {
  assert.deepEqual(
    getWalletEntryPresentation({ entryType: 'EARNING', status: 'VESTED', amount: 50 }),
    {
      direction: 'positive',
      icon: 'check_circle',
      badgeTone: 'success',
      statusLabel: 'Vested',
      amountTone: 'success',
      strikeAmount: false,
      kind: 'earning',
    },
  );
});

test('maps a cancelled earning to a neutral non-vested entry', () => {
  assert.deepEqual(
    getWalletEntryPresentation({ entryType: 'EARNING', status: 'CANCELLED', amount: 50 }),
    {
      direction: 'positive',
      icon: 'cancel',
      badgeTone: 'neutral',
      statusLabel: 'Cancelled',
      amountTone: 'neutral',
      strikeAmount: true,
      kind: 'earning',
    },
  );
});

test('maps a processing withdrawal to a red outgoing entry', () => {
  assert.deepEqual(
    getWalletEntryPresentation({ entryType: 'WITHDRAWAL', status: 'PROCESSING', amount: -50 }),
    {
      direction: 'negative',
      icon: 'payments',
      badgeTone: 'error',
      statusLabel: 'Processing',
      amountTone: 'error',
      strikeAmount: false,
      kind: 'withdrawal',
    },
  );
});

test('maps a completed withdrawal to a neutral withdrawn entry', () => {
  assert.deepEqual(
    getWalletEntryPresentation({ entryType: 'WITHDRAWAL', status: 'COMPLETED', amount: -50 }),
    {
      direction: 'negative',
      icon: 'payments',
      badgeTone: 'neutral',
      statusLabel: 'Withdrawn',
      amountTone: 'error',
      strikeAmount: false,
      kind: 'withdrawal',
    },
  );
});

test('maps a failed withdrawal to a struck outgoing entry', () => {
  assert.deepEqual(
    getWalletEntryPresentation({ entryType: 'WITHDRAWAL', status: 'FAILED', amount: -50 }),
    {
      direction: 'negative',
      icon: 'payments',
      badgeTone: 'error',
      statusLabel: 'Failed',
      amountTone: 'error',
      strikeAmount: true,
      kind: 'withdrawal',
    },
  );
});

test('maps a returned amount to a positive returned entry', () => {
  assert.deepEqual(
    getWalletEntryPresentation({ entryType: 'RETURN', status: 'RETURNED', amount: 50 }),
    {
      direction: 'positive',
      icon: 'undo',
      badgeTone: 'success',
      statusLabel: 'Returned',
      amountTone: 'success',
      strikeAmount: false,
      kind: 'adjustment',
    },
  );
});

test('maps a patient refund to a negative refunded entry', () => {
  assert.deepEqual(
    getWalletEntryPresentation({ entryType: 'REFUND', status: 'REFUNDED', amount: -50 }),
    {
      direction: 'negative',
      icon: 'currency_exchange',
      badgeTone: 'error',
      statusLabel: 'Refunded',
      amountTone: 'error',
      strikeAmount: false,
      kind: 'adjustment',
    },
  );
});

test('normalizes a ledger entry while preserving its server identity', () => {
  assert.deepEqual(
    toWalletTransactionEntry({
      entryId: 42,
      entryType: 'WITHDRAWAL',
      status: 'PROCESSING',
      amount: -30,
      settlementNumber: 'STL-42',
      effectiveAt: '2026-07-16T12:00:00',
    }),
    {
      id: 'wallet-entry-42',
      kind: 'withdrawal',
      title: 'STL-42',
      amount: -30,
      createdAt: '2026-07-16T12:00:00',
      status: 'PROCESSING',
      presentation: {
        direction: 'negative',
        icon: 'payments',
        badgeTone: 'error',
        statusLabel: 'Processing',
        amountTone: 'error',
        strikeAmount: false,
        kind: 'withdrawal',
      },
      raw: {
        entryId: 42,
        entryType: 'WITHDRAWAL',
        status: 'PROCESSING',
        amount: -30,
        settlementNumber: 'STL-42',
        effectiveAt: '2026-07-16T12:00:00',
      },
    },
  );
});
