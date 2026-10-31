import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, Clock, Landmark, Repeat, Scale } from 'lucide-react';
import { Input, Label } from '@company-web/shared/ui';
import { useAppStore } from '@/contexts/StoreContext';
import { useMoney } from '@/contexts/MoneyContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { formatMoney, formatTotals, sumByCurrency } from '@/lib/money';
import { Currency } from '@/types/invoice';
import { EXPENSE_CATEGORY_LABELS, ExpenseCategory, GstSummary, INTERVAL_MONTHS } from '@/types/money';

type Period = 'this_month' | 'last_month' | 'last_2_months' | 'financial_year' | 'custom';
const PERIODS: { value: Period; label: string }[] = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_2_months', label: 'Last 2 months (GST)' },
  { value: 'financial_year', label: 'Financial year' },
  { value: 'custom', label: 'Custom' },
];

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

function rangeFor(p: Period, now = new Date()): [string, string] {
  switch (p) {
    case 'this_month': return [ymd(startOfMonth(now)), ymd(endOfMonth(now))];
    case 'last_month': return [ymd(startOfMonth(subMonths(now, 1))), ymd(endOfMonth(subMonths(now, 1)))];
    case 'last_2_months': return [ymd(startOfMonth(subMonths(now, 2))), ymd(endOfMonth(subMonths(now, 1)))];
    // NZ financial year: 1 April to 31 March.
    case 'financial_year': {
      const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return [`${y}-04-01`, `${y + 1}-03-31`];
    }
    default: return [ymd(startOfMonth(now)), ymd(endOfMonth(now))];
  }
}

// Money in, money out, profit, recurring revenue and GST for any period.
export default function MoneyPage() {
  const { invoices, getClient, company } = useAppStore();
  const { retainers, expenses, gstSummary } = useMoney();
  const [period, setPeriod] = useState<Period>('this_month');
  const [custom, setCustom] = useState<[string, string]>(rangeFor('this_month'));
  const [from, to] = period === 'custom' ? custom : rangeFor(period);
  const [gst, setGst] = useState<GstSummary | null>(null);
  const fallback = (company.defaultCurrency || 'NZD') as Currency;

  useEffect(() => {
    let cancelled = false;
    gstSummary(from, to).then((s) => { if (!cancelled) setGst(s); });
    return () => { cancelled = true; };
  }, [from, to, gstSummary]);

  const m = useMemo(() => {
    const payments = invoices.flatMap((inv) => (inv.payments ?? [])
      .filter((p) => p.paymentDate >= from && p.paymentDate <= to)
      .map((p) => ({ amount: p.amount, currency: inv.currency, clientId: inv.clientId })));
    const spent = expenses.filter((e) => e.spentOn >= from && e.spentOn <= to);
    const received = sumByCurrency(payments, (p) => p.amount, (p) => p.currency);
    const costs = sumByCurrency(spent, (e) => e.amount, (e) => e.currency);
    const currencies = Array.from(new Set([...received, ...costs].map((t) => t.currency)));
    const profit = currencies.map((c) => ({
      currency: c,
      total: (received.find((t) => t.currency === c)?.total ?? 0) - (costs.find((t) => t.currency === c)?.total ?? 0),
    }));
    const byCategory = Object.entries(spent.reduce<Record<string, Record<string, number>>>((acc, e) => {
      acc[e.category] = acc[e.category] || {};
      acc[e.category][e.currency] = (acc[e.category][e.currency] || 0) + e.amount;
      return acc;
    }, {})).map(([cat, totals]) => ({ cat: cat as ExpenseCategory, totals: Object.entries(totals).map(([currency, total]) => ({ currency: currency as Currency, total })) }));
    const byClient = Object.entries(payments.reduce<Record<string, Record<string, number>>>((acc, p) => {
      const k = p.clientId || 'none';
      acc[k] = acc[k] || {};
      acc[k][p.currency] = (acc[k][p.currency] || 0) + p.amount;
      return acc;
    }, {})).map(([clientId, totals]) => ({ clientId, totals: Object.entries(totals).map(([currency, total]) => ({ currency: currency as Currency, total })) }))
      .sort((a, b) => b.totals[0].total - a.totals[0].total).slice(0, 10);
    const active = retainers.filter((r) => r.status === 'active');
    const unpaid = invoices.filter((inv) => inv.status !== 'paid');
    return {
      received, costs, profit, byCategory, byClient,
      mrr: sumByCurrency(active, (r) => r.amount / INTERVAL_MONTHS[r.interval], (r) => r.currency),
      outstanding: sumByCurrency(unpaid, (inv) => inv.total - (inv.amountReceived || 0), (inv) => inv.currency),
      unpaidCount: unpaid.length,
    };
  }, [invoices, expenses, retainers, from, to]);

  return (
    <AppLayout>
      <PageHeader title="Money" description="Money in, money out, profit and GST" />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <button key={p.value} onClick={() => setPeriod(p.value)} aria-pressed={period === p.value}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${period === p.value ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' ? (
          <div className="flex items-end gap-2">
            <div><Label htmlFor="mn-from" className="text-xs">From</Label><Input id="mn-from" type="date" value={custom[0]} onChange={(e) => setCustom([e.target.value, custom[1]])} /></div>
            <div><Label htmlFor="mn-to" className="text-xs">To</Label><Input id="mn-to" type="date" value={custom[1]} onChange={(e) => setCustom([custom[0], e.target.value])} /></div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{format(new Date(`${from}T00:00:00`), 'd MMM yyyy')} – {format(new Date(`${to}T00:00:00`), 'd MMM yyyy')}</p>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Link to="/invoices"><StatCard title="Received" value={<span className="text-2xl">{formatTotals(m.received, fallback)}</span>} icon={<ArrowDownCircle className="h-6 w-6" />} description="Payments recorded" /></Link>
        <Link to="/expenses"><StatCard title="Spent" value={<span className="text-2xl">{formatTotals(m.costs, fallback)}</span>} icon={<ArrowUpCircle className="h-6 w-6" />} description="Expenses recorded" /></Link>
        <StatCard title="Profit (cash)" value={<span className="text-2xl">{formatTotals(m.profit, fallback)}</span>} icon={<Scale className="h-6 w-6" />} description="Received minus spent" />
        <Link to="/retainers"><StatCard title="Monthly recurring" value={<span className="text-2xl">{formatTotals(m.mrr, fallback)}</span>} icon={<Repeat className="h-6 w-6" />} description="Active retainers" /></Link>
        <Link to="/invoices"><StatCard title="Outstanding now" value={<span className="text-2xl">{formatTotals(m.outstanding, fallback)}</span>} icon={<Clock className="h-6 w-6" />} description={`${m.unpaidCount} unpaid invoices`} /></Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5 shadow-card lg:col-span-2">
          <h2 className="mb-1 flex items-center gap-2 font-semibold"><Landmark className="h-4 w-4 text-accent" />GST for this period</h2>
          {!gst ? <p className="text-sm text-muted-foreground">Working it out…</p> : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {gst.registered
                  ? `${gst.rate}% GST, ${gst.basis === 'payments' ? 'payments basis (when money moves)' : 'invoice basis (when invoiced or billed)'}. Change this in Settings.`
                  : "You're not marked as GST-registered, so this is a what-if. You must register once turnover passes $60,000 in 12 months. Turn it on in Settings."}
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">GST on sales</p>
                  <p className="mt-1 font-mono text-xl font-semibold">{formatMoney(gst.gst_on_sales, 'NZD')}</p>
                  <p className="text-xs text-muted-foreground">from {formatMoney(gst.sales_incl, 'NZD')} NZD sales</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">GST on purchases</p>
                  <p className="mt-1 font-mono text-xl font-semibold">{formatMoney(gst.gst_on_purchases, 'NZD')}</p>
                  <p className="text-xs text-muted-foreground">from {formatMoney(gst.purchases_incl, 'NZD')} claimable costs</p>
                </div>
                <div className="rounded-lg border-2 border-accent/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{gst.gst_to_pay >= 0 ? 'GST to pay' : 'GST refund'}</p>
                  <p className="mt-1 font-mono text-xl font-semibold">{formatMoney(Math.abs(gst.gst_to_pay), 'NZD')}</p>
                  <p className="text-xs text-muted-foreground">Estimate to prepare your return</p>
                </div>
              </div>
              {gst.zero_rated_sales > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">Sales in other currencies ({formatMoney(gst.zero_rated_sales, 'NZD')} at face value) are treated as exported services (zero-rated). Check each one with your accountant.</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">An estimate from what's recorded in HQ. Your GST return to IRD (or your accountant's figures) is the record.</p>
            </>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 font-semibold">Where money came from</h2>
          {m.byClient.length === 0 ? <p className="text-sm text-muted-foreground">No payments recorded in this period.</p> : (
            <ul className="divide-y divide-border text-sm">
              {m.byClient.map((r) => {
                const c = getClient(r.clientId);
                return (
                  <li key={r.clientId} className="flex justify-between gap-3 py-2">
                    {c ? <Link to={`/clients/${r.clientId}`} className="truncate hover:underline">{c.companyName || c.name}</Link> : <span className="truncate text-muted-foreground">No client</span>}
                    <span className="font-mono">{formatTotals(r.totals, fallback)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 font-semibold">Where money went</h2>
          {m.byCategory.length === 0 ? <p className="text-sm text-muted-foreground">No expenses recorded in this period. <Link to="/expenses" className="text-accent hover:underline">Add expenses</Link></p> : (
            <ul className="divide-y divide-border text-sm">
              {m.byCategory.map((r) => (
                <li key={r.cat} className="flex justify-between gap-3 py-2">
                  <span>{EXPENSE_CATEGORY_LABELS[r.cat]}</span>
                  <span className="font-mono">{formatTotals(r.totals, fallback)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
