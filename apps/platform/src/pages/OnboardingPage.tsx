import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { ExternalLink, GraduationCap, Plus } from 'lucide-react';
import { Button, Checkbox, Input, Label, Progress, Textarea } from '@company-web/shared/ui';
import { supabase } from '@company-web/shared/data-access';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesDept } from '@/contexts/SalesDeptContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SelectField } from '@/components/crm/SelectField';
import { pct } from '@/lib/salesWeek';
import { OnboardingAssessment, OnboardingItem, OnboardingPlan, ONBOARDING_WEEKS, ScoreMetrics } from '@/types/sales';

const QUESTIONS: { key: keyof OnboardingAssessment; label: string }[] = [
  { key: 'prospects', label: 'How many suitable prospects were identified?' },
  { key: 'responses', label: 'How many responded?' },
  { key: 'meetings', label: 'How many discovery meetings were booked?' },
  { key: 'objections', label: 'What objections did businesses raise?' },
  { key: 'bestOffer', label: 'Which offer attracted the most interest?' },
  { key: 'changes', label: 'What should change next month?' },
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const { isAdmin, team, loadOnboarding, startOnboarding, memberName } = useSalesDept();
  const [plans, setPlans] = useState<OnboardingPlan[]>([]);
  const [items, setItems] = useState<OnboardingItem[]>([]);
  const [selected, setSelected] = useState('');
  const [newFor, setNewFor] = useState('');
  const [newStart, setNewStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const res = await loadOnboarding();
    setPlans(res.plans);
    setItems(res.items);
    setLoaded(true);
    return res.plans;
  }, [loadOnboarding]);

  useEffect(() => {
    reload().then((p) => setSelected((s) => s || p.find((x) => x.status === 'active')?.id || p[0]?.id || ''));
  }, [reload]);

  const plan = plans.find((p) => p.id === selected);

  const start = async () => {
    if (!newFor) return;
    const id = await startOnboarding(newFor, newStart);
    if (id) {
      await reload();
      setSelected(id);
      setNewFor('');
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Onboarding" description="A 30-day plan for a new sales hire, with the end-of-month assessment." />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        {plans.length > 0 && (
          <div className="w-72">
            <Label htmlFor="ob-plan">Plan</Label>
            <SelectField id="ob-plan" className="mt-1.5" value={selected} onChange={setSelected}
              options={plans.map((p) => ({ value: p.id, label: `${memberName(p.userId) ?? 'Team member'} · from ${format(parseISO(p.startDate), 'd MMM yyyy')}${p.status !== 'active' ? ` (${p.status})` : ''}` }))} />
          </div>
        )}
        {isAdmin && (
          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-border p-3">
            <div className="w-56">
              <Label htmlFor="ob-new-user">New plan for</Label>
              <SelectField id="ob-new-user" className="mt-1.5" value={newFor} onChange={setNewFor} placeholder="Team member"
                options={team.filter((m) => m.userId !== user?.id).map((m) => ({ value: m.userId, label: m.fullName || 'Team member' }))} />
            </div>
            <div>
              <Label htmlFor="ob-new-start">First day</Label>
              <Input id="ob-new-start" type="date" className="mt-1.5" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
            </div>
            <Button className="gap-2 bg-accent hover:bg-accent/90" disabled={!newFor} onClick={start}><Plus className="h-4 w-4" />Start 30-day plan</Button>
          </div>
        )}
      </div>

      {isAdmin && team.filter((m) => m.userId !== user?.id).length === 0 && (
        <p className="mb-6 rounded-xl border border-border bg-card p-4 text-sm shadow-card">
          Your new hire needs an HQ account first: ask them to sign up, then give them the <span className="font-medium">Staff</span> role in{' '}
          <Link to="/settings" className="text-accent hover:underline">Settings → Team</Link>.
        </p>
      )}

      {!plan ? (
        loaded && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center shadow-card">
            <GraduationCap className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No onboarding plan yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">{isAdmin ? 'Start one above for your new sales hire.' : 'The founder will set one up for you.'}</p>
          </div>
        )
      ) : (
        <PlanView key={plan.id} plan={plan} items={items.filter((i) => i.planId === plan.id)} isAdmin={isAdmin} isMine={plan.userId === user?.id}
          onItem={(i) => setItems((prev) => prev.map((x) => (x.id === i.id ? i : x)))}
          onPlan={(p) => setPlans((prev) => prev.map((x) => (x.id === p.id ? p : x)))} />
      )}
    </AppLayout>
  );
}

function PlanView({ plan, items, isAdmin, isMine, onItem, onPlan }: {
  plan: OnboardingPlan; items: OnboardingItem[]; isAdmin: boolean; isMine: boolean;
  onItem: (i: OnboardingItem) => void; onPlan: (p: OnboardingPlan) => void;
}) {
  const { tickItem, savePlan, scoreboard, memberName } = useSalesDept();
  const [answers, setAnswers] = useState<OnboardingAssessment>(plan.assessment);
  const [numbers, setNumbers] = useState<ScoreMetrics | null>(null);
  const [objections, setObjections] = useState<string[]>([]);
  const [offers, setOffers] = useState<[string, number][]>([]);
  const end = format(addDays(parseISO(plan.startDate), 29), 'yyyy-MM-dd');
  const day = differenceInCalendarDays(new Date(), parseISO(plan.startDate)) + 1;

  useEffect(() => {
    scoreboard(plan.startDate, end).then((rows) => setNumbers(rows.find((r) => r.userId === plan.userId)?.metrics ?? null));
    supabase.from('sales_activities').select('objection, offer, kind').eq('user_id', plan.userId)
      .gte('occurred_at', `${plan.startDate}T00:00:00`).lte('occurred_at', `${end}T23:59:59.999`)
      .then(({ data }) => {
        setObjections((data || []).map((d) => d.objection).filter(Boolean) as string[]);
        const tally: Record<string, number> = {};
        for (const d of data || []) if (d.offer && d.kind === 'conversation') tally[d.offer] = (tally[d.offer] || 0) + 1;
        setOffers(Object.entries(tally).sort((a, b) => b[1] - a[1]));
      });
  }, [plan.startDate, plan.userId, end, scoreboard]);

  const done = items.filter((i) => i.doneAt).length;
  const weeks = useMemo(() => [0, 1, 2, 3, 4].map((w) => ({ week: w, items: items.filter((i) => i.week === w) })), [items]);
  const canTick = (i: OnboardingItem) => plan.status === 'active' && (isAdmin || (isMine && i.owner === 'rep'));

  // Suggested answers from the numbers, so the review starts from facts.
  const suggest = () => {
    if (!numbers) return;
    setAnswers({
      ...answers,
      prospects: answers.prospects || `${numbers.qualified} qualified of ${numbers.researched} researched (${pct(numbers.with_evidence, numbers.researched)} with evidence, ${pct(numbers.tier_ab, numbers.researched)} tier A/B)`,
      responses: answers.responses || `${numbers.conversation} conversations from ${numbers.first_contact} first contacts (${pct(numbers.conversation, numbers.first_contact)})`,
      meetings: answers.meetings || `${numbers.meeting_booked}`,
      objections: answers.objections || objections.join('\n'),
      bestOffer: answers.bestOffer || (offers[0] ? `${offers[0][0]} (${offers[0][1]} conversations)` : ''),
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="min-w-0 space-y-4">
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">{memberName(plan.userId)} · {plan.roleTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(plan.startDate), 'd MMM')} – {format(parseISO(end), 'd MMM yyyy')}
              {plan.status === 'active' && day >= 1 && day <= 30 && ` · day ${day} of 30`}
              {plan.status === 'active' && day < 1 && ` · starts in ${1 - day} day${day === 0 ? '' : 's'}`}
            </p>
          </div>
          <Progress value={items.length ? (done / items.length) * 100 : 0} className="mt-3" aria-label="Checklist progress" />
          <p className="mt-1 text-xs text-muted-foreground">{done} of {items.length} done</p>
        </section>

        {weeks.map(({ week, items: list }) => list.length > 0 && (
          <section key={week} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{ONBOARDING_WEEKS[week]}</h3>
            <ul className="space-y-3">
              {list.map((i) => (
                <li key={i.id} className="flex items-start gap-3">
                  <Checkbox id={`ob-${i.id}`} className="mt-0.5" checked={!!i.doneAt} disabled={!canTick(i)}
                    onCheckedChange={async (c) => { const r = await tickItem(i, c === true); if (r) onItem(r); }} />
                  <div className="min-w-0 flex-1 text-sm">
                    <label htmlFor={`ob-${i.id}`} className={i.doneAt ? 'text-muted-foreground line-through' : 'font-medium'}>{i.title}</label>
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${i.owner === 'founder' ? 'bg-info/10 text-info' : 'bg-accent/10 text-accent'}`}>
                      {i.owner === 'founder' ? 'Founder' : 'New hire'}
                    </span>
                    {i.detail && <p className="text-muted-foreground">{i.detail}</p>}
                    {i.link && (i.link.startsWith('http')
                      ? <a href={i.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">Official guidance<ExternalLink className="h-3 w-3" /></a>
                      : <Link to={i.link} className="text-accent hover:underline">Open</Link>)}
                    {i.doneAt && <p className="text-xs text-muted-foreground">Done {format(parseISO(i.doneAt), 'd MMM')}{i.doneBy ? ` by ${memberName(i.doneBy)}` : ''}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="text-xs text-muted-foreground">Employment items are reminders, not legal advice. Check employment.govt.nz and get advice if unsure.</p>
      </div>

      <aside className="space-y-4">
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">First 30 days in numbers</h2>
          {!numbers ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Researched" value={numbers.researched} />
              <Stat label="Qualified" value={numbers.qualified} />
              <Stat label="First contacts" value={numbers.first_contact} />
              <Stat label="Follow-ups" value={numbers.follow_up} />
              <Stat label="Conversations" value={numbers.conversation} />
              <Stat label="Meetings booked" value={numbers.meeting_booked} />
              <Stat label="With evidence" value={pct(numbers.with_evidence, numbers.researched)} />
              <Stat label="Response rate" value={pct(numbers.conversation, numbers.first_contact)} />
            </dl>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">30-day assessment</h2>
            {isAdmin && numbers && plan.status === 'active' && <Button size="sm" variant="ghost" className="text-accent" onClick={suggest}>Fill from the numbers</Button>}
          </div>
          <div className="space-y-3">
            {QUESTIONS.map((q) => (
              <div key={q.key}>
                <Label htmlFor={`ob-q-${q.key}`}>{q.label}</Label>
                <Textarea id={`ob-q-${q.key}`} rows={q.key === 'objections' || q.key === 'changes' ? 3 : 1} className="mt-1.5" disabled={!isAdmin}
                  value={answers[q.key] || ''} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} />
              </div>
            ))}
          </div>
          {isAdmin && (
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={async () => { const p = await savePlan(plan.id, { assessment: answers }); if (p) onPlan(p); }}>Save</Button>
              {plan.status === 'active' && (
                <Button className="bg-accent hover:bg-accent/90" onClick={async () => { const p = await savePlan(plan.id, { assessment: answers, status: 'completed' }); if (p) onPlan(p); }}>
                  Complete onboarding
                </Button>
              )}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
