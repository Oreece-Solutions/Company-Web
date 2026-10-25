import { Currency, CURRENCY_SYMBOLS } from '@/types/invoice';

export function formatMoney(amount: number, currency: Currency, options: { compact?: boolean } = {}) {
  const formatted = new Intl.NumberFormat('en-US', options.compact
    ? { notation: 'compact', maximumFractionDigits: 1 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  ).format(amount);
  return `${CURRENCY_SYMBOLS[currency] ?? `${currency} `}${formatted}`;
}

// Amounts in different currencies are never added together: totals are kept
// per currency, largest first.
export function sumByCurrency<T>(rows: T[], amount: (row: T) => number, currency: (row: T) => Currency) {
  const totals = new Map<Currency, number>();
  for (const row of rows) {
    totals.set(currency(row), (totals.get(currency(row)) || 0) + amount(row));
  }
  return [...totals.entries()]
    .map(([cur, total]) => ({ currency: cur, total }))
    .sort((a, b) => b.total - a.total);
}

// "Rs.1.2M + NZ$40K" style summary for stat cards.
export function formatTotals(totals: { currency: Currency; total: number }[], fallback: Currency) {
  if (totals.length === 0) return formatMoney(0, fallback, { compact: true });
  return totals.map((t) => formatMoney(t.total, t.currency, { compact: true })).join(' + ');
}
