import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Briefcase, Plus, Star, Trash2, UserPlus } from 'lucide-react';
import {
  Button, Input, Label, Textarea, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@company-web/shared/ui';
import { supabase, Tables, TablesInsert } from '@company-web/shared/data-access';
import { cn } from '@company-web/shared/utils';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SelectField } from '@/components/crm/SelectField';
import { hqErrorMessage } from '@/hooks/useHqStore';
import { toast } from 'sonner';

// Hiring: open roles and candidates by stage. Founder only (RLS), because it
// holds people's personal information (Privacy Act 2020: collect only what you
// need, keep it only as long as you need it, delete unsuccessful applications).

type Stage = 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn';
const STAGES: { value: Stage; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Not progressing' },
  { value: 'withdrawn', label: 'Withdrew' },
];
const ACTIVE: Stage[] = ['new', 'screening', 'interview', 'offer'];
const EMPLOYMENT = [
  { value: 'full_time', label: 'Full time' }, { value: 'part_time', label: 'Part time' },
  { value: 'contract', label: 'Contract' }, { value: 'internship', label: 'Internship' },
];
const SOURCES = ['email', 'website', 'referral', 'linkedin', 'seek', 'other'].map((s) => ({ value: s, label: s === 'seek' ? 'SEEK' : s === 'linkedin' ? 'LinkedIn' : s[0].toUpperCase() + s.slice(1) }));

type Opening = Tables<'job_openings'>;
type Application = Tables<'job_applications'>;
const nul = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

export default function HiringPage() {
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const [adding, setAdding] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = apps.find((a) => a.id === viewingId);

  const load = useCallback(async () => {
    const [o, a] = await Promise.all([
      supabase.from('job_openings').select('*').order('created_at', { ascending: false }),
      supabase.from('job_applications').select('*').order('applied_on', { ascending: false }),
    ]);
    if (o.error || a.error) toast.error('Failed to load hiring');
    setOpenings(o.data || []);
    setApps(a.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (row: Partial<TablesInsert<'job_applications'>>, id?: string) => {
    const q = id ? supabase.from('job_applications').update(row).eq('id', id) : supabase.from('job_applications').insert(row as TablesInsert<'job_applications'>);
    const { data, error } = await q.select().single();
    if (error) { toast.error(hqErrorMessage(error, 'Failed to save')); return null; }
    setApps((prev) => (id ? prev.map((x) => (x.id === id ? data : x)) : [data, ...prev]));
    return data;
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from('job_applications').delete().eq('id', id);
    if (error) return toast.error(hqErrorMessage(error, 'Failed to delete'));
    setApps((prev) => prev.filter((x) => x.id !== id));
    setViewingId(null);
    toast.success('Application deleted');
  };

  const visible = useMemo(() => apps.filter((a) => (!roleFilter || a.opening_id === roleFilter) && (showClosed || ACTIVE.includes(a.stage as Stage))), [apps, roleFilter, showClosed]);
  const columns = showClosed ? STAGES : STAGES.filter((s) => ACTIVE.includes(s.value));

  return (
    <AppLayout>
      <PageHeader
        title="Hiring"
        description={(() => {
          const inProgress = apps.filter((a) => ACTIVE.includes(a.stage as Stage)).length;
          const open = openings.filter((o) => o.status === 'open').length;
          return `${inProgress} candidate${inProgress === 1 ? '' : 's'} in progress · ${open} open role${open === 1 ? '' : 's'}`;
        })()}
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={() => setAddingRole(true)}><Briefcase className="h-4 w-4" />Add role</Button>
            <Button className="gap-2 bg-accent hover:bg-accent/90" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add candidate</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SelectField className="w-72" value={roleFilter} noneLabel="All roles" onChange={setRoleFilter}
          options={openings.map((o) => ({ value: o.id, label: `${o.title}${o.status !== 'open' ? ` (${o.status})` : ''}` }))} />
        <button onClick={() => setShowClosed(!showClosed)} aria-pressed={showClosed}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${showClosed ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
          Show finished
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const items = visible.filter((a) => a.stage === col.value);
          return (
            <div key={col.value} className="w-64 shrink-0 rounded-xl border border-border bg-muted/30">
              <div className="flex items-center justify-between px-3 py-3">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2 px-2 pb-3" style={{ minHeight: 100 }}>
                {items.map((a) => (
                  <button key={a.id} onClick={() => setViewingId(a.id)} className="block w-full rounded-lg border border-border bg-card p-3 text-left text-sm shadow-sm hover:shadow-md">
                    <p className="font-medium">{a.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{openings.find((o) => o.id === a.opening_id)?.title || 'General'}</p>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{a.rating ? '★'.repeat(a.rating) : ''}</span>
                      <span className={cn(a.next_step_date && a.next_step_date <= format(new Date(), 'yyyy-MM-dd') && 'font-medium text-warning')}>
                        {a.next_step_date ? `${a.next_step || 'Next'} ${format(parseISO(a.next_step_date), 'd MMM')}` : `Applied ${format(parseISO(a.applied_on), 'd MMM')}`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Only the founder can see this screen. Delete candidates who don't progress once the role is filled. Check work rights before an offer.
      </p>

      <RoleDialog open={addingRole} onOpenChange={setAddingRole} onSaved={(o) => setOpenings((prev) => [o, ...prev])} />
      <CandidateDialog open={adding} onOpenChange={setAdding} openings={openings}
        onSubmit={async (row) => { if (await save(row)) { setAdding(false); toast.success('Candidate added'); } }} />

      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewingId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {viewing && <CandidateDetail key={viewing.id} app={viewing} openings={openings} onSave={(row) => save(row, viewing.id)} onDelete={() => remove(viewing.id)} />}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function RoleDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: (o: Opening) => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('full_time');
  const [location, setLocation] = useState('Auckland');
  const [description, setDescription] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add a role</DialogTitle>
          <DialogDescription>A role you're hiring for, so candidates can be grouped by it.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim()) return;
          const { data, error } = await supabase.from('job_openings').insert({ title: title.trim(), employment_type: type, location: nul(location), description: nul(description) }).select().single();
          if (error) return toast.error(hqErrorMessage(error, 'Failed to add the role'));
          onSaved(data);
          onOpenChange(false);
          setTitle('');
          setDescription('');
        }}>
          <div><Label htmlFor="jo-title">Title *</Label><Input id="jo-title" required className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Technical Business Development Representative" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="jo-type">Type</Label><SelectField id="jo-type" className="mt-1.5" value={type} onChange={setType} options={EMPLOYMENT} /></div>
            <div><Label htmlFor="jo-location">Location</Label><Input id="jo-location" className="mt-1.5" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          </div>
          <div><Label htmlFor="jo-desc">Notes</Label><Textarea id="jo-desc" rows={3} className="mt-1.5" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-accent hover:bg-accent/90">Add role</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CandidateDialog({ open, onOpenChange, openings, onSubmit }: {
  open: boolean; onOpenChange: (o: boolean) => void; openings: Opening[]; onSubmit: (row: Partial<TablesInsert<'job_applications'>>) => void;
}) {
  const [d, setD] = useState<Partial<TablesInsert<'job_applications'>>>({ source: 'email', applied_on: format(new Date(), 'yyyy-MM-dd') });
  const set = (k: keyof TablesInsert<'job_applications'>, v: string) => setD({ ...d, [k]: v });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add a candidate</DialogTitle>
          <DialogDescription>Copy the details from their application email. Link the CV rather than pasting it.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          if (!d.full_name?.trim()) return toast.error('Enter their name');
          onSubmit({ ...d, full_name: d.full_name.trim(), opening_id: d.opening_id || null, email: nul(d.email), phone: nul(d.phone), cv_url: nul(d.cv_url), linkedin_url: nul(d.linkedin_url), portfolio_url: nul(d.portfolio_url), work_rights: nul(d.work_rights), notes: nul(d.notes) });
          setD({ source: 'email', applied_on: format(new Date(), 'yyyy-MM-dd') });
        }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="ja-name">Full name *</Label><Input id="ja-name" required className="mt-1.5" value={d.full_name || ''} onChange={(e) => set('full_name', e.target.value)} /></div>
            <div><Label htmlFor="ja-role">Role</Label><SelectField id="ja-role" className="mt-1.5" value={d.opening_id || ''} noneLabel="General" onChange={(v) => set('opening_id', v)} options={openings.filter((o) => o.status !== 'closed').map((o) => ({ value: o.id, label: o.title }))} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="ja-email">Email</Label><Input id="ja-email" type="email" className="mt-1.5" value={d.email || ''} onChange={(e) => set('email', e.target.value)} /></div>
            <div><Label htmlFor="ja-phone">Phone</Label><Input id="ja-phone" className="mt-1.5" value={d.phone || ''} onChange={(e) => set('phone', e.target.value)} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><Label htmlFor="ja-source">Came from</Label><SelectField id="ja-source" className="mt-1.5" value={d.source || 'email'} onChange={(v) => set('source', v)} options={SOURCES} /></div>
            <div><Label htmlFor="ja-applied">Applied on</Label><Input id="ja-applied" type="date" className="mt-1.5" value={d.applied_on || ''} onChange={(e) => set('applied_on', e.target.value)} /></div>
            <div><Label htmlFor="ja-rights">Work rights</Label><Input id="ja-rights" className="mt-1.5" value={d.work_rights || ''} onChange={(e) => set('work_rights', e.target.value)} placeholder="Resident, student visa…" /></div>
          </div>
          <div><Label htmlFor="ja-cv">CV link</Label><Input id="ja-cv" type="url" className="mt-1.5" value={d.cv_url || ''} onChange={(e) => set('cv_url', e.target.value)} placeholder="Google Drive link" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="ja-linkedin">LinkedIn</Label><Input id="ja-linkedin" type="url" className="mt-1.5" value={d.linkedin_url || ''} onChange={(e) => set('linkedin_url', e.target.value)} /></div>
            <div><Label htmlFor="ja-portfolio">Portfolio</Label><Input id="ja-portfolio" type="url" className="mt-1.5" value={d.portfolio_url || ''} onChange={(e) => set('portfolio_url', e.target.value)} /></div>
          </div>
          <div><Label htmlFor="ja-notes">First impressions</Label><Textarea id="ja-notes" rows={3} className="mt-1.5" value={d.notes || ''} onChange={(e) => set('notes', e.target.value)} /></div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-accent hover:bg-accent/90">Add candidate</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CandidateDetail({ app, openings, onSave, onDelete }: {
  app: Application; openings: Opening[]; onSave: (row: Partial<TablesInsert<'job_applications'>>) => Promise<unknown>; onDelete: () => void;
}) {
  const [notes, setNotes] = useState(app.notes || '');
  const [nextStep, setNextStep] = useState(app.next_step || '');
  const [nextDate, setNextDate] = useState(app.next_step_date || '');
  const links = [['CV', app.cv_url], ['LinkedIn', app.linkedin_url], ['Portfolio', app.portfolio_url]].filter(([, u]) => u) as [string, string][];
  return (
    <>
      <SheetHeader><SheetTitle>{app.full_name}</SheetTitle></SheetHeader>
      <p className="mt-1 text-sm text-muted-foreground">{openings.find((o) => o.id === app.opening_id)?.title || 'General application'} · applied {format(parseISO(app.applied_on), 'd MMM yyyy')}</p>
      <dl className="mt-4 grid grid-cols-[110px_1fr] gap-y-2 text-sm">
        {app.email && <><dt className="text-muted-foreground">Email</dt><dd><a href={`mailto:${app.email}`} className="hover:underline">{app.email}</a></dd></>}
        {app.phone && <><dt className="text-muted-foreground">Phone</dt><dd>{app.phone}</dd></>}
        {app.work_rights && <><dt className="text-muted-foreground">Work rights</dt><dd>{app.work_rights}</dd></>}
        {links.length > 0 && <><dt className="text-muted-foreground">Links</dt><dd className="flex gap-3">{links.map(([l, u]) => <a key={l} href={u} target="_blank" rel="noreferrer" className="text-accent hover:underline">{l}</a>)}</dd></>}
      </dl>

      <div className="mt-6 space-y-4">
        <div>
          <Label>Stage</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <Button key={s.value} size="sm" variant={app.stage === s.value ? 'default' : 'outline'} disabled={app.stage === s.value} onClick={() => onSave({ stage: s.value })}>{s.label}</Button>
            ))}
          </div>
          {app.stage === 'hired' && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-success/10 p-3 text-sm">
              <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>Next: send the written employment agreement, ask them to sign up to HQ, give them a role in <Link to="/settings" className="underline">Settings → Team</Link>, then start their <Link to="/onboarding" className="underline">onboarding plan</Link>.</span>
            </p>
          )}
        </div>
        <div>
          <Label>Rating</Label>
          <div className="mt-1.5 flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} role="radio" aria-checked={app.rating === n} aria-label={`${n} star${n === 1 ? '' : 's'}`} onClick={() => onSave({ rating: app.rating === n ? null : n })}>
                <Star className={cn('h-5 w-5', (app.rating || 0) >= n ? 'fill-warning text-warning' : 'text-muted-foreground')} />
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
          <div><Label htmlFor="ja-next">Next step</Label><Input id="ja-next" className="mt-1.5" value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="Phone screen" /></div>
          <div><Label htmlFor="ja-next-date">When</Label><Input id="ja-next-date" type="date" className="mt-1.5" value={nextDate} onChange={(e) => setNextDate(e.target.value)} /></div>
        </div>
        <div><Label htmlFor="ja-detail-notes">Notes</Label><Textarea id="ja-detail-notes" rows={5} className="mt-1.5" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <div className="flex justify-between">
          <Button variant="ghost" className="gap-2 text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" />Delete</Button>
          <Button className="bg-accent hover:bg-accent/90" onClick={async () => { if (await onSave({ notes: nul(notes), next_step: nul(nextStep), next_step_date: nextDate || null })) toast.success('Saved'); }}>Save</Button>
        </div>
      </div>
    </>
  );
}
