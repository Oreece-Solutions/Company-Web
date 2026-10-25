import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Plus, Search, FileSignature } from 'lucide-react';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@company-web/shared/ui';
import { QuoteStatusBadge } from '@/components/crm/Badges';
import { QuoteStatus, QUOTE_STATUS_LABELS, effectiveQuoteStatus } from '@/types/crm';
import { formatMoney } from '@/lib/money';

const FILTERS: (QuoteStatus | 'all')[] = ['all', 'draft', 'sent', 'accepted', 'declined', 'expired'];

export default function QuotesPage() {
  const navigate = useNavigate();
  const { getClient } = useAppStore();
  const { quotes } = useSales();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<QuoteStatus | 'all'>('all');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotes.filter((quote) => {
      if (filter !== 'all' && effectiveQuoteStatus(quote) !== filter) return false;
      if (!q) return true;
      const client = getClient(quote.clientId);
      return quote.quoteNumber.toLowerCase().includes(q)
        || quote.title.toLowerCase().includes(q)
        || (client?.companyName || client?.name || '').toLowerCase().includes(q);
    });
  }, [quotes, filter, search, getClient]);

  return (
    <AppLayout>
      <PageHeader
        title="Quotes"
        description="Proposals and estimates sent to clients"
        actions={
          <Button className="gap-2 bg-accent hover:bg-accent/90" onClick={() => navigate('/quotes/new')}>
            <Plus className="h-4 w-4" />
            New Quote
          </Button>
        }
      />

      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search quotes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${filter === f ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
            >
              {f === 'all' ? 'All' : QUOTE_STATUS_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileSignature className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mb-4 text-muted-foreground">{quotes.length === 0 ? 'No quotes yet' : 'No quotes match'}</p>
            {quotes.length === 0 && (
              <Button onClick={() => navigate('/quotes/new')} className="gap-2 bg-accent hover:bg-accent/90">
                <Plus className="h-4 w-4" />
                Create a quote
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Quote</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((quote) => {
                const client = getClient(quote.clientId);
                return (
                  <TableRow key={quote.id} className="cursor-pointer" onClick={() => navigate(`/quotes/${quote.id}`)}>
                    <TableCell>
                      <span className="font-medium">{quote.quoteNumber}</span>
                      {quote.title && <span className="block text-xs text-muted-foreground">{quote.title}</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{client?.companyName || client?.name || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{format(parseISO(quote.issueDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-muted-foreground">{quote.validUntil ? format(parseISO(quote.validUntil), 'MMM d, yyyy') : '—'}</TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(quote.total, quote.currency)}</TableCell>
                    <TableCell><QuoteStatusBadge status={effectiveQuoteStatus(quote)} /></TableCell>
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
