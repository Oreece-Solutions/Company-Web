import { useEffect, useState } from 'react';
import { addDays, format, nextFriday, isFriday, parseISO, previousFriday, isWeekend } from 'date-fns';
import { RefreshCw, Save } from 'lucide-react';
import { Button, Input, Label, Textarea } from '@company-web/shared/ui';
import { useHq } from '@/contexts/HqContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SelectField } from '@/components/crm/SelectField';
import { MoneyByCurrency, WeeklyPriority, WeeklyReview } from '@/types/hq';
import { Currency } from '@/types/invoice';
import { formatMoney } from '@/lib/money';

// Reviews run Friday to Friday; at the weekend the week just finished is shown.
function currentWeekEnding(now = new Date()) {
  if (isFriday(now)) return format(now, 'yyyy-MM-dd');
  return format(isWeekend(now) ? previousFriday(now) : nextFriday(now), 'yyyy-MM-dd');
}

const money = (m?: MoneyByCurrency) => {
  const entries = Object.entries(m || {}).filter(([, v]) => Number(v) !== 0);
  return entries.length ? entries.map(([c, v]) => formatMoney(Number(v), c as Currency)).join(' + ') : '—';
};

const EMPTY: WeeklyPriority = { title: '', why: '', outcome: '', nextStep: '' };

export default function WeeklyReviewPage() {
  const { weeklyReviews, openWeeklyReview, saveWeeklyReview } = useHq();
  const [week, setWeek] = useState(currentWeekEnding());
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [form, setForm] = useState({ hoursSales: '', hoursDelivery: '', hoursAdmin: '', completed: '', blockers: '', marketing: '', notes: '' });
  const [priorities, setPriorities] = useState<WeeklyPriority[]>([EMPTY, EMPTY, EMPTY]);
  const [loading, setLoading] = useState(false);

  const load = async (weekEnding: string) => {
    setLoading(true);
    const r = await openWeeklyReview(weekEnding);
    setLoading(false);
    if (!r) return;
    setReview(r);
    setForm({
      hoursSales: r.hoursSales?.toString() ?? '',
      hoursDelivery: r.hoursDelivery?.toString() ?? '',
      hoursAdmin: r.hoursAdmin?.toString() ?? '',
      completed: r.completed ?? '',
      blockers: r.blockers ?? '',
      marketing: r.marketing ?? '',
      notes: r.notes ?? '',
    });
    setPriorities([0, 1, 2].map((i) => r.priorities[i] ?? EMPTY));
  };

  useEffect(() => {
    load(week);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week]);

  const save = () => {
    if (!review) return;
    const n = (v: string) => (v.trim() === '' ? undefined : Number(v));
    saveWeeklyReview(review.id, {
      hoursSales: n(form.hoursSales),
      hoursDelivery: n(form.hoursDelivery),
      hoursAdmin: n(form.hoursAdmin),
      completed: form.completed,
      blockers: form.blockers,
      marketing: form.marketing,
      notes: form.notes,
      priorities,
    });
  };

  const m = review?.metrics || {};
  const totalHours = ['hoursSales', 'hoursDelivery', 'hoursAdmin'].reduce((t, k) => t + (Number(form[k as keyof typeof form]) || 0), 0);
  const salesShare = totalHours ? Math.round(((Number(form.hoursSales) || 0) / totalHours) * 100) : null;
  const weekOptions = Array.from(new Set([currentWeekEnding(), ...weeklyReviews.map((r) => r.weekEnding)]))
    .sort((a, b) => b.localeCompare(a))
    .map((w) => ({ value: w, label: `Week ending ${format(parseISO(w), 'EEE d MMM yyyy')}` }));

  const field = (key: keyof typeof form, label: string, placeholder = '', rows = 3) => (
    <div>
      <Label htmlFor={`wr-${key}`}>{label}</Label>
      <Textarea id={`wr-${key}`} rows={rows} className="mt-1.5" placeholder={placeholder}
        value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <AppLayout>
      <PageHeader
        title="Weekly review"
        description="30 minutes on Friday. The numbers fill themselves; you add what only you know."
        actions={
          <>
            <Button variant="outline" className="gap-2" disabled={loading} onClick={() => load(week)}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh numbers
            </Button>
            <Button className="gap-2 bg-accent hover:bg-accent/90" disabled={!review} onClick={save}><Save className="h-4 w-4" />Save</Button>
          </>
        }
      />

      <div className="mb-6 max-w-sm">
        <SelectField id="wr-week" value={week} onChange={setWeek} options={weekOptions} />
        {review && (
          <p className="mt-2 text-xs text-muted-foreground">
            {format(parseISO(m.week_start || format(addDays(parseISO(week), -6), 'yyyy-MM-dd')), 'd MMM')} – {format(parseISO(week), 'd MMM yyyy')}
          </p>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sales</h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric label="Leads added" value={m.prospects_added} />
              <Metric label="Leads contacted" value={m.prospects_contacted} />
              <Metric label="Calls & meetings" value={m.conversations} />
              <Metric label="Quotes sent" value={m.quotes_sent} />
              <Metric label="Deals created" value={m.deals_created} />
              <Metric label="Won" value={m.deals_won} tone={m.deals_won ? "text-success" : undefined} />
              <Metric label="Lost" value={m.deals_lost} tone={m.deals_lost ? 'text-destructive' : undefined} />
              <Metric label="Follow-ups overdue" value={m.follow_ups_overdue} tone={m.follow_ups_overdue ? 'text-destructive' : undefined} />
            </dl>
            <p className="mt-4 text-sm"><span className="text-muted-foreground">Open pipeline (estimates): </span>{money(m.open_pipeline)}</p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Money</h2>
            <dl className="space-y-3 text-sm">
              <MoneyRow label="Cash received this week" value={money(m.cash_received)} strong />
              <MoneyRow label="Invoiced this week (not cash)" value={money(m.invoiced)} />
              <MoneyRow label="Outstanding at week end" value={money(m.outstanding)} />
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">From recorded invoices and payments only. Revenue is not profit; GST and tax questions go to your accountant.</p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Delivery</h2>
            <dl className="grid grid-cols-2 gap-4">
              <Metric label="Tasks done" value={m.tasks_done} />
              <Metric label="Projects at risk / blocked" value={m.projects_at_risk} tone={m.projects_at_risk ? 'text-warning' : undefined} />
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your time</h2>
            <div className="grid grid-cols-3 gap-3">
              {([['hoursSales', 'Sales'], ['hoursDelivery', 'Delivery'], ['hoursAdmin', 'Admin']] as const).map(([k, l]) => (
                <div key={k}>
                  <Label htmlFor={`wr-${k}`}>{l} (h)</Label>
                  <Input id={`wr-${k}`} type="number" step="0.5" min="0" className="mt-1.5" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                </div>
              ))}
            </div>
            {salesShare !== null && <p className="mt-3 text-sm text-muted-foreground">{salesShare}% of your hours went on sales.</p>}
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-card">
            {field('completed', 'What got done', 'Launched…, sent proposal to…')}
            {field('blockers', 'Blockers and risks', 'Waiting on…, contractor…')}
            {field('marketing', 'Marketing and what came of it', 'Posts, replies, enquiries', 2)}
            {field('notes', 'Notes', '', 2)}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top 3 priorities for next week</h2>
            <p className="mb-4 text-sm text-muted-foreground">No more than three. Each with why it matters, the outcome you expect, and the first step.</p>
            <div className="space-y-5">
              {priorities.map((p, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{i + 1}</span>
                    <Input id={`wr-p${i}-title`} aria-label={`Priority ${i + 1}`} placeholder="Priority" value={p.title}
                      onChange={(e) => setPriorities(priorities.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                  </div>
                  {p.title.trim() && (
                    <div className="grid gap-2 pl-8 sm:grid-cols-3">
                      {(['why', 'outcome', 'nextStep'] as const).map((k) => (
                        <Input key={k} id={`wr-p${i}-${k}`} aria-label={`${k} for priority ${i + 1}`}
                          placeholder={k === 'why' ? 'Why it matters' : k === 'outcome' ? 'Expected outcome' : 'First step'}
                          value={p[k] || ''}
                          onChange={(e) => setPriorities(priorities.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

function Metric({ label, value, tone }: { label: string; value?: number; tone?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-2xl font-bold tabular-nums ${tone ?? ''}`}>{value ?? '—'}</dd>
    </div>
  );
}

function MoneyRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`tabular-nums ${strong ? 'text-lg font-semibold' : ''}`}>{value}</dd>
    </div>
  );
}
