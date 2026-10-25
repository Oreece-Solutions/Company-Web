import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Server, Plus, Pencil, Trash2, ExternalLink, Upload } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Textarea,
  Switch,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@company-web/shared/ui';
import { useHq } from '@/contexts/HqContext';
import { useAppStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SelectField } from '@/components/crm/SelectField';
import { CsvImportDialog } from '@/components/hq/CsvImportDialog';
import { CURRENCIES, Currency } from '@/types/invoice';
import { ClientSystem, ClientSystemInput, SystemKind, SystemStatus, SYSTEM_KIND_LABELS, SYSTEM_STATUS_LABELS } from '@/types/hq';
import { formatMoney } from '@/lib/money';

const OWN = '__oreece__';
const BLANK: ClientSystemInput = {
  clientId: '', kind: 'website', name: '', url: '', provider: '', status: 'live', renewsOn: '', renewalCost: undefined,
  currency: 'NZD', paidBy: 'client', onCarePlan: false, notes: '',
};

function SystemForm({ initial, onSubmit, onCancel }: { initial?: ClientSystem; onSubmit: (d: ClientSystemInput) => void; onCancel: () => void }) {
  const { clients } = useAppStore();
  const [d, setD] = useState<ClientSystemInput>(initial ? { ...initial } : BLANK);
  const [cost, setCost] = useState(initial?.renewalCost?.toString() ?? '');
  const set = <K extends keyof ClientSystemInput>(k: K, v: ClientSystemInput[K]) => setD({ ...d, [k]: v });

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (d.name.trim()) onSubmit({ ...d, renewalCost: cost.trim() === '' ? undefined : Number(cost) }); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sys-client">Belongs to</Label>
          <SelectField id="sys-client" className="mt-1.5" value={d.clientId || OWN} onChange={(v) => set('clientId', v === OWN ? '' : v)}
            options={[{ value: OWN, label: 'Oreece (our own)' }, ...clients.map((c) => ({ value: c.id, label: c.companyName || c.name }))]} />
        </div>
        <div>
          <Label htmlFor="sys-kind">Kind</Label>
          <SelectField id="sys-kind" className="mt-1.5" value={d.kind} onChange={(v) => set('kind', v as SystemKind)}
            options={(Object.keys(SYSTEM_KIND_LABELS) as SystemKind[]).map((k) => ({ value: k, label: SYSTEM_KIND_LABELS[k] }))} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sys-name">Name *</Label>
          <Input id="sys-name" required className="mt-1.5" value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="pristinemovers.co.nz" />
        </div>
        <div>
          <Label htmlFor="sys-url">URL</Label>
          <Input id="sys-url" className="mt-1.5" value={d.url || ''} onChange={(e) => set('url', e.target.value)} placeholder="https://…" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sys-provider">Provider</Label>
          <Input id="sys-provider" className="mt-1.5" value={d.provider || ''} onChange={(e) => set('provider', e.target.value)} placeholder="Vercel, Crazy Domains, Supabase…" />
        </div>
        <div>
          <Label htmlFor="sys-status">Status</Label>
          <SelectField id="sys-status" className="mt-1.5" value={d.status} onChange={(v) => set('status', v as SystemStatus)}
            options={(Object.keys(SYSTEM_STATUS_LABELS) as SystemStatus[]).map((s) => ({ value: s, label: SYSTEM_STATUS_LABELS[s] }))} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Label htmlFor="sys-renews">Renews on</Label>
          <Input id="sys-renews" type="date" className="mt-1.5" value={d.renewsOn || ''} onChange={(e) => set('renewsOn', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="sys-cost">Renewal cost</Label>
          <Input id="sys-cost" type="number" step="0.01" min="0" className="mt-1.5" value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="sys-currency">Currency</Label>
          <SelectField id="sys-currency" className="mt-1.5" value={d.currency} onChange={(v) => set('currency', v as Currency)}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
        </div>
      </div>
      <div className="flex flex-wrap gap-6">
        <div className="w-48">
          <Label htmlFor="sys-paid">Renewal paid by</Label>
          <SelectField id="sys-paid" className="mt-1.5" value={d.paidBy} onChange={(v) => set('paidBy', v as ClientSystem['paidBy'])}
            options={[{ value: 'client', label: 'Client' }, { value: 'oreece', label: 'Oreece' }]} />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm"><Switch id="sys-care" checked={d.onCarePlan} onCheckedChange={(v) => set('onCarePlan', v)} />On a care plan</label>
      </div>
      <div>
        <Label htmlFor="sys-notes">Notes</Label>
        <Textarea id="sys-notes" rows={2} className="mt-1.5" value={d.notes || ''} onChange={(e) => set('notes', e.target.value)}
          placeholder="Where things live (e.g. 'secrets in Vercel env'). Never paste passwords or keys." />
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-accent hover:bg-accent/90">{initial ? 'Save' : 'Add system'}</Button>
      </div>
    </form>
  );
}

export default function SystemsPage() {
  const { systems, saveSystem, deleteSystem } = useHq();
  const { clients, getClient } = useAppStore();
  const [editing, setEditing] = useState<ClientSystem | null>(null);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [owner, setOwner] = useState('');
  const now = new Date();

  const groups = useMemo(() => {
    const visible = systems.filter((s) => !owner || (owner === OWN ? !s.clientId : s.clientId === owner));
    const byOwner = new Map<string, ClientSystem[]>();
    for (const s of visible) byOwner.set(s.clientId || OWN, [...(byOwner.get(s.clientId || OWN) || []), s]);
    return [...byOwner.entries()]
      .map(([id, items]) => ({ id, name: id === OWN ? 'Oreece' : getClient(id)?.companyName || getClient(id)?.name || 'Unknown client', items }))
      .sort((a, b) => (a.id === OWN ? -1 : b.id === OWN ? 1 : a.name.localeCompare(b.name)));
  }, [systems, owner, getClient]);

  const carePlans = new Set(systems.filter((s) => s.onCarePlan && s.clientId).map((s) => s.clientId)).size;
  const clientsWithSites = new Set(systems.filter((s) => s.clientId && ['website', 'web_app'].includes(s.kind) && s.status === 'live').map((s) => s.clientId));

  return (
    <AppLayout>
      <PageHeader
        title="Systems & renewals"
        description="Every website, domain, host and repo we look after, and when it renews."
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" />Import CSV</Button>
            <Button className="gap-2 bg-accent hover:bg-accent/90" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" />Add system</Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="w-64">
          <Label htmlFor="sys-filter">Show</Label>
          <SelectField id="sys-filter" className="mt-1.5" value={owner} onChange={setOwner} noneLabel="Everyone"
            options={[{ value: OWN, label: 'Oreece only' }, ...clients.map((c) => ({ value: c.id, label: c.companyName || c.name }))]} />
        </div>
        <p className="text-sm text-muted-foreground">
          {clientsWithSites.size} client{clientsWithSites.size === 1 ? '' : 's'} with a live site · {carePlans} on a care plan
          {clientsWithSites.size > carePlans && <span className="text-warning"> · {clientsWithSites.size - carePlans} could be offered one</span>}
        </p>
      </div>

      {systems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center shadow-card">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"><Server className="h-8 w-8 text-muted-foreground" /></div>
          <p className="font-medium">No systems recorded</p>
          <p className="max-w-sm text-sm text-muted-foreground">Add your sites, domains and hosting so renewals never surprise you or a client.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.id}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {g.id === OWN ? g.name : <Link to={`/clients/${g.id}`} className="hover:underline">{g.name}</Link>}
              </h2>
              <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
                <table className="w-full min-w-[720px] text-sm">
                  <tbody className="divide-y divide-border">
                    {g.items.map((s) => {
                      const days = s.renewsOn ? differenceInCalendarDays(parseISO(s.renewsOn), now) : undefined;
                      return (
                        <tr key={s.id} className="align-top">
                          <td className="w-[34%] px-4 py-3">
                            <p className="font-medium">{s.name}</p>
                            {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">{s.url.replace(/^https?:\/\//, '')}<ExternalLink className="h-3 w-3" /></a>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{SYSTEM_KIND_LABELS[s.kind]}{s.provider ? ` · ${s.provider}` : ''}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'live' ? 'bg-success/10 text-success' : s.status === 'building' ? 'bg-info/10 text-info' : 'bg-muted text-muted-foreground'}`}>{SYSTEM_STATUS_LABELS[s.status]}</span>
                            {s.onCarePlan && <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">Care plan</span>}
                          </td>
                          <td className="px-4 py-3">
                            {s.renewsOn ? (
                              <>
                                <p className={days !== undefined && days < 0 ? 'font-medium text-destructive' : days !== undefined && days <= 30 ? 'font-medium text-warning' : ''}>
                                  {format(parseISO(s.renewsOn), 'd MMM yyyy')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {days !== undefined && (days < 0 ? `${-days} days ago` : `in ${days} days`)}
                                  {s.renewalCost !== undefined && ` · ${formatMoney(s.renewalCost, s.currency)} (${s.paidBy === 'client' ? 'client pays' : 'we pay'})`}
                                </p>
                              </>
                            ) : <span className="text-muted-foreground">No renewal date</span>}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Button variant="ghost" size="icon" aria-label={`Edit ${s.name}`} onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" aria-label={`Delete ${s.name}`} onClick={() => deleteSystem(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add system'}</DialogTitle>
            <DialogDescription>Record where it lives and when it renews. Secrets stay in your password manager or provider settings.</DialogDescription>
          </DialogHeader>
          <SystemForm key={editing?.id ?? 'new'} initial={editing ?? undefined} onCancel={() => setOpen(false)}
            onSubmit={async (d) => { if (await saveSystem(d, editing?.id)) { setOpen(false); setEditing(null); } }} />
        </DialogContent>
      </Dialog>

      <CsvImportDialog<ClientSystemInput>
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import systems"
        description="Columns: client (company name, or blank for Oreece), kind, name, url, provider, status, renews_on (YYYY-MM-DD), renewal_cost, paid_by, on_care_plan, notes."
        parseRow={(r) => {
          if (!r.name) return { ok: false, label: '', error: 'No name' };
          const kind = (r.kind || 'website') as SystemKind;
          if (!(kind in SYSTEM_KIND_LABELS)) return { ok: false, label: r.name, error: `Unknown kind "${r.kind}"` };
          const status = (r.status || 'live') as SystemStatus;
          if (!(status in SYSTEM_STATUS_LABELS)) return { ok: false, label: r.name, error: `Unknown status "${r.status}"` };
          let clientId = '';
          if (r.client) {
            const match = clients.find((c) => [c.companyName, c.name].some((n) => n?.toLowerCase() === r.client.toLowerCase()));
            if (!match) return { ok: false, label: r.name, error: `No client called "${r.client}" (import clients first)` };
            clientId = match.id;
          }
          return {
            ok: true,
            label: r.name,
            data: {
              clientId, kind, status, name: r.name, url: r.url, provider: r.provider,
              renewsOn: /^\d{4}-\d{2}-\d{2}$/.test(r.renews_on || '') ? r.renews_on : '',
              renewalCost: r.renewal_cost ? Number(r.renewal_cost) : undefined,
              currency: (r.currency || 'NZD') as Currency,
              paidBy: r.paid_by === 'oreece' ? 'oreece' : 'client',
              onCarePlan: /^(yes|true|1)$/i.test(r.on_care_plan || ''),
              notes: r.notes,
            },
          };
        }}
        saveRow={async (d) => ((await saveSystem(d)) ? null : 'Could not save (see message)')}
      />
    </AppLayout>
  );
}
