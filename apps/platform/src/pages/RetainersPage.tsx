import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Repeat, Plus, Pencil, Trash2, FileText, Pause, Play, Square } from 'lucide-react';
import {
  Button, Input, Label, Textarea, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@company-web/shared/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/contexts/StoreContext';
import { useHq } from '@/contexts/HqContext';
import { useMoney } from '@/contexts/MoneyContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { SelectField } from '@/components/crm/SelectField';
import { hasAccess } from '@/lib/access';
import { formatMoney, formatTotals, sumByCurrency } from '@/lib/money';
import { CURRENCIES, Currency } from '@/types/invoice';
import { BillingInterval, INTERVAL_LABELS, INTERVAL_MONTHS, Retainer, RetainerInput, RETAINER_STATUS_LABELS, RetainerStatus } from '@/types/money';
import { toast } from 'sonner';

const today = () => format(new Date(), 'yyyy-MM-dd');

function RetainerForm({ initial, onSubmit, onCancel }: { initial?: Retainer; onSubmit: (d: RetainerInput) => void; onCancel: () => void }) {
  const { clients } = useAppStore();
  const { services } = useHq();
  const [d, setD] = useState<RetainerInput>(initial ? { ...initial } : {
    clientId: '', name: '', amount: 0, currency: 'NZD', interval: 'monthly', nextInvoiceDate: today(),
    paymentTermsDays: 14, status: 'active', startDate: today(),
  });
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const set = <K extends keyof RetainerInput>(k: K, v: RetainerInput[K]) => setD({ ...d, [k]: v });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!d.clientId) return toast.error('Choose the client');
        if (!(Number(amount) > 0)) return toast.error('Enter the amount per period');
        onSubmit({ ...d, amount: Number(amount) });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="rt-client">Client *</Label>
          <SelectField id="rt-client" className="mt-1.5" value={d.clientId} onChange={(v) => set('clientId', v)} placeholder="Choose a client"
            options={clients.map((c) => ({ value: c.id, label: c.companyName || c.name }))} />
        </div>
        <div>
          <Label htmlFor="rt-service">Service</Label>
          <SelectField id="rt-service" className="mt-1.5" value={d.serviceId || ''} noneLabel="None"
            onChange={(v) => {
              const s = services.find((x) => x.id === v);
              setD({ ...d, serviceId: v || undefined, name: d.name || s?.name || '' });
              if (s?.price && !amount) setAmount(String(s.price));
            }}
            options={services.map((s) => ({ value: s.id, label: s.name }))} />
        </div>
      </div>
      <div>
        <Label htmlFor="rt-name">What it covers (shown on the invoice) *</Label>
        <Input id="rt-name" required className="mt-1.5" value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Website care plan" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="rt-amount">Amount per period *</Label>
          <Input id="rt-amount" type="number" step="0.01" min="0.01" className="mt-1.5" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="rt-currency">Currency</Label>
          <SelectField id="rt-currency" className="mt-1.5" value={d.currency} onChange={(v) => set('currency', v as Currency)} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
        </div>
        <div>
          <Label htmlFor="rt-interval">Billed</Label>
          <SelectField id="rt-interval" className="mt-1.5" value={d.interval} onChange={(v) => set('interval', v as BillingInterval)}
            options={(Object.keys(INTERVAL_LABELS) as BillingInterval[]).map((k) => ({ value: k, label: INTERVAL_LABELS[k] }))} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <Label htmlFor="rt-start">Started</Label>
          <Input id="rt-start" type="date" className="mt-1.5" value={d.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="rt-next">Next invoice</Label>
          <Input id="rt-next" type="date" className="mt-1.5" value={d.nextInvoiceDate} onChange={(e) => set('nextInvoiceDate', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="rt-end">Ends (optional)</Label>
          <Input id="rt-end" type="date" className="mt-1.5" value={d.endDate || ''} onChange={(e) => set('endDate', e.target.value || undefined)} />
        </div>
        <div>
          <Label htmlFor="rt-terms">Pay within (days)</Label>
          <Input id="rt-terms" type="number" min="0" max="120" className="mt-1.5" value={d.paymentTermsDays} onChange={(e) => set('paymentTermsDays', Number(e.target.value))} />
        </div>
      </div>
      <div>
        <Label htmlFor="rt-desc">Invoice note</Label>
        <Textarea id="rt-desc" rows={2} className="mt-1.5" value={d.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="What's included each period" />
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-accent hover:bg-accent/90">{initial ? 'Save' : 'Add retainer'}</Button>
      </div>
    </form>
  );
}

// Recurring work (support, hosting, care plans): what it brings in each month
// and one button to raise every invoice that is due.
export default function RetainersPage() {
  const { roles } = useAuth();
  const isAdmin = hasAccess(roles, 'admin');
  const { getClient, refetch: refetchInvoices, company } = useAppStore();
  const { retainers, saveRetainer, setRetainerStatus, deleteRetainer, invoiceDueRetainers } = useMoney();
  const [editing, setEditing] = useState<Retainer | null>(null);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [show, setShow] = useState<RetainerStatus | 'all'>('active');
  const fallback = company.defaultCurrency || 'NZD';

  const active = retainers.filter((r) => r.status === 'active');
  const due = active.filter((r) => r.nextInvoiceDate <= today());
  const mrr = useMemo(() => sumByCurrency(active, (r) => r.amount / INTERVAL_MONTHS[r.interval], (r) => r.currency), [active]);
  const rows = retainers.filter((r) => show === 'all' || r.status === show);

  const runDue = async () => {
    setRunning(true);
    const made = await invoiceDueRetainers();
    setRunning(false);
    if (made === null) return;
    refetchInvoices();
    toast.success(made === 0 ? 'Nothing due to invoice' : `${made} invoice${made === 1 ? '' : 's'} created. Check and send them from Invoices.`);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Retainers"
        description="Recurring work billed every month, quarter or year"
        actions={
          <>
            <Button variant="outline" className="gap-2" disabled={due.length === 0 || running} onClick={runDue}>
              <FileText className="h-4 w-4" />{due.length > 0 ? `Create ${due.length} due invoice${due.length === 1 ? '' : 's'}` : 'No invoices due'}
            </Button>
            <Button className="gap-2 bg-accent hover:bg-accent/90" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" />Add retainer</Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="Monthly recurring revenue" value={<span className="text-2xl">{formatTotals(mrr, fallback)}</span>} icon={<Repeat className="h-6 w-6" />} description="Active retainers, per month" />
        <StatCard title="Yearly run rate" value={<span className="text-2xl">{formatTotals(mrr.map((m) => ({ ...m, total: m.total * 12 })), fallback)}</span>} icon={<Repeat className="h-6 w-6" />} description="If nothing changes" />
        <StatCard title="Active retainers" value={active.length} icon={<FileText className="h-6 w-6" />} description={`${due.length} due to invoice`} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Show">
        {(['active', 'paused', 'ended', 'all'] as const).map((s) => (
          <button key={s} onClick={() => setShow(s)} aria-pressed={show === s}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${show === s ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
            {s === 'all' ? 'All' : RETAINER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"><Repeat className="h-8 w-8 text-muted-foreground" /></div>
            <p className="font-medium">No retainers here</p>
            <p className="text-sm text-muted-foreground">Add ongoing support, hosting or care plans to bill them automatically.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Client</TableHead>
                <TableHead>Covers</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Next invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const c = getClient(r.clientId);
                const isDue = r.status === 'active' && r.nextInvoiceDate <= today();
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium"><Link to={`/clients/${r.clientId}`} className="hover:underline">{c?.companyName || c?.name || '—'}</Link></TableCell>
                    <TableCell>{r.name}{r.endDate && <span className="block text-xs text-muted-foreground">ends {format(parseISO(r.endDate), 'd MMM yyyy')}</span>}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono">{formatMoney(r.amount, r.currency)}<span className="block text-xs text-muted-foreground">{INTERVAL_LABELS[r.interval].toLowerCase()}</span></TableCell>
                    <TableCell className={isDue ? 'font-medium text-warning' : 'text-muted-foreground'}>{r.status === 'ended' ? '—' : format(parseISO(r.nextInvoiceDate), 'd MMM yyyy')}{isDue && <span className="block text-xs">due</span>}</TableCell>
                    <TableCell>{RETAINER_STATUS_LABELS[r.status]}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" aria-label={`Edit ${r.name}`} onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        {r.status === 'active' && <Button variant="ghost" size="icon" aria-label={`Pause ${r.name}`} onClick={() => setRetainerStatus(r, 'paused')}><Pause className="h-4 w-4" /></Button>}
                        {r.status === 'paused' && <Button variant="ghost" size="icon" aria-label={`Resume ${r.name}`} onClick={() => setRetainerStatus(r, 'active')}><Play className="h-4 w-4" /></Button>}
                        {r.status !== 'ended' && <Button variant="ghost" size="icon" aria-label={`End ${r.name}`} onClick={() => setRetainerStatus(r, 'ended')}><Square className="h-4 w-4" /></Button>}
                        {isAdmin && <Button variant="ghost" size="icon" aria-label={`Delete ${r.name}`} onClick={() => deleteRetainer(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add retainer'}</DialogTitle>
            <DialogDescription>HQ raises an unpaid invoice on each "next invoice" date when you press "Create due invoices".</DialogDescription>
          </DialogHeader>
          <RetainerForm key={editing?.id ?? 'new'} initial={editing ?? undefined} onCancel={() => setOpen(false)}
            onSubmit={async (d) => { if (await saveRetainer(d, editing?.id)) { setOpen(false); setEditing(null); } }} />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
