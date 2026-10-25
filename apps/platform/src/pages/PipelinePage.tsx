import { useMemo, useState, DragEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format, parseISO, subDays } from 'date-fns';
import { Plus, Search, Trophy, XCircle, CalendarClock, TrendingUp, Target, Percent, Briefcase } from 'lucide-react';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input } from '@company-web/shared/ui';
import { cn } from '@company-web/shared/utils';
import { DealForm } from '@/components/crm/DealForm';
import { WinDealDialog, LoseDealDialog } from '@/components/crm/CloseDealDialogs';
import { Deal, DealStage, DEAL_STAGE_LABELS, OPEN_DEAL_STAGES } from '@/types/crm';
import { formatMoney, formatTotals, sumByCurrency } from '@/lib/money';
import { DealInput } from '@/hooks/useSalesStore';

const COLUMN_ACCENT: Record<DealStage, string> = {
  lead: 'border-t-muted-foreground/40',
  qualified: 'border-t-info',
  proposal: 'border-t-accent',
  negotiation: 'border-t-warning',
  won: 'border-t-success',
  lost: 'border-t-destructive',
};

export default function PipelinePage() {
  const { getClient, company, refetch } = useAppStore();
  const { deals, followUps, addDeal, moveDealStage, getMemberName } = useSales();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [params, setParams] = useSearchParams();
  // /pipeline?new=1 (e.g. from the dashboard) opens the new-deal form.
  const [isAddOpen, setIsAddOpenState] = useState(params.get('new') === '1');
  const setIsAddOpen = (open: boolean) => {
    setIsAddOpenState(open);
    if (!open && params.has('new')) setParams({}, { replace: true });
  };
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<DealStage | null>(null);
  const [winning, setWinning] = useState<Deal | null>(null);
  const [losing, setLosing] = useState<Deal | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const fallbackCurrency = company.defaultCurrency || 'LKR';

  const visibleDeals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deals.filter((d) => {
      if (mineOnly && d.ownerId !== user?.id) return false;
      if (!q) return true;
      const client = getClient(d.clientId);
      return d.title.toLowerCase().includes(q)
        || client?.name.toLowerCase().includes(q)
        || client?.companyName?.toLowerCase().includes(q);
    });
  }, [deals, search, mineOnly, user?.id, getClient]);

  const stats = useMemo(() => {
    const open = visibleDeals.filter((d) => OPEN_DEAL_STAGES.includes(d.stage));
    const since = subDays(new Date(), 90).toISOString();
    const recentlyClosed = visibleDeals.filter((d) => (d.stage === 'won' || d.stage === 'lost') && d.closedAt && d.closedAt >= since);
    const won = recentlyClosed.filter((d) => d.stage === 'won');
    return {
      openCount: open.length,
      pipeline: sumByCurrency(open, (d) => d.value, (d) => d.currency),
      weighted: sumByCurrency(open, (d) => (d.value * d.probability) / 100, (d) => d.currency),
      wonValue: sumByCurrency(won, (d) => d.value, (d) => d.currency),
      winRate: recentlyClosed.length ? Math.round((won.length / recentlyClosed.length) * 100) : null,
      closedCount: recentlyClosed.length,
    };
  }, [visibleDeals]);

  const openFollowUpDeals = useMemo(
    () => new Set(followUps.filter((f) => !f.completedAt && f.dealId).map((f) => f.dealId)),
    [followUps],
  );

  const handleDrop = async (stage: DealStage, e: DragEvent) => {
    e.preventDefault();
    setOverStage(null);
    const deal = deals.find((d) => d.id === (dragId || e.dataTransfer.getData('text/plain')));
    setDragId(null);
    if (!deal || deal.stage === stage) return;
    if (stage === 'won') return setWinning(deal);
    if (stage === 'lost') return setLosing(deal);
    // The database may move the account from lead to prospect.
    if (await moveDealStage(deal.id, stage)) refetch();
  };

  const dropHandlers = (stage: DealStage) => ({
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      if (overStage !== stage) setOverStage(stage);
    },
    onDragLeave: () => setOverStage((s) => (s === stage ? null : s)),
    onDrop: (e: DragEvent) => handleDrop(stage, e),
  });

  const handleAddDeal = async (data: DealInput) => {
    const created = await addDeal(data);
    if (created) setIsAddOpen(false);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Pipeline"
        description="Drag deals between stages. Drop on Won or Lost to close them."
        actions={
          <Button className="gap-2 bg-accent hover:bg-accent/90" onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4" />
            New Deal
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Open pipeline"
          value={<span className="text-2xl">{formatTotals(stats.pipeline, fallbackCurrency)}</span>}
          icon={<Briefcase className="h-6 w-6" />}
          description={`${stats.openCount} open deals`}
        />
        <StatCard
          title="Weighted forecast"
          value={<span className="text-2xl">{formatTotals(stats.weighted, fallbackCurrency)}</span>}
          icon={<TrendingUp className="h-6 w-6" />}
          description="Value × win chance"
        />
        <StatCard
          title="Won (90 days)"
          value={<span className="text-2xl">{formatTotals(stats.wonValue, fallbackCurrency)}</span>}
          icon={<Target className="h-6 w-6" />}
        />
        <StatCard
          title="Win rate (90 days)"
          value={<span className="text-2xl">{stats.winRate === null ? '—' : `${stats.winRate}%`}</span>}
          icon={<Percent className="h-6 w-6" />}
          description={`${stats.closedCount} deals closed`}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search deals or accounts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          {[{ v: false, l: 'All deals' }, { v: true, l: 'My deals' }].map((o) => (
            <button
              key={o.l}
              onClick={() => setMineOnly(o.v)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${mineOnly === o.v ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {OPEN_DEAL_STAGES.map((stage) => {
          const columnDeals = visibleDeals.filter((d) => d.stage === stage);
          const totals = sumByCurrency(columnDeals, (d) => d.value, (d) => d.currency);
          return (
            <div
              key={stage}
              {...dropHandlers(stage)}
              className={cn(
                'flex w-72 shrink-0 flex-col rounded-xl border border-t-4 border-border bg-muted/30 transition-colors',
                COLUMN_ACCENT[stage],
                overStage === stage && 'bg-accent/5 ring-2 ring-accent/40',
              )}
            >
              <div className="px-3 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{DEAL_STAGE_LABELS[stage]}</h3>
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{columnDeals.length}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatTotals(totals, fallbackCurrency)}</p>
              </div>
              <div className="flex-1 space-y-2 px-2 pb-3" style={{ minHeight: 120 }}>
                {columnDeals.map((deal) => {
                  const client = getClient(deal.clientId);
                  const overdue = deal.expectedCloseDate && deal.expectedCloseDate < today;
                  return (
                    <Link
                      key={deal.id}
                      to={`/deals/${deal.id}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', deal.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDragId(deal.id);
                      }}
                      onDragEnd={() => { setDragId(null); setOverStage(null); }}
                      className={cn(
                        'block cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing',
                        dragId === deal.id && 'opacity-50',
                      )}
                    >
                      <p className="text-sm font-medium leading-snug">{deal.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{client?.companyName || client?.name || 'Unknown account'}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono text-sm font-semibold">{formatMoney(deal.value, deal.currency, { compact: true })}</span>
                        <span className="text-xs text-muted-foreground">{deal.probability}%</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span className={cn(overdue && 'font-medium text-destructive')}>
                          {deal.expectedCloseDate ? `Close ${format(parseISO(deal.expectedCloseDate), 'MMM d')}` : 'No close date'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {openFollowUpDeals.has(deal.id) && <CalendarClock className="h-3.5 w-3.5" aria-label="Has open follow-ups" />}
                          <span title={getMemberName(deal.ownerId)} className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase">
                            {getMemberName(deal.ownerId).slice(0, 1)}
                          </span>
                        </span>
                      </div>
                    </Link>
                  );
                })}
                {columnDeals.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">Drop deals here</p>
                )}
              </div>
            </div>
          );
        })}

        {/* Close-out drop zones */}
        <div className="flex w-56 shrink-0 flex-col gap-4">
          {(['won', 'lost'] as DealStage[]).map((stage) => {
            const count = visibleDeals.filter((d) => d.stage === stage).length;
            const Icon = stage === 'won' ? Trophy : XCircle;
            return (
              <div
                key={stage}
                {...dropHandlers(stage)}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors',
                  stage === 'won' ? 'border-success/40 text-success' : 'border-destructive/40 text-destructive',
                  overStage === stage && (stage === 'won' ? 'bg-success/10' : 'bg-destructive/10'),
                )}
              >
                <Icon className="mb-2 h-6 w-6" />
                <p className="text-sm font-semibold">{DEAL_STAGE_LABELS[stage]}</p>
                <Link to={`/deals?stage=${stage}`} className="mt-1 text-xs text-muted-foreground hover:underline">
                  {count} deals
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>New Deal</DialogTitle>
            <DialogDescription>Track a sales opportunity from first contact to signed work.</DialogDescription>
          </DialogHeader>
          <DealForm onSubmit={handleAddDeal} onCancel={() => setIsAddOpen(false)} />
        </DialogContent>
      </Dialog>

      <WinDealDialog deal={winning} onOpenChange={(open) => !open && setWinning(null)} />
      <LoseDealDialog deal={losing} onOpenChange={(open) => !open && setLosing(null)} />
    </AppLayout>
  );
}
