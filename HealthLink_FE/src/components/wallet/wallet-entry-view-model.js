const STATUS_LABELS = {
  COMPLETED: 'Withdrawn',
  FAILED: 'Failed',
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  REFUNDED: 'Refunded',
  RETURNED: 'Returned',
  VESTED: 'Vested',
};

const entryKind = (entryType) => {
  if (entryType === 'EARNING') return 'earning';
  if (entryType === 'WITHDRAWAL') return 'withdrawal';
  return 'adjustment';
};

const directionForAmount = (amount) => (Number(amount) < 0 ? 'negative' : 'positive');

export const getWalletEntryPresentation = (entry = {}) => {
  const entryType = String(entry.entryType || '').toUpperCase();
  const status = String(entry.status || '').toUpperCase();
  const kind = entryKind(entryType);
  const direction = directionForAmount(entry.amount);

  if (entryType === 'EARNING' && status === 'PENDING') {
    return {
      direction, icon: 'schedule', badgeTone: 'warning', statusLabel: 'Pending',
      amountTone: 'warning', strikeAmount: false, kind,
    };
  }

  if (entryType === 'EARNING' && status === 'VESTED') {
    return {
      direction, icon: 'check_circle', badgeTone: 'success', statusLabel: 'Vested',
      amountTone: 'success', strikeAmount: false, kind,
    };
  }

  if (entryType === 'EARNING' && status === 'CANCELLED') {
    return {
      direction, icon: 'cancel', badgeTone: 'neutral', statusLabel: 'Cancelled',
      amountTone: 'neutral', strikeAmount: true, kind,
    };
  }

  if (entryType === 'WITHDRAWAL') {
    return {
      direction,
      icon: 'payments',
      badgeTone: status === 'COMPLETED' ? 'neutral' : 'error',
      statusLabel: STATUS_LABELS[status] || 'Processing',
      amountTone: 'error',
      strikeAmount: status === 'FAILED',
      kind,
    };
  }

  if (entryType === 'RETURN') {
    return {
      direction, icon: 'undo', badgeTone: 'success', statusLabel: 'Returned',
      amountTone: 'success', strikeAmount: false, kind,
    };
  }

  return {
    direction, icon: 'currency_exchange', badgeTone: 'error', statusLabel: 'Refunded',
    amountTone: 'error', strikeAmount: false, kind,
  };
};

const titleForEntry = (entry, kind) => {
  if (kind === 'withdrawal') return entry.settlementNumber || `Withdrawal #${entry.settlementId || '-'}`;
  if (entry.entryType === 'RETURN') return 'Withdrawal returned';
  if (entry.entryType === 'REFUND') return 'Patient refund';
  if (entry.description) return entry.description;
  if (entry.pharmacyOrderId) return `Order #${entry.pharmacyOrderId}`;
  return `Consultation - Appointment #${entry.appointmentId || '-'}`;
};

export const toWalletTransactionEntry = (entry) => {
  const presentation = getWalletEntryPresentation(entry);
  return {
    id: `wallet-entry-${entry.entryId}`,
    kind: presentation.kind,
    title: titleForEntry(entry, presentation.kind),
    amount: Number(entry.amount || 0),
    createdAt: entry.effectiveAt,
    status: entry.status,
    presentation,
    raw: entry,
  };
};
