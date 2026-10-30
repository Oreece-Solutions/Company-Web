import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, differenceInCalendarDays, format, isFriday, parseISO } from 'date-fns';
import { CalendarClock, CalendarCheck, CheckCircle2, ClipboardCheck, FileSignature, FileText, FolderKanban, Megaphone, Radar, Server, ListTodo } from 'lucide-react';
import { supabase } from '@company-web/shared/data-access';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { useHq } from '@/contexts/HqContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { HealthBadge, ProspectStageBadge, TierBadge } from '@/components/hq/Badges';
import { formatMoney } from '@/lib/money';

type Kind = 'follow-up' | 'prospect' | 'task' | 'quote' | 'invoice';

interface Item {
  key: string;
  kind: Kind;
  title: string;
  context?: string;
  href: string;
  date: string;
  extra?: React.ReactNode;
}

const KIND_META: Record<Kind, { label: string; icon: typeof Radar }> = {
  'follow-up': { label: 'Follow-up', icon: CalendarClock },
  prospect: { label: 'Lead', icon: Radar },
  task: { label: 'Task', icon: ListTodo },
  quote: { label: 'Chase quote', icon: FileSignature },
  invoice: { label: 'Overdue invoice', icon: FileText },
};

const HEALTH_RANK = { blocked: 0, at_risk: 1, on_track: 2 } as const;

// Everything that needs the founder today, in one list: the screen version of
// "what's due today?". Sales first, then delivery, then money and renewals.
export default function TodayPage() {
  const { user } = useAuth();
  const { clients, invoices, projects, tasks, getClient } = useAppStore();
  const { followUps, quotes, getDeal } = useSales();
  const { prospects, systems, contractors } = useHq();
  const [socialWaiting, setSocialWaiting] = useState<number | null>(null);
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');

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
      if (f.completedAt || f.dueDate > today || (f.assignedTo && f.assignedTo !== user?.id)) continue;
      out.push({
        key: `f-${f.id}`, kind: 'follow-up', title: f.title, date: f.dueDate,
        context: [clientName(f.clientId), f.dealId ? getDeal(f.dealId)?.title : undefined].filter(Boolean).join(' · '),
        href: f.dealId ? `/deals/${f.dealId}` : `/clients/${f.clientId}`,
      });
    }
    for (const p of prospects) {
      if (!p.nextActionDate || p.nextActionDate > today || ['converted', 'disqualified'].includes(p.stage)) continue;
      out.push({
        key: `p-${p.id}`, kind: 'prospect', title: p.nextAction || `Next step for ${p.businessName}`, date: p.nextActionDate,
        context: p.businessName, href: `/leads?view=due`,
        extra: <><TierBadge tier={p.tier} /><ProspectStageBadge stage={p.stage} /></>,
      });
    }
    for (const t of tasks) {
      if (t.status === 'done' || !t.dueDate || t.dueDate > today) continue;
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
      if (chaseOn > today) continue;
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
  }, [followUps, prospects, tasks, quotes, invoices, projects, contractors, clients, today, user?.id]);

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
  const top3 = [...overdue, ...dueToday].slice(0, 3);
  const readyLeads = prospects.filter((p) => p.stage === 'ready').length;
  // Discovery calls booked by sales (the founder runs them): today and the week ahead.
  const discovery = prospects
    .filter((p) => p.stage === 'conversation_booked' && p.discoveryAt && differenceInCalendarDays(parseISO(p.discoveryAt), now) >= 0 && differenceInCalendarDays(parseISO(p.discoveryAt), now) <= 7)
    .sort((a, b) => a.discoveryAt!.localeCompare(b.discoveryAt!));

  return (
    <AppLayout>
      <PageHeader
        title={`Today · ${format(now, 'EEEE d MMMM')}`}
        description={items.length === 0 ? 'Nothing overdue. Good time to find new work.' : `${overdue.length} overdue · ${dueToday.length} due today`}
      />

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
                    <Row item={i} today={today} />
                  </li>
                ))}
              </ol>
            )}
          </section>

          {items.length > top3.length && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Also due</h2>
              <ul className="space-y-2">
                {items.slice(top3.length).filter((i) => i.date <= today).map((i) => (
                  <li key={i.key} className="rounded-lg border border-border bg-card px-4 py-3 shadow-card"><Row item={i} today={today} /></li>
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
          <SideCard icon={Megaphone} title="Social approvals" href="/social">
            {socialWaiting === null
              ? <p className="text-muted-foreground">Social OS not connected</p>
              : <p><span className="text-2xl font-bold">{socialWaiting}</span> post{socialWaiting === 1 ? '' : 's'} waiting for you</p>}
          </SideCard>
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

function Row({ item, today }: { item: Item; today: string }) {
  const meta = KIND_META[item.kind];
  const late = item.date < today;
  return (
    <Link to={item.href} className="group flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <meta.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="font-medium group-hover:underline">{item.title}</span>
      {item.extra}
      <span className="w-full pl-7 text-muted-foreground">
        {meta.label}
        {item.context ? ` · ${item.context}` : ''}
        {' · '}
        <span className={late ? 'font-medium text-destructive' : 'text-warning'}>{late ? `overdue since ${format(parseISO(item.date), 'd MMM')}` : 'today'}</span>
      </span>
    </Link>
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
