import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Handshake } from 'lucide-react';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@company-web/shared/ui';
import { DealStageBadge } from '@/components/crm/Badges';
import { Deal, OPEN_DEAL_STAGES } from '@/types/crm';
import { formatMoney } from '@/lib/money';

export type StageFilter = 'all' | 'open' | 'won' | 'lost';

export const STAGE_FILTERS: { value: StageFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

export function filterDeals(deals: Deal[], filter: StageFilter) {
  return deals.filter((d) => {
    if (filter === 'open') return OPEN_DEAL_STAGES.includes(d.stage);
    if (filter === 'won' || filter === 'lost') return d.stage === filter;
    return true;
  });
}

// The Pipeline's list view: every deal, open and closed, as a table.
export function DealsList({ deals }: { deals: Deal[] }) {
  const navigate = useNavigate();
  const { getClient } = useAppStore();
  const { getMemberName } = useSales();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      {deals.length === 0 ? (
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
            {deals.map((deal) => {
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
  );
}
