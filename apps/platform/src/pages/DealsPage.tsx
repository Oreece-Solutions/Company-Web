import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Search, Handshake, KanbanSquare, Download } from 'lucide-react';
import { downloadCsv } from '@/lib/csv';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@company-web/shared/ui';
import { DealStageBadge } from '@/components/crm/Badges';
import { OPEN_DEAL_STAGES } from '@/types/crm';
import { formatMoney } from '@/lib/money';

type StageFilter = 'all' | 'open' | 'won' | 'lost';

const FILTERS: { value: StageFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

export default function DealsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { getClient } = useAppStore();
  const { deals, getMemberName } = useSales();
  const [search, setSearch] = useState('');
  const filter = (params.get('stage') as StageFilter) || 'all';

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deals.filter((d) => {
      if (filter === 'open' && !OPEN_DEAL_STAGES.includes(d.stage)) return false;
      if ((filter === 'won' || filter === 'lost') && d.stage !== filter) return false;
      if (!q) return true;
      const client = getClient(d.clientId);
      return d.title.toLowerCase().includes(q) || (client?.companyName || client?.name || '').toLowerCase().includes(q);
    });
  }, [deals, filter, search, getClient]);

  return (
    <AppLayout>
      <PageHeader
        title="Deals"
        description="Every opportunity, open and closed"
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={() => downloadCsv(`oreece-deals-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows.map((d) => {
              const client = getClient(d.clientId);
              return {
                title: d.title, client: client?.companyName || client?.name, stage: d.stage, value_estimate: d.value, currency: d.currency,
                probability: d.probability, expected_close: d.expectedCloseDate, source: d.source, owner: getMemberName(d.ownerId), lost_reason: d.lostReason, closed_at: d.closedAt,
              };
            }))}>
              <Download className="h-4 w-4" />Export
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/pipeline')}>
              <KanbanSquare className="h-4 w-4" />
              Pipeline board
            </Button>
          </>
        }
      />

      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search deals..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setParams(f.value === 'all' ? {} : { stage: f.value })}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${filter === f.value ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Handshake className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No deals here yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Deal</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Close date</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((deal) => {
                const client = getClient(deal.clientId);
                const closeDate = deal.closedAt ? new Date(deal.closedAt) : deal.expectedCloseDate ? parseISO(deal.expectedCloseDate) : null;
                return (
                  <TableRow key={deal.id} className="cursor-pointer" onClick={() => navigate(`/deals/${deal.id}`)}>
                    <TableCell className="font-medium">{deal.title}</TableCell>
                    <TableCell className="text-muted-foreground">{client?.companyName || client?.name || '—'}</TableCell>
                    <TableCell><DealStageBadge stage={deal.stage} /></TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(deal.value, deal.currency)}</TableCell>
                    <TableCell className="text-muted-foreground">{closeDate ? format(closeDate, 'MMM d, yyyy') : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{getMemberName(deal.ownerId)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
}
