import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Clock, Trash2 } from 'lucide-react';
import { Button, Input, Label, Switch } from '@company-web/shared/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/contexts/StoreContext';
import { useDelivery } from '@/contexts/DeliveryContext';
import { useMoney } from '@/contexts/MoneyContext';
import { useSalesDept } from '@/contexts/SalesDeptContext';
import { SelectField } from '@/components/crm/SelectField';
import { hasAccess } from '@/lib/access';
import { formatMoney, formatTotals, sumByCurrency } from '@/lib/money';
import { formatMinutes } from '@/types/delivery';
import { Currency } from '@/types/invoice';
import { toast } from 'sonner';

// Time logged on a project and whether the project made money:
// invoiced minus project expenses, and what that works out to per hour.
export function ProjectTimeProfit({ projectId }: { projectId: string }) {
  const { user, roles } = useAuth();
  const isAdmin = hasAccess(roles, 'admin');
  const canSell = hasAccess(roles, 'sell');
  const canBill = hasAccess(roles, 'bill');
  const { invoices, getTasksForProject, company } = useAppStore();
  const { timeEntries, saveTime, deleteTime } = useDelivery();
  const { expenses } = useMoney();
  const { memberName } = useSalesDept();
  const [hours, setHours] = useState('');
  const [workedOn, setWorkedOn] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [taskId, setTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [billable, setBillable] = useState(true);
  const fallback = (company.defaultCurrency || 'NZD') as Currency;

  const entries = timeEntries.filter((t) => t.projectId === projectId);
  const tasks = getTasksForProject(projectId);
  const totalMinutes = entries.reduce((n, t) => n + t.minutes, 0);
  const billableMinutes = entries.filter((t) => t.billable).reduce((n, t) => n + t.minutes, 0);
  const projectInvoices = invoices.filter((inv) => inv.projectId === projectId);
  const invoiced = sumByCurrency(projectInvoices, (inv) => inv.total, (inv) => inv.currency);
  const costs = sumByCurrency(expenses.filter((e) => e.projectId === projectId), (e) => e.amount, (e) => e.currency);
  const currencies = Array.from(new Set([...invoiced, ...costs].map((t) => t.currency)));
  const margin = currencies.map((c) => ({
    currency: c,
    total: (invoiced.find((t) => t.currency === c)?.total ?? 0) - (costs.find((t) => t.currency === c)?.total ?? 0),
  }));
  // Per-hour figure only makes sense in a single currency.
  const perHour = margin.length === 1 && totalMinutes > 0 ? margin[0].total / (totalMinutes / 60) : undefined;

  const log = async (e: React.FormEvent) => {
    e.preventDefault();
    const minutes = Math.round(Number(hours) * 60);
    if (!(minutes > 0 && minutes <= 1440)) return toast.error('Enter the hours worked (for example 1.5)');
    const saved = await saveTime({ projectId, taskId: taskId || undefined, workedOn, minutes, description, billable });
    if (saved) {
      setHours('');
      setDescription('');
      toast.success(`${formatMinutes(minutes)} logged`);
    }
  };

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Clock className="h-5 w-5 text-accent" />Time & profit</h2>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Time logged</p>
          <p className="mt-1 text-xl font-semibold">{formatMinutes(totalMinutes)}</p>
          <p className="text-xs text-muted-foreground">{formatMinutes(billableMinutes)} billable</p>
        </div>
        {canBill && (
          <>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoiced</p>
              <p className="mt-1 font-mono text-xl font-semibold">{formatTotals(invoiced, fallback)}</p>
              <p className="text-xs text-muted-foreground">{projectInvoices.length} invoice{projectInvoices.length === 1 ? '' : 's'}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Project costs</p>
              <p className="mt-1 font-mono text-xl font-semibold">{formatTotals(costs, fallback)}</p>
              <p className="text-xs text-muted-foreground">Expenses linked to this project</p>
            </div>
            <div className="rounded-lg border-2 border-accent/30 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Margin</p>
              <p className="mt-1 font-mono text-xl font-semibold">{formatTotals(margin, fallback)}</p>
              <p className="text-xs text-muted-foreground">{perHour !== undefined ? `${formatMoney(perHour, margin[0].currency)} per hour worked` : margin.length === 0 ? 'Invoice the project to see its margin' : margin.length > 1 ? 'Several currencies, so no hourly figure' : 'Log time to see the hourly figure'}</p>
            </div>
          </>
        )}
      </div>

      {canSell && (
        <form onSubmit={log} className="mb-5 grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[110px_140px_1fr_1fr_auto] sm:items-end">
          <div>
            <Label htmlFor="tt-hours" className="text-xs">Hours</Label>
            <Input id="tt-hours" type="number" step="0.25" min="0.25" max="24" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="1.5" />
          </div>
          <div>
            <Label htmlFor="tt-date" className="text-xs">Date</Label>
            <Input id="tt-date" type="date" value={workedOn} onChange={(e) => setWorkedOn(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="tt-task" className="text-xs">Task</Label>
            <SelectField id="tt-task" value={taskId} noneLabel="General" onChange={setTaskId} options={tasks.map((t) => ({ value: t.id, label: t.title }))} />
          </div>
          <div>
            <Label htmlFor="tt-desc" className="text-xs">What you did</Label>
            <Input id="tt-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs"><Switch checked={billable} onCheckedChange={setBillable} aria-label="Billable" />Billable</label>
            <Button type="submit" className="bg-accent hover:bg-accent/90">Log time</Button>
          </div>
        </form>
      )}

      {entries.length === 0 ? <p className="text-sm text-muted-foreground">No time logged yet.</p> : (
        <ul className="divide-y divide-border text-sm">
          {entries.slice(0, 20).map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2">
              <span className="w-24 shrink-0 text-muted-foreground">{format(parseISO(t.workedOn), 'd MMM')}</span>
              <span className="w-16 shrink-0 font-medium">{formatMinutes(t.minutes)}</span>
              <span className="min-w-0 flex-1 truncate">
                {t.description || tasks.find((x) => x.id === t.taskId)?.title || 'General'}
                {!t.billable && <span className="ml-2 text-xs text-muted-foreground">(not billable)</span>}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{memberName(t.userId)}</span>
              {(t.userId === user?.id || isAdmin) && (
                <Button variant="ghost" size="icon" aria-label="Delete time entry" onClick={() => deleteTime(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
