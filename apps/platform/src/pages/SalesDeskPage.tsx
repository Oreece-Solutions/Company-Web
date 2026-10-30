import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { CalendarPlus, CheckCircle2, ClipboardList, Lightbulb, PhoneOutgoing, Radar, Repeat, Search } from 'lucide-react';
import { Button, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger } from '@company-web/shared/ui';
import { supabase } from '@company-web/shared/data-access';
import { useAuth } from '@/contexts/AuthContext';
import { useHq } from '@/contexts/HqContext';
import { useSalesDept } from '@/contexts/SalesDeptContext';
import { targetFor } from '@/hooks/useSalesDeptStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SelectField } from '@/components/crm/SelectField';
import { ProspectStageBadge, TierBadge } from '@/components/hq/Badges';
import { LogContactDialog } from '@/components/sales/LogContactDialog';
import { BookDiscoveryDialog } from '@/components/sales/BookDiscoveryDialog';
import { TargetBar } from '@/components/sales/TargetBar';
import { activityDay, pct, scaledTarget, weekRange } from '@/lib/salesWeek';
import { Prospect, ProspectStage } from '@/types/hq';
import { ScoreRow, TARGET_LABELS, TARGET_METRICS, TargetMetric } from '@/types/sales';

const CLOSED: ProspectStage[] = ['converted', 'disqualified'];

// The rep's working day (Desk) and the founder's view of the team (Scoreboard).
export default function SalesDeskPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'scoreboard' ? 'scoreboard' : 'desk';
  return (
    <AppLayout>
      <PageHeader title="Sales desk" description="Research → contact → follow up → book discovery calls. Finish every day with a next action on every prospect." />
      <Tabs value={tab} onValueChange={(v) => setParams(v === 'desk' ? {} : { tab: v })}>
        <TabsList className="mb-6">
          <TabsTrigger value="desk">My day</TabsTrigger>
          <TabsTrigger value="scoreboard">Scoreboard</TabsTrigger>
        </TabsList>
        <TabsContent value="desk"><Desk /></TabsContent>
        <TabsContent value="scoreboard"><Scoreboard /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function Desk() {
  const { user } = useAuth();
  const { prospects } = useHq();
  const { recentActivities, targets, team, isAdmin } = useSalesDept();
  const [viewAs, setViewAs] = useState('');
  const [logging, setLogging] = useState<{ prospect: Prospect; kind: 'contact' | 'conversation' } | null>(null);
  const [booking, setBooking] = useState<Prospect | null>(null);
  const who = viewAs || user?.id;
  const today = format(new Date(), 'yyyy-MM-dd');
  const week = weekRange();

  const mine = useMemo(() => prospects.filter((p) => p.assignedTo === who && !CLOSED.includes(p.stage)), [prospects, who]);
  const acts = useMemo(() => recentActivities.filter((a) => a.userId === who), [recentActivities, who]);
  const count = (metric: TargetMetric, from: string, to: string) =>
    acts.filter((a) => a.kind === metric && activityDay(a.occurredAt) >= from && activityDay(a.occurredAt) <= to).length;

  const live = (p: Prospect | null) => (p ? prospects.find((x) => x.id === p.id) || p : null);
  const byDate = (a: Prospect, b: Prospect) => (a.nextActionDate || '9999').localeCompare(b.nextActionDate || '9999');

  const toFinish = mine.filter((p) => p.stage === 'researching');
  const toContact = mine.filter((p) => p.stage === 'ready').sort((a, b) => (a.tier || 'Z').localeCompare(b.tier || 'Z'));
  const due = mine.filter((p) => !['researching', 'ready', 'conversation_booked'].includes(p.stage) && p.nextActionDate && p.nextActionDate <= today).sort(byDate);
  // Spoke to them and no call booked yet.
  const spokeIds = new Set(acts.filter((a) => a.kind === 'conversation').map((a) => a.prospectId));
  const toBook = mine.filter((p) => spokeIds.has(p.id) && p.stage !== 'conversation_booked');
  const booked = prospects.filter((p) => p.discoveryAt && p.stage === 'conversation_booked' && p.assignedTo === who)
    .sort((a, b) => a.discoveryAt!.localeCompare(b.discoveryAt!));
  const noNext = mine.filter((p) => p.stage !== 'researching' && (!p.nextAction || !p.nextActionDate));

  const name = viewAs ? team.find((m) => m.userId === viewAs)?.fullName || 'Team member' : 'You';

  return (
    <div className="space-y-6">
      {isAdmin && team.length > 1 && (
        <div className="max-w-xs">
          <Label htmlFor="desk-view-as">Show the day for</Label>
          <SelectField id="desk-view-as" className="mt-1.5" value={viewAs} onChange={setViewAs} noneLabel="Me"
            options={team.filter((m) => m.userId !== user?.id).map((m) => ({ value: m.userId, label: m.fullName || 'Team member' }))} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Step n={1} icon={Search} title="Research businesses" done={count('researched', today, today)} doneLabel="researched today"
            hint="Find suitable Auckland cleaning companies. Review their website and Google presence."
            action={<Button size="sm" variant="outline" asChild><Link to="/leads?new=1">Add prospect</Link></Button>} />

          <Step n={2} icon={Lightbulb} title="Identify opportunities" done={count('qualified', today, today)} doneLabel="qualified today"
            hint="Record a specific problem you saw, and the evidence. Then set the stage to Ready to contact (or disqualify with a reason).">
            <ProspectList items={toFinish} empty="Nothing waiting for research." />
          </Step>

          <Step n={3} icon={PhoneOutgoing} title="Contact prospects" done={count('first_contact', today, today)} doneLabel="first contacts today"
            hint="Use an approved template, personalised with what you saw."
            action={<Button size="sm" variant="ghost" asChild><Link to="/playbook?tab=templates">Templates</Link></Button>}>
            <ProspectList items={toContact} empty="No prospects ready to contact. Research some first."
              button={(p) => <Button size="sm" variant="outline" onClick={() => setLogging({ prospect: p, kind: 'contact' })}>Log contact</Button>} />
          </Step>

          <Step n={4} icon={Repeat} title="Follow up" done={count('follow_up', today, today)} doneLabel="follow-ups today"
            hint="Record every conversation, response and objection, and set the next action.">
            <ProspectList items={due} empty="No follow-ups due." showNext today={today}
              button={(p) => (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setLogging({ prospect: p, kind: 'contact' })}>Follow-up</Button>
                  <Button size="sm" variant="ghost" onClick={() => setLogging({ prospect: p, kind: 'conversation' })}>Spoke</Button>
                </div>
              )} />
          </Step>

          <Step n={5} icon={CalendarPlus} title="Book discovery calls" done={count('meeting_booked', today, today)} doneLabel="booked today"
            hint="Interested and qualified? Book a call with the founder.">
            <ProspectList items={toBook} empty="Nobody waiting for a call to be booked."
              button={(p) => <Button size="sm" className="bg-accent hover:bg-accent/90" onClick={() => setBooking(p)}>Book call</Button>} />
          </Step>

          <Step n={6} icon={ClipboardList} title="Update HQ" done={noNext.length === 0 ? 'ok' : undefined}
            hint="Every prospect has a clear stage and a next action with a date before you finish.">
            {noNext.length === 0
              ? <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" />Every open prospect has a next action.</p>
              : <ProspectList items={noNext} empty="" button={(p) => <Button size="sm" variant="outline" onClick={() => setLogging({ prospect: p, kind: 'contact' })}>Set next action</Button>} />}
          </Step>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">This week · {name}</h2>
            <p className="mb-4 text-xs text-muted-foreground">{format(parseISO(week.from), 'EEE d MMM')} – {format(parseISO(week.to), 'EEE d MMM')} · trial targets</p>
            <div className="space-y-4">
              {TARGET_METRICS.map((m) => {
                const t = targetFor(targets, m, who);
                return <TargetBar key={m} label={TARGET_LABELS[m]} actual={count(m, week.from, week.to)} min={t?.weeklyMin} max={t?.weeklyMax} />;
              })}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 text-sm shadow-card">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Discovery calls booked</h2>
            {booked.length === 0 ? <p className="text-muted-foreground">None yet.</p> : (
              <ul className="space-y-2">
                {booked.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span className="truncate">{p.businessName}</span>
                    <span className={p.discoveryAt! < new Date().toISOString() ? 'text-muted-foreground line-through' : ''}>{format(parseISO(p.discoveryAt!), 'EEE d MMM, h:mm a')}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Link to="/playbook" className="block rounded-xl border border-border bg-card p-4 text-sm shadow-card hover:bg-muted/40">
            <p className="font-medium">Playbook</p>
            <p className="text-muted-foreground">Target market, offer, contact rules and approved templates.</p>
          </Link>
        </aside>
      </div>

      <LogContactDialog prospect={logging ? live(logging.prospect) : null} initialKind={logging?.kind} onOpenChange={(o) => !o && setLogging(null)} />
      <BookDiscoveryDialog prospect={live(booking)} onOpenChange={(o) => !o && setBooking(null)} />
    </div>
  );
}

function Step({ n, icon: Icon, title, hint, done, doneLabel, action, children }: {
  n: number; icon: typeof Radar; title: string; hint: string; done?: number | 'ok'; doneLabel?: string;
  action?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{n}</span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-muted-foreground" />{title}</h2>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        {typeof done === 'number' && <span className="text-sm tabular-nums"><span className="font-semibold">{done}</span> <span className="text-muted-foreground">{doneLabel}</span></span>}
        {action}
      </div>
      {children && <div className="mt-4 pl-10">{children}</div>}
    </section>
  );
}

function ProspectList({ items, empty, button, showNext, today }: {
  items: Prospect[]; empty: string; button?: (p: Prospect) => React.ReactNode; showNext?: boolean; today?: string;
}) {
  const [all, setAll] = useState(false);
  if (!items.length) return empty ? <p className="text-sm text-muted-foreground">{empty}</p> : null;
  const shown = all ? items : items.slice(0, 5);
  return (
    <>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {shown.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
            <Link to="/leads?view=mine" className="font-medium hover:underline">{p.businessName}</Link>
            <TierBadge tier={p.tier} />
            <ProspectStageBadge stage={p.stage} />
            {showNext && p.nextActionDate && (
              <span className={p.nextActionDate < (today || '') ? 'text-destructive' : 'text-warning'}>
                {p.nextAction} · {format(parseISO(p.nextActionDate), 'd MMM')}
              </span>
            )}
            {!showNext && p.observedProblem && <span className="w-full truncate text-muted-foreground sm:w-auto sm:flex-1">{p.observedProblem}</span>}
            {button && <span className="ml-auto">{button(p)}</span>}
          </li>
        ))}
      </ul>
      {items.length > 5 && (
        <Button size="sm" variant="ghost" className="mt-1 px-0 text-accent" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${items.length}`}
        </Button>
      )}
    </>
  );
}

type Period = 'week' | 'last' | '30' | 'custom';

function Scoreboard() {
  const { scoreboard, targets, isAdmin, saveTarget } = useSalesDept();
  const [period, setPeriod] = useState<Period>('week');
  const [custom, setCustom] = useState(weekRange());
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [notes, setNotes] = useState<{ objection?: string; offer?: string; kind: string }[]>([]);
  const range = useMemo(() => {
    if (period === 'week') return weekRange();
    if (period === 'last') return weekRange(-1);
    if (period === '30') {
      const to = new Date();
      return { from: format(new Date(to.getTime() - 29 * 86400000), 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') };
    }
    return custom;
  }, [period, custom]);

  useEffect(() => {
    scoreboard(range.from, range.to).then(setRows);
    supabase.from('sales_activities').select('objection, offer, kind')
      .gte('occurred_at', `${range.from}T00:00:00`).lte('occurred_at', `${range.to}T23:59:59.999`)
      .then(({ data }) => setNotes((data || []).map((d) => ({ objection: d.objection || undefined, offer: d.offer || undefined, kind: d.kind }))));
  }, [range, scoreboard]);

  const active = rows.filter((r) => TARGET_METRICS.some((m) => r.metrics[m] > 0) || r.metrics.open > 0);
  const objections = notes.filter((n) => n.objection).map((n) => n.objection!);
  const offers = Object.entries(notes.reduce<Record<string, { put: number; conv: number }>>((acc, n) => {
    if (!n.offer) return acc;
    acc[n.offer] ??= { put: 0, conv: 0 };
    acc[n.offer].put += 1;
    if (n.kind === 'conversation') acc[n.offer].conv += 1;
    return acc;
  }, {})).sort((a, b) => b[1].conv - a[1].conv || b[1].put - a[1].put);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Label htmlFor="sb-period">Period</Label>
          <SelectField id="sb-period" className="mt-1.5" value={period} onChange={(v) => setPeriod(v as Period)}
            options={[{ value: 'week', label: 'This week' }, { value: 'last', label: 'Last week' }, { value: '30', label: 'Last 30 days' }, { value: 'custom', label: 'Choose dates' }]} />
        </div>
        {period === 'custom' && (
          <>
            <div><Label htmlFor="sb-from">From</Label><Input id="sb-from" type="date" className="mt-1.5" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></div>
            <div><Label htmlFor="sb-to">To</Label><Input id="sb-to" type="date" className="mt-1.5" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></div>
          </>
        )}
        <p className="pb-2 text-sm text-muted-foreground">{format(parseISO(range.from), 'd MMM')} – {format(parseISO(range.to), 'd MMM yyyy')}</p>
      </div>

      {active.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No sales activity in this period yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Person</th>
                {TARGET_METRICS.map((m) => <th key={m} className="px-3 py-3 font-medium">{TARGET_LABELS[m]}</th>)}
                <th className="px-3 py-3 font-medium" title="Researched prospects with evidence recorded">Evidence</th>
                <th className="px-3 py-3 font-medium" title="Researched prospects rated tier A or B">Tier A/B</th>
                <th className="px-3 py-3 font-medium" title="Conversations per first contact">Response</th>
                <th className="px-3 py-3 font-medium">Open · no next · overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {active.map((r) => (
                <tr key={r.userId}>
                  <td className="px-4 py-3 font-medium">{r.fullName || 'Team member'}</td>
                  {TARGET_METRICS.map((m) => {
                    const t = scaledTarget(targetFor(targets, m, r.userId), range.from, range.to);
                    const hit = t ? r.metrics[m] >= t.min : undefined;
                    return (
                      <td key={m} className="px-3 py-3 tabular-nums">
                        <span className={hit === undefined ? '' : hit ? 'font-semibold text-success' : 'font-semibold text-warning'}>{r.metrics[m]}</span>
                        {t && <span className="text-muted-foreground"> / {t.min}{t.max !== undefined && t.max !== t.min ? `–${t.max}` : ''}</span>}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 tabular-nums">{pct(r.metrics.with_evidence, r.metrics.researched)}</td>
                  <td className="px-3 py-3 tabular-nums">{pct(r.metrics.tier_ab, r.metrics.researched)}</td>
                  <td className="px-3 py-3 tabular-nums">{pct(r.metrics.conversation, r.metrics.first_contact)}</td>
                  <td className="px-3 py-3 tabular-nums">
                    {r.metrics.open} · <span className={r.metrics.no_next_action ? 'text-destructive' : ''}>{r.metrics.no_next_action}</span> · <span className={r.metrics.overdue ? 'text-destructive' : ''}>{r.metrics.overdue}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Quality counts as much as volume: 20 well-researched prospects beat 50 unsuitable ones. Targets are trial targets; review them after the first two weeks.</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Objections heard ({objections.length})</h2>
          {objections.length === 0 ? <p className="text-sm text-muted-foreground">None recorded in this period.</p> : (
            <ul className="list-disc space-y-1 pl-5 text-sm">{objections.map((o, i) => <li key={i}>{o}</li>)}</ul>
          )}
        </section>
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Which offer drew interest</h2>
          {offers.length === 0 ? <p className="text-sm text-muted-foreground">No offers recorded on contacts yet.</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Offer</th><th className="py-1 font-medium">Put to them</th><th className="py-1 font-medium">Conversations</th></tr></thead>
              <tbody>{offers.map(([o, c]) => <tr key={o}><td className="py-1">{o}</td><td className="py-1 tabular-nums">{c.put}</td><td className="py-1 tabular-nums">{c.conv}</td></tr>)}</tbody>
            </table>
          )}
        </section>
      </div>

      {isAdmin && <TargetsEditor targets={targets} onSave={saveTarget} />}
    </div>
  );
}

function TargetsEditor({ targets, onSave }: { targets: ReturnType<typeof useSalesDept>['targets']; onSave: ReturnType<typeof useSalesDept>['saveTarget'] }) {
  const initial = () => Object.fromEntries(TARGET_METRICS.map((m) => {
    const t = targetFor(targets, m);
    return [m, { min: t?.weeklyMin?.toString() ?? '', max: t?.weeklyMax?.toString() ?? '' }];
  })) as Record<TargetMetric, { min: string; max: string }>;
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setForm(initial()), [targets]);

  const save = async () => {
    setSaving(true);
    for (const m of TARGET_METRICS) {
      const min = Number(form[m].min);
      const max = form[m].max.trim() === '' ? undefined : Number(form[m].max);
      const t = targetFor(targets, m);
      if (form[m].min.trim() === '' || Number.isNaN(min)) continue;
      if (t && t.weeklyMin === min && t.weeklyMax === max) continue;
      if (max !== undefined && max < min) continue;
      await onSave(m, min, max);
    }
    setSaving(false);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Weekly targets (team)</h2>
      <p className="mb-4 text-sm text-muted-foreground">Only you (admin) can change these. Build consistency first; adjust after two weeks.</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {TARGET_METRICS.map((m) => (
          <div key={m} className="rounded-lg border border-border p-3">
            <p className="mb-2 text-sm font-medium">{TARGET_LABELS[m]}</p>
            <div className="flex items-center gap-2">
              <Input aria-label={`${TARGET_LABELS[m]} minimum`} type="number" min="0" className="w-20" value={form[m].min}
                onChange={(e) => setForm({ ...form, [m]: { ...form[m], min: e.target.value } })} />
              <span className="text-muted-foreground">to</span>
              <Input aria-label={`${TARGET_LABELS[m]} maximum`} type="number" min="0" className="w-20" value={form[m].max}
                onChange={(e) => setForm({ ...form, [m]: { ...form[m], max: e.target.value } })} />
              <span className="text-xs text-muted-foreground">/ week</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end"><Button className="bg-accent hover:bg-accent/90" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save targets'}</Button></div>
    </section>
  );
}
