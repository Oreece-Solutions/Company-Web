import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addDays, differenceInCalendarDays, format, isFriday, parseISO } from 'date-fns';
import { AlertCircle, Briefcase, CalendarClock, CalendarCheck, CheckCircle2, ClipboardCheck, Clock, DollarSign, FileSignature, FileText, FolderKanban, Megaphone, Plus, Radar, Server, ListTodo, TrendingUp } from 'lucide-react';
import { Button, Checkbox } from '@company-web/shared/ui';
import { StatCard } from '@/components/dashboard/StatCard';
import { hasAccess } from '@/lib/access';
import { OPEN_DEAL_STAGES } from '@/types/crm';
import { supabase } from '@company-web/shared/data-access';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { useHq } from '@/contexts/HqContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { HealthBadge, ProspectStageBadge, TierBadge } from '@/components/hq/Badges';
import { formatMoney, formatTotals, sumByCurrency } from '@/lib/money';

type Kind = 'follow-up' | 'prospect' | 'task' | 'quote' | 'invoice';

interface Item {
  key: string;
  kind: Kind;
  title: string;
  context?: string;
  href: string;
  date: string;
  extra?: React.ReactNode;
  // Follow-ups can be ticked off right here.
  followUpId?: string;
}

const KIND_META: Record<Kind, { label: string; icon: typeof Radar }> = {
  'follow-up': { label: 'Follow-up', icon: CalendarClock },
  prospect: { label: 'Lead', icon: Radar },
  task: { label: 'Task', icon: ListTodo },
  quote: { label: 'Chase quote', icon: FileSignature },
  invoice: { label: 'Overdue invoice', icon: FileText },
};

const HEALTH_RANK = { blocked: 0, at_risk: 1, on_track: 2 } as const;

// My work: everything that needs doing, in one list (follow-ups, lead next
// actions, project tasks, quotes to chase, overdue invoices), plus the
// business numbers for the founder. This replaced the separate Dashboard and
// Follow-ups screens.
export default function TodayPage() {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const { clients, invoices, projects, tasks, getClient, company } = useAppStore();
  const { followUps, quotes, deals, getDeal, setFollowUpDone } = useSales();
  const { prospects, systems, contractors } = useHq();
  const [socialWaiting, setSocialWaiting] = useState<number | null>(null);
  const [mineOnly, setMineOnly] = useState(true);
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const horizon = format(addDays(now, 7), 'yyyy-MM-dd');
  const isAdmin = hasAccess(roles, 'admin');
  const seesMoney = isAdmin || !!roles?.includes('accountant');
  const canSell = hasAccess(roles, 'sell');
  const canBill = hasAccess(roles, 'bill');
  const fallback = company.defaultCurrency || 'NZD';
  const mine = (owner?: string) => !mineOnly || !owner || owner === user?.id;

  useEffect(() => {
    // Social OS queue lives in another schema; quietly skip if unavailable.
    supabase.rpc('social_queue').then(({ data, error }) => {
      if (!error && data) setSocialWaiting(data.filter((r) => r.status === 'NEEDS_APPROVAL').length);
    });
  }, []);

  const clientName = (id?: string) => {
    const c = id ? getClient(id) : undefined;
    return c?.companyName || c?.name;
  };

  const items = useMemo(() => {
    const out: Item[] = [];
    for (const f of followUps) {
      if (f.completedAt || f.dueDate > horizon || !mine(f.assignedTo)) continue;
      out.push({
        key: `f-${f.id}`, kind: 'follow-up', title: f.title, date: f.dueDate, followUpId: f.id,
        context: [clientName(f.clientId), f.dealId ? getDeal(f.dealId)?.title : undefined].filter(Boolean).join(' · '),
        href: f.dealId ? `/deals/${f.dealId}` : `/clients/${f.clientId}`,
      });
    }
    for (const p of prospects) {
      if (!p.nextActionDate || p.nextActionDate > horizon || ['converted', 'disqualified'].includes(p.stage) || !mine(p.assignedTo)) continue;
      out.push({
        key: `p-${p.id}`, kind: 'prospect', title: p.nextAction || `Next step for ${p.businessName}`, date: p.nextActionDate,
        context: p.businessName, href: `/leads?view=all&open=${p.id}`,
        extra: <><TierBadge tier={p.tier} /><ProspectStageBadge stage={p.stage} /></>,
      });
    }
    for (const t of tasks) {
      if (t.status === 'done' || !t.dueDate || t.dueDate > horizon) continue;
      const project = projects.find((p) => p.id === t.projectId);
      const contractor = contractors.find((c) => c.id === t.contractorId);
      out.push({
        key: `t-${t.id}`, kind: 'task', title: t.title, date: t.dueDate,
        context: [project?.name, contractor ? `with ${contractor.name}` : undefined].filter(Boolean).join(' · '),
        href: `/projects/${t.projectId}`,
      });
    }
    for (const q of quotes) {
      if (q.status !== 'sent' || !q.sentAt) continue;
      const chaseOn = format(addDays(parseISO(q.sentAt), 5), 'yyyy-MM-dd');
      if (chaseOn > horizon) continue;
      out.push({
        key: `q-${q.id}`, kind: 'quote', title: `${q.quoteNumber} · ${q.title || 'Quote'}`, date: chaseOn,
        context: `${clientName(q.clientId) ?? ''} · ${formatMoney(q.total, q.currency)} · sent ${format(parseISO(q.sentAt), 'd MMM')}`,
        href: `/quotes/${q.id}`,
      });
    }
    for (const inv of invoices) {
      if (inv.status === 'paid' || !inv.dueDate || inv.dueDate >= today) continue;
      out.push({
        key: `i-${inv.id}`, kind: 'invoice', title: `${inv.invoiceNumber} is overdue`, date: inv.dueDate,
        context: `${clientName(inv.clientId) ?? ''} · ${formatMoney(inv.total - (inv.amountReceived || 0), inv.currency)} outstanding`,
        href: `/invoices/${inv.id}`,
      });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followUps, prospects, tasks, quotes, invoices, projects, contractors, clients, today, user?.id, mineOnly]);

  // The founder's numbers (formerly the Dashboard). Totals stay per currency.
  const numbers = useMemo(() => {
    const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
    const monthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
    const unpaid = invoices.filter((inv) => inv.status !== 'paid');
    const open = deals.filter((d) => OPEN_DEAL_STAGES.includes(d.stage));
    return {
      // Money actually received this month, from recorded payments (part-payments count).
      received: sumByCurrency(
        invoices.flatMap((inv) => (inv.payments ?? []).filter((pay) => pay.paymentDate >= monthStart).map((pay) => ({ amount: pay.amount, currency: inv.currency }))),
        (r) => r.amount, (r) => r.currency),
      outstanding: sumByCurrency(unpaid, (inv) => inv.total - (inv.amountReceived || 0), (inv) => inv.currency),
      overdueCount: unpaid.filter((inv) => inv.dueDate && inv.dueDate < today).length,
      unpaidCount: unpaid.length,
      pipeline: sumByCurrency(open, (d) => d.value, (d) => d.currency),
      weighted: sumByCurrency(open, (d) => (d.value * d.probability) / 100, (d) => d.currency),
      openCount: open.length,
      closingSoon: open
        .filter((d) => d.expectedCloseDate && d.expectedCloseDate <= monthEnd)
        .sort((a, b) => (a.expectedCloseDate || '').localeCompare(b.expectedCloseDate || ''))
        .slice(0, 5),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, deals, today]);
  const needsSetup = isAdmin && (!company.name || !company.email);

  const delivery = useMemo(() => projects
    .filter((p) => p.status !== 'completed' && (p.health !== 'on_track' || p.waitingOnClient || (p.dueDate && differenceInCalendarDays(parseISO(p.dueDate), now) <= 7)))
    .sort((a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || (a.dueDate || '9999').localeCompare(b.dueDate || '9999')),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [projects, today]);

  const renewals = useMemo(() => systems
    .filter((s) => s.status !== 'retired' && s.renewsOn && differenceInCalendarDays(parseISO(s.renewsOn), now) <= 30)
    .sort((a, b) => (a.renewsOn || '').localeCompare(b.renewsOn || '')),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [systems, today]);

  const overdue = items.filter((i) => i.date < today);
  const dueToday = items.filter((i) => i.date === today);
  const upcoming = items.filter((i) => i.date > today);
  const top3 = [...overdue, ...dueToday].slice(0, 3);
  const readyLeads = prospects.filter((p) => p.stage === 'ready').length;
  // Discovery calls booked by sales (the founder runs them): today and the week ahead.
  const discovery = prospects
    .filter((p) => p.stage === 'conversation_booked' && p.discoveryAt && differenceInCalendarDays(parseISO(p.discoveryAt), now) >= 0 && differenceInCalendarDays(parseISO(p.discoveryAt), now) <= 7)
    .sort((a, b) => a.discoveryAt!.localeCompare(b.discoveryAt!));

  return (
    <AppLayout>
      <PageHeader
        title={`My work · ${format(now, 'EEEE d MMMM')}`}
        description={overdue.length + dueToday.length === 0 ? 'Nothing overdue. Good time to find new work.' : `${overdue.length} overdue · ${dueToday.length} due today`}
        actions={
          <div className="flex flex-wrap gap-2">
            {canSell && <Button variant="outline" className="gap-2" onClick={() => navigate('/leads?new=1')}><Plus className="h-4 w-4" />Lead</Button>}
            {canSell && <Button variant="outline" className="gap-2" onClick={() => navigate('/pipeline?new=1')}><Plus className="h-4 w-4" />Deal</Button>}
            {canBill && <Button className="gap-2 bg-accent hover:bg-accent/90" onClick={() => navigate('/invoices/new')}><Plus className="h-4 w-4" />Invoice</Button>}
          </div>
        }
      />

      {needsSetup && (
        <Link to="/settings" className="mb-6 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm hover:bg-warning/15">
          <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
          <span><span className="font-medium">Complete your company profile.</span> Your name and email appear on quotes and invoices.</span>
        </Link>
      )}

      {(seesMoney || isAdmin) && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {seesMoney && <Link to="/invoices"><StatCard title="Received this month" value={<span className="text-2xl">{formatTotals(numbers.received, fallback)}</span>} icon={<DollarSign className="h-6 w-6" />} description="Payments recorded" /></Link>}
          {seesMoney && <Link to="/invoices"><StatCard title="Outstanding" value={<span className="text-2xl">{formatTotals(numbers.outstanding, fallback)}</span>} icon={<Clock className="h-6 w-6" />} description={`${numbers.unpaidCount} unpaid · ${numbers.overdueCount} overdue`} /></Link>}
          {isAdmin && <Link to="/pipeline"><StatCard title="Open pipeline" value={<span className="text-2xl">{formatTotals(numbers.pipeline, fallback)}</span>} icon={<Briefcase className="h-6 w-6" />} description={`${numbers.openCount} open deals`} /></Link>}
          {isAdmin && <Link to="/pipeline"><StatCard title="Weighted forecast" value={<span className="text-2xl">{formatTotals(numbers.weighted, fallback)}</span>} icon={<TrendingUp className="h-6 w-6" />} description="Value × win chance" /></Link>}
        </div>
      )}

      <div className="mb-4 flex gap-2" role="group" aria-label="Whose work">
        {[{ v: true, l: 'Mine' }, { v: false, l: 'Everyone' }].map((o) => (
          <button
            key={o.l}
            onClick={() => setMineOnly(o.v)}
            aria-pressed={mineOnly === o.v}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${mineOnly === o.v ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >
            {o.l}
          </button>
        ))}
      </div>

      {isFriday(now) && (
        <Link to="/review" className="mb-6 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm hover:bg-accent/10">
          <ClipboardCheck className="h-5 w-5 text-accent" />
          <span><span className="font-medium">It's Friday.</span> Do the weekly review: 30 minutes, three priorities for next week.</span>
        </Link>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Do these first</h2>
            {top3.length === 0 ? (
              <div className="flex items-center gap-3 py-4 text-sm">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span>
                  All caught up.{' '}
                  {readyLeads > 0
                    ? <Link to="/leads" className="text-accent hover:underline">{readyLeads} leads are ready to contact.</Link>
                    : <Link to="/leads" className="text-accent hover:underline">Research a few new leads.</Link>}
                </span>
              </div>
            ) : (
              <ol className="mt-3 space-y-2">
                {top3.map((i, n) => (
                  <li key={i.key} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{n + 1}</span>
                    <Row item={i} today={today} onDone={setFollowUpDone} />
                  </li>
                ))}
              </ol>
            )}
          </section>

          {overdue.length + dueToday.length > top3.length && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Also due</h2>
              <ul className="space-y-2">
                {[...overdue, ...dueToday].slice(top3.length).map((i) => (
                  <li key={i.key} className="rounded-lg border border-border bg-card px-4 py-3 shadow-card"><Row item={i} today={today} onDone={setFollowUpDone} /></li>
                ))}
              </ul>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Coming up (7 days)</h2>
              <ul className="space-y-2">
                {upcoming.map((i) => (
                  <li key={i.key} className="rounded-lg border border-border bg-card px-4 py-3 shadow-card"><Row item={i} today={today} onDone={setFollowUpDone} /></li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Delivery to watch</h2>
              <Link to="/projects" className="text-sm text-accent hover:underline">All projects</Link>
            </div>
            {delivery.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No projects at risk, blocked or due this week.</p>
            ) : (
              <ul className="space-y-2">
                {delivery.map((p) => (
                  <li key={p.id}>
                    <Link to={`/projects/${p.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-card hover:bg-muted/40">
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{p.name}</span>
                      <HealthBadge health={p.health} />
                      {p.dueDate && <span className="text-muted-foreground">due {format(parseISO(p.dueDate), 'EEE d MMM')}</span>}
                      {p.waitingOnClient && <span className="w-full text-muted-foreground">Waiting on client: {p.waitingOnClient}</span>}
                      {p.nextMilestone && <span className="w-full text-muted-foreground">Next: {p.nextMilestone}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          {isAdmin && (
            <SideCard icon={Briefcase} title="Closing this month" href="/pipeline">
              {numbers.closingSoon.length === 0 ? <p className="text-muted-foreground">No open deals due to close</p> : (
                <ul className="space-y-1">
                  {numbers.closingSoon.map((d) => (
                    <li key={d.id} className="flex justify-between gap-2">
                      <span className="truncate">{d.title}</span>
                      <span className={(d.expectedCloseDate || '') < today ? 'font-medium text-destructive' : 'text-muted-foreground'}>{formatMoney(d.value, d.currency, { compact: true })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SideCard>
          )}
          <SideCard icon={CalendarCheck} title="Discovery calls (7 days)" href="/sales">
            {discovery.length === 0 ? <p className="text-muted-foreground">None booked</p> : (
              <ul className="space-y-1">
                {discovery.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span className="truncate">{p.businessName}</span>
                    <span className={differenceInCalendarDays(parseISO(p.discoveryAt!), now) === 0 ? 'font-medium text-warning' : 'text-muted-foreground'}>{format(parseISO(p.discoveryAt!), 'EEE d MMM, h:mm a')}</span>
                  </li>
                ))}
              </ul>
            )}
          </SideCard>
          <SideCard icon={Radar} title="Lead Finder" href="/leads">
            <p><span className="text-2xl font-bold">{readyLeads}</span> ready to contact</p>
            <p className="text-muted-foreground">{prospects.filter((p) => p.stage === 'researching').length} still being researched</p>
          </SideCard>
          {/* Social stays out of the menu until Social OS is publishing; this card appears when posts are waiting. */}
          {!!socialWaiting && (
            <SideCard icon={Megaphone} title="Social approvals" href="/social">
              <p><span className="text-2xl font-bold">{socialWaiting}</span> post{socialWaiting === 1 ? '' : 's'} waiting for you</p>
            </SideCard>
          )}
          <SideCard icon={Server} title="Renewals (30 days)" href="/systems">
            {renewals.length === 0 ? <p className="text-muted-foreground">None coming up</p> : (
              <ul className="space-y-1">
                {renewals.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span className="truncate">{s.name}</span>
                    <span className={s.renewsOn! < today ? 'text-destructive' : 'text-muted-foreground'}>{format(parseISO(s.renewsOn!), 'd MMM')}</span>
                  </li>
                ))}
              </ul>
            )}
          </SideCard>
        </aside>
      </div>
    </AppLayout>
  );
}

function Row({ item, today, onDone }: { item: Item; today: string; onDone: (id: string, done: boolean) => void }) {
  const meta = KIND_META[item.kind];
  const late = item.date < today;
  const when = late ? `overdue since ${format(parseISO(item.date), 'd MMM')}` : item.date === today ? 'today' : format(parseISO(item.date), 'EEE d MMM');
  return (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      {item.followUpId && (
        <Checkbox className="mt-0.5" aria-label={`Mark "${item.title}" done`} onCheckedChange={(v) => v === true && onDone(item.followUpId!, true)} />
      )}
    <Link to={item.href} className="group flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <meta.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="font-medium group-hover:underline">{item.title}</span>
      {item.extra}
      <span className="w-full pl-7 text-muted-foreground">
        {meta.label}
        {item.context ? ` · ${item.context}` : ''}
        {' · '}
        <span className={late ? 'font-medium text-destructive' : item.date === today ? 'text-warning' : ''}>{when}</span>
      </span>
    </Link>
    </div>
  );
}

function SideCard({ icon: Icon, title, href, children }: { icon: typeof Radar; title: string; href: string; children: React.ReactNode }) {
  return (
    <Link to={href} className="block rounded-xl border border-border bg-card p-4 text-sm shadow-card hover:bg-muted/40">
      <div className="mb-2 flex items-center gap-2 font-medium"><Icon className="h-4 w-4 text-accent" />{title}</div>
      {children}
    </Link>
  );
}
