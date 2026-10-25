import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { HardHat, Plus, Pencil, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
import { CURRENCIES, Currency } from '@/types/invoice';
import { Contractor, ContractorInput, RateUnit } from '@/types/hq';
import { TASK_STATUS_LABELS } from '@/types/project';
import { formatMoney } from '@/lib/money';

const BLANK: ContractorInput = {
  name: '', skills: [], email: '', phone: '', location: '', rate: undefined, rateUnit: 'hour', currency: 'NZD',
  agreementSignedOn: '', confidentialitySigned: false, ipAssignmentSigned: false, active: true, notes: '',
};

function ContractorForm({ initial, onSubmit, onCancel }: { initial?: Contractor; onSubmit: (d: ContractorInput) => void; onCancel: () => void }) {
  const [d, setD] = useState<ContractorInput>(initial ? { ...initial } : BLANK);
  const [skills, setSkills] = useState((initial?.skills || []).join(', '));
  const [rate, setRate] = useState(initial?.rate?.toString() ?? '');
  const set = <K extends keyof ContractorInput>(k: K, v: ContractorInput[K]) => setD({ ...d, [k]: v });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!d.name.trim()) return;
        onSubmit({ ...d, skills: skills.split(','), rate: rate.trim() === '' ? undefined : Number(rate) });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ct-name">Name *</Label>
          <Input id="ct-name" required className="mt-1.5" value={d.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ct-skills">Skills (comma separated)</Label>
          <Input id="ct-skills" className="mt-1.5" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, Supabase, design" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="ct-email">Email</Label>
          <Input id="ct-email" type="email" className="mt-1.5" value={d.email || ''} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ct-phone">Phone</Label>
          <Input id="ct-phone" className="mt-1.5" value={d.phone || ''} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ct-location">Location</Label>
          <Input id="ct-location" className="mt-1.5" value={d.location || ''} onChange={(e) => set('location', e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="ct-rate">Rate</Label>
          <Input id="ct-rate" type="number" step="0.01" min="0" className="mt-1.5" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ct-unit">Per</Label>
          <SelectField id="ct-unit" className="mt-1.5" value={d.rateUnit} onChange={(v) => set('rateUnit', v as RateUnit)}
            options={[{ value: 'hour', label: 'Hour' }, { value: 'day', label: 'Day' }, { value: 'fixed', label: 'Fixed per job' }]} />
        </div>
        <div>
          <Label htmlFor="ct-currency">Currency</Label>
          <SelectField id="ct-currency" className="mt-1.5" value={d.currency} onChange={(v) => set('currency', v as Currency)}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
        </div>
      </div>
      <div className="rounded-lg border border-border p-3">
        <p className="mb-3 text-sm font-medium">Paperwork</p>
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <div>
            <Label htmlFor="ct-agreement">Agreement signed on</Label>
            <Input id="ct-agreement" type="date" className="mt-1.5" value={d.agreementSignedOn || ''} onChange={(e) => set('agreementSignedOn', e.target.value)} />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-sm"><Switch id="ct-conf" checked={d.confidentialitySigned} onCheckedChange={(v) => set('confidentialitySigned', v)} />Confidentiality covered</label>
            <label className="flex items-center gap-2 text-sm"><Switch id="ct-ip" checked={d.ipAssignmentSigned} onCheckedChange={(v) => set('ipAssignmentSigned', v)} />IP assigned to Oreece on payment</label>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Contractor vs employee is a legal question. Get NZ advice for ongoing or full-time arrangements.</p>
      </div>
      <div>
        <Label htmlFor="ct-notes">Notes</Label>
        <Textarea id="ct-notes" rows={2} className="mt-1.5" value={d.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="No passwords here. Share access through a password manager." />
      </div>
      <label className="flex items-center gap-2 text-sm"><Switch id="ct-active" checked={d.active} onCheckedChange={(v) => set('active', v)} />Currently working with Oreece</label>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-accent hover:bg-accent/90">{initial ? 'Save' : 'Add contractor'}</Button>
      </div>
    </form>
  );
}

export default function ContractorsPage() {
  const { contractors, saveContractor, deleteContractor } = useHq();
  const { tasks, projects } = useAppStore();
  const [editing, setEditing] = useState<Contractor | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <AppLayout>
      <PageHeader
        title="Contractors"
        description="Who delivers what, on which terms. Assign tasks with a brief from a project's task board."
        actions={<Button className="gap-2 bg-accent hover:bg-accent/90" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" />Add contractor</Button>}
      />

      {contractors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center shadow-card">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"><HardHat className="h-8 w-8 text-muted-foreground" /></div>
          <p className="font-medium">No contractors yet</p>
          <p className="text-sm text-muted-foreground">Add the people you work with to assign them task briefs.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {contractors.map((c) => {
            const open = tasks.filter((t) => t.contractorId === c.id && t.status !== 'done');
            const paperworkOk = !!c.agreementSignedOn && c.confidentialitySigned && c.ipAssignmentSigned;
            return (
              <div key={c.id} className={`rounded-xl border border-border bg-card p-5 shadow-card ${c.active ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">{c.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[c.skills.join(', '), c.location, c.rate !== undefined ? `${formatMoney(c.rate, c.currency)} / ${c.rateUnit === 'fixed' ? 'job' : c.rateUnit}` : undefined].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${c.name}`} onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${c.name}`} onClick={() => deleteContractor(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <p className={`mt-3 flex items-center gap-2 text-sm ${paperworkOk ? 'text-success' : 'text-warning'}`}>
                  {paperworkOk ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {paperworkOk
                    ? `Agreement signed ${format(parseISO(c.agreementSignedOn!), 'd MMM yyyy')}`
                    : `Missing: ${[!c.agreementSignedOn && 'agreement', !c.confidentialitySigned && 'confidentiality', !c.ipAssignmentSigned && 'IP assignment'].filter(Boolean).join(', ')}`}
                </p>
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Open tasks ({open.length})</p>
                  {open.length === 0 ? <p className="text-sm text-muted-foreground">Nothing assigned.</p> : (
                    <ul className="space-y-2">
                      {open.map((t) => {
                        const project = projects.find((p) => p.id === t.projectId);
                        return (
                          <li key={t.id} className="rounded-lg border border-border p-3 text-sm">
                            <Link to={`/projects/${t.projectId}`} className="font-medium hover:underline">{t.title}</Link>
                            <p className="text-xs text-muted-foreground">
                              {[project?.name, TASK_STATUS_LABELS[t.status], t.dueDate && `due ${format(parseISO(t.dueDate), 'd MMM')}`].filter(Boolean).join(' · ')}
                            </p>
                            {t.definitionOfDone && <p className="mt-1 text-xs"><span className="text-muted-foreground">Done when: </span>{t.definitionOfDone}</p>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add contractor'}</DialogTitle>
            <DialogDescription>Record terms and paperwork. Never store passwords or bank details here.</DialogDescription>
          </DialogHeader>
          <ContractorForm key={editing?.id ?? 'new'} initial={editing ?? undefined} onCancel={() => setOpen(false)}
            onSubmit={async (d) => { if (await saveContractor(d, editing?.id)) { setOpen(false); setEditing(null); } }} />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
