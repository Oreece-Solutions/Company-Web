import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarCheck } from 'lucide-react';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { FollowUpRow } from '@/components/crm/FollowUpPanel';
import { FollowUp } from '@/types/crm';

export default function FollowUpsPage() {
  const { getClient } = useAppStore();
  const { followUps, getDeal } = useSales();
  const { user } = useAuth();
  const [mineOnly, setMineOnly] = useState(true);
  const today = format(new Date(), 'yyyy-MM-dd');

  const groups = useMemo(() => {
    const open = followUps.filter((f) => !f.completedAt && (!mineOnly || f.assignedTo === user?.id));
    return [
      { title: 'Overdue', tone: 'text-destructive', items: open.filter((f) => f.dueDate < today) },
      { title: 'Today', tone: 'text-warning', items: open.filter((f) => f.dueDate === today) },
      { title: 'Upcoming', tone: 'text-foreground', items: open.filter((f) => f.dueDate > today) },
    ];
  }, [followUps, mineOnly, user?.id, today]);

  const context = (f: FollowUp) => {
    const client = getClient(f.clientId);
    const deal = f.dealId ? getDeal(f.dealId) : undefined;
    return (
      <>
        {' · '}
        <Link to={`/clients/${f.clientId}`} className="hover:underline">{client?.companyName || client?.name || 'Account'}</Link>
        {deal && (
          <>
            {' · '}
            <Link to={`/deals/${deal.id}`} className="hover:underline">{deal.title}</Link>
          </>
        )}
      </>
    );
  };

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <AppLayout>
      <PageHeader title="Follow-ups" description="Next steps across all accounts and deals" />

      <div className="mb-6 flex gap-2">
        {[{ v: true, l: 'Mine' }, { v: false, l: 'Everyone' }].map((o) => (
          <button
            key={o.l}
            onClick={() => setMineOnly(o.v)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${mineOnly === o.v ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >
            {o.l}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center shadow-card">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <CalendarCheck className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium">All caught up</p>
          <p className="text-sm text-muted-foreground">Add follow-ups from an account or deal page.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.filter((g) => g.items.length > 0).map((g) => (
            <section key={g.title}>
              <h2 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${g.tone}`}>
                {g.title} <span className="text-muted-foreground">({g.items.length})</span>
              </h2>
              <div className="max-w-3xl space-y-2">
                {g.items.map((f) => <FollowUpRow key={f.id} followUp={f} context={context(f)} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
