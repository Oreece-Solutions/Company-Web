import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Receipt, Plus, Pencil, Trash2, Download, Search } from 'lucide-react';
import {
  Button, Input, Label, Switch, Textarea, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@company-web/shared/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/contexts/StoreContext';
import { useHq } from '@/contexts/HqContext';
import { useMoney } from '@/contexts/MoneyContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SelectField } from '@/components/crm/SelectField';
import { hasAccess } from '@/lib/access';
import { downloadCsv } from '@/lib/csv';
import { formatMoney, formatTotals, sumByCurrency } from '@/lib/money';
import { CURRENCIES, Currency } from '@/types/invoice';
import { EXPENSE_CATEGORY_LABELS, Expense, ExpenseCategory, ExpenseInput } from '@/types/money';
import { toast } from 'sonner';

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];

function ExpenseForm({ initial, onSubmit, onCancel }: { initial?: Expense; onSubmit: (d: ExpenseInput) => void; onCancel: () => void }) {
  const { projects } = useAppStore();
  const { contractors } = useHq();
  const [d, setD] = useState<ExpenseInput>(initial ? { ...initial } : {
    spentOn: format(new Date(), 'yyyy-MM-dd'), supplier: '', category: 'software', amount: 0, currency: 'NZD', gstClaimable: true,
  });
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const set = <K extends keyof ExpenseInput>(k: K, v: ExpenseInput[K]) => setD({ ...d, [k]: v });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!d.supplier.trim()) return toast.error('Who was it paid to?');
        if (!(Number(amount) > 0)) return toast.error('Enter the amount paid');
        onSubmit({ ...d, amount: Number(amount) });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="ex-date">Date paid</Label>
          <Input id="ex-date" type="date" className="mt-1.5" value={d.spentOn} onChange={(e) => set('spentOn', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ex-supplier">Paid to *</Label>
          <Input id="ex-supplier" required className="mt-1.5" value={d.supplier} onChange={(e) => set('supplier', e.target.value)} placeholder="Vercel, Google Workspace…" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="ex-amount">Amount (incl. GST) *</Label>
          <Input id="ex-amount" type="number" step="0.01" min="0.01" className="mt-1.5" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ex-currency">Currency</Label>
          <SelectField id="ex-currency" className="mt-1.5" value={d.currency} onChange={(v) => set('currency', v as Currency)} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
        </div>
        <div>
          <Label htmlFor="ex-category">Category</Label>
          <SelectField id="ex-category" className="mt-1.5" value={d.category} onChange={(v) => set('category', v as ExpenseCategory)}
            options={CATEGORIES.map((c) => ({ value: c, label: EXPENSE_CATEGORY_LABELS[c] }))} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Switch id="ex-gst" checked={d.gstClaimable} onCheckedChange={(v) => set('gstClaimable', v)} />
        GST can be claimed (NZ supplier charged GST and you have the tax invoice)
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ex-project">For project (optional)</Label>
          <SelectField id="ex-project" className="mt-1.5" value={d.projectId || ''} noneLabel="General running cost" onChange={(v) => set('projectId', v || undefined)}
            options={projects.map((p) => ({ value: p.id, label: p.name }))} />
        </div>
        <div>
          <Label htmlFor="ex-contractor">Contractor (optional)</Label>
          <SelectField id="ex-contractor" className="mt-1.5" value={d.contractorId || ''} noneLabel="None" onChange={(v) => set('contractorId', v || undefined)}
            options={contractors.map((c) => ({ value: c.id, label: c.name }))} />
        </div>
      </div>
      <div>
        <Label htmlFor="ex-desc">What for</Label>
        <Input id="ex-desc" className="mt-1.5" value={d.description || ''} onChange={(e) => set('description', e.target.value)} />
      </div>
      <div>
        <Label htmlFor="ex-receipt">Receipt link</Label>
        <Input id="ex-receipt" type="url" className="mt-1.5" value={d.receiptUrl || ''} onChange={(e) => set('receiptUrl', e.target.value)} placeholder="Google Drive or Dropbox link to the receipt" />
      </div>
      <div>
        <Label htmlFor="ex-notes">Notes</Label>
        <Textarea id="ex-notes" rows={2} className="mt-1.5" value={d.notes || ''} onChange={(e) => set('notes', e.target.value)} />
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-accent hover:bg-accent/90">{initial ? 'Save' : 'Add expense'}</Button>
      </div>
    </form>
  );
}

// What the company spends: needed for profit, GST claims and project costs.
export default function ExpensesPage() {
  const { roles } = useAuth();
  const isAdmin = hasAccess(roles, 'admin');
  const { projects, company } = useAppStore();
  const { expenses, saveExpense, deleteExpense } = useMoney();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [month, setMonth] = useState('');
  const fallback = company.defaultCurrency || 'NZD';
  const [params, setParams] = useSearchParams();
  // /expenses?new=1 (from search) opens the add form.
  useEffect(() => {
    if (!params.get('new')) return;
    setEditing(null);
    setOpen(true);
    params.delete('new');
    setParams(params, { replace: true });
  }, [params, setParams]);

  const months = useMemo(() => Array.from(new Set(expenses.map((e) => e.spentOn.slice(0, 7)))).sort().reverse(), [expenses]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) =>
      (!category || e.category === category)
      && (!month || e.spentOn.startsWith(month))
      && (!q || `${e.supplier} ${e.description ?? ''}`.toLowerCase().includes(q)));
  }, [expenses, search, category, month]);
  const total = sumByCurrency(rows, (e) => e.amount, (e) => e.currency);

  return (
    <AppLayout>
      <PageHeader
        title="Expenses"
        description={`${rows.length} shown · ${formatTotals(total, fallback)}`}
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={() => downloadCsv(`oreece-expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows.map((e) => ({
              date: e.spentOn, supplier: e.supplier, description: e.description, category: EXPENSE_CATEGORY_LABELS[e.category], amount_incl_gst: e.amount,
              currency: e.currency, gst_claimable: e.gstClaimable ? 'yes' : 'no', project: projects.find((p) => p.id === e.projectId)?.name, receipt: e.receiptUrl,
            })))}>
              <Download className="h-4 w-4" />Export
            </Button>
            <Button className="gap-2 bg-accent hover:bg-accent/90" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" />Add expense</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search supplier or description" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" aria-label="Search expenses" />
        </div>
        <SelectField className="w-48" value={category} noneLabel="All categories" onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: EXPENSE_CATEGORY_LABELS[c] }))} />
        <SelectField className="w-40" value={month} noneLabel="All months" onChange={setMonth} options={months.map((m) => ({ value: m, label: format(parseISO(`${m}-01`), 'MMMM yyyy') }))} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"><Receipt className="h-8 w-8 text-muted-foreground" /></div>
            <p className="font-medium">No expenses here</p>
            <p className="text-sm text-muted-foreground">Record software, hosting and contractor costs to see real profit and GST.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date</TableHead>
                <TableHead>Paid to</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>GST</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{format(parseISO(e.spentOn), 'd MMM yyyy')}</TableCell>
                  <TableCell>
                    <span className="font-medium">{e.supplier}</span>
                    {(e.description || e.projectId) && <span className="block text-xs text-muted-foreground">{[e.description, projects.find((p) => p.id === e.projectId)?.name].filter(Boolean).join(' · ')}</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{EXPENSE_CATEGORY_LABELS[e.category]}</TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono">{formatMoney(e.amount, e.currency)}</TableCell>
                  <TableCell className="text-muted-foreground">{e.currency !== 'NZD' ? 'n/a' : e.gstClaimable ? 'Claim' : 'No'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {e.receiptUrl && <Button variant="ghost" size="icon" asChild aria-label="Open receipt"><a href={e.receiptUrl} target="_blank" rel="noreferrer"><Receipt className="h-4 w-4" /></a></Button>}
                      <Button variant="ghost" size="icon" aria-label={`Edit ${e.supplier} expense`} onClick={() => { setEditing(e); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      {isAdmin && <Button variant="ghost" size="icon" aria-label={`Delete ${e.supplier} expense`} onClick={() => deleteExpense(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit expense' : 'Add expense'}</DialogTitle>
            <DialogDescription>Keep the tax invoice or receipt for 7 years (IRD). Link it here.</DialogDescription>
          </DialogHeader>
          <ExpenseForm key={editing?.id ?? 'new'} initial={editing ?? undefined} onCancel={() => setOpen(false)}
            onSubmit={async (d) => { if (await saveExpense(d, editing?.id)) { setOpen(false); setEditing(null); } }} />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
