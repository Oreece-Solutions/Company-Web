import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { LifeBuoy, Plus, Trash2 } from 'lucide-react';
import {
  Button, Input, Label, Switch, Textarea, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@company-web/shared/ui';
import { cn } from '@company-web/shared/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/contexts/StoreContext';
import { useHq } from '@/contexts/HqContext';
import { useDelivery } from '@/contexts/DeliveryContext';
import { useSalesDept } from '@/contexts/SalesDeptContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SelectField } from '@/components/crm/SelectField';
import { hasAccess } from '@/lib/access';
import {
  RESPONSE_TARGET_HOURS, SUPPORT_CHANNEL_LABELS, SUPPORT_PRIORITY_LABELS, SUPPORT_STATUS_LABELS,
  SupportChannel, SupportPriority, SupportRequest, SupportRequestInput, SupportStatus, responseDue,
} from '@/types/delivery';
import { toast } from 'sonner';

const PRIORITY_TONE: Record<SupportPriority, string> = { urgent: 'bg-destructive/10 text-destructive', normal: 'bg-muted text-foreground', low: 'bg-muted text-muted-foreground' };
const STATUSES = Object.keys(SUPPORT_STATUS_LABELS) as SupportStatus[];

function NewRequestForm({ onSubmit, onCancel }: { onSubmit: (d: SupportRequestInput) => void; onCancel: () => void }) {
  const { user } = useAuth();
  const { clients, projects } = useAppStore();
  const { systems } = useHq();
  const { team } = useSalesDept();
  const [d, setD] = useState<SupportRequestInput>({
    clientId: '', title: '', channel: 'email', priority: 'normal', status: 'open', billable: false, assignedTo: user?.id,
  });
  const set = <K extends keyof SupportRequestInput>(k: K, v: SupportRequestInput[K]) => setD({ ...d, [k]: v });
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      if (!d.clientId) return toast.error('Choose the client');
      if (!d.title.trim()) return toast.error('Say what the problem is');
      onSubmit(d);
    }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sr-client">Client *</Label>
          <SelectField id="sr-client" className="mt-1.5" value={d.clientId} placeholder="Choose a client" onChange={(v) => set('clientId', v)}
            options={clients.map((c) => ({ value: c.id, label: c.companyName || c.name }))} />
        </div>
        <div>
          <Label htmlFor="sr-reporter">Reported by</Label>
          <Input id="sr-reporter" className="mt-1.5" value={d.reportedBy || ''} onChange={(e) => set('reportedBy', e.target.value)} placeholder="Name of the person at the client" />
        </div>
      </div>
      <div>
        <Label htmlFor="sr-title">Problem *</Label>
        <Input id="sr-title" required className="mt-1.5" value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="Contact form not sending emails" />
      </div>
      <div>
        <Label htmlFor="sr-details">Details</Label>
        <Textarea id="sr-details" rows={3} className="mt-1.5" value={d.details || ''} onChange={(e) => set('details', e.target.value)} placeholder="What happens, since when, on which page" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="sr-priority">Priority</Label>
          <SelectField id="sr-priority" className="mt-1.5" value={d.priority} onChange={(v) => set('priority', v as SupportPriority)}
            options={(Object.keys(SUPPORT_PRIORITY_LABELS) as SupportPriority[]).map((p) => ({ value: p, label: `${SUPPORT_PRIORITY_LABELS[p]} (reply within ${RESPONSE_TARGET_HOURS[p]}h)` }))} />
        </div>
        <div>
          <Label htmlFor="sr-channel">Came in by</Label>
          <SelectField id="sr-channel" className="mt-1.5" value={d.channel} onChange={(v) => set('channel', v as SupportChannel)}
            options={(Object.keys(SUPPORT_CHANNEL_LABELS) as SupportChannel[]).map((c) => ({ value: c, label: SUPPORT_CHANNEL_LABELS[c] }))} />
        </div>
        <div>
          <Label htmlFor="sr-assignee">Who handles it</Label>
          <SelectField id="sr-assignee" className="mt-1.5" value={d.assignedTo || ''} noneLabel="Nobody yet" onChange={(v) => set('assignedTo', v || undefined)}
            options={team.map((m) => ({ value: m.userId, label: m.fullName || 'Team member' }))} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sr-project">Project</Label>
          <SelectField id="sr-project" className="mt-1.5" value={d.projectId || ''} noneLabel="None" onChange={(v) => set('projectId', v || undefined)}
            options={projects.filter((p) => !d.clientId || p.clientId === d.clientId).map((p) => ({ value: p.id, label: p.name }))} />
        </div>
        <div>
          <Label htmlFor="sr-system">System</Label>
          <SelectField id="sr-system" className="mt-1.5" value={d.systemId || ''} noneLabel="None" onChange={(v) => set('systemId', v || undefined)}
            options={systems.filter((s) => !d.clientId || s.clientId === d.clientId).map((s) => ({ value: s.id, label: s.name }))} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm"><Switch checked={d.billable} onCheckedChange={(v) => set('billable', v)} />Bill separately (not covered by a retainer)</label>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-accent hover:bg-accent/90">Log request</Button>
      </div>
    </form>
  );
}

// Client problems after go-live: who's on it, how fast the client heard back,
// and what fixed it.
export default function SupportPage() {
  const { user, roles } = useAuth();
  const isAdmin = hasAccess(roles, 'admin');
  const canSell = hasAccess(roles, 'sell');
  const { getClient } = useAppStore();
  const { supportRequests, saveSupport, deleteSupport } = useDelivery();
  const { memberName } = useSalesDept();
  const [show, setShow] = useState<'open' | 'mine' | 'resolved' | 'all'>('open');
  const [adding, setAdding] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const viewing = supportRequests.find((r) => r.id === viewingId);
  const now = new Date();
  const [params, setParams] = useSearchParams();
  // /support?new=1 opens the form; /support?open=<id> opens a request (from My work).
  useEffect(() => {
    if (params.get('new')) setAdding(true);
    const id = params.get('open');
    if (id) setViewingId(id);
    if (params.get('new') || id) setParams({}, { replace: true });
  }, [params, setParams]);

  const rows = useMemo(() => supportRequests.filter((r) => {
    if (show === 'open') return r.status !== 'resolved';
    if (show === 'mine') return r.status !== 'resolved' && r.assignedTo === user?.id;
    if (show === 'resolved') return r.status === 'resolved';
    return true;
  }).sort((a, b) => {
    const rank = { urgent: 0, normal: 1, low: 2 };
    return a.status === 'resolved' || b.status === 'resolved'
      ? b.openedAt.localeCompare(a.openedAt)
      : rank[a.priority] - rank[b.priority] || a.openedAt.localeCompare(b.openedAt);
  }), [supportRequests, show, user?.id]);

  const open = supportRequests.filter((r) => r.status !== 'resolved');
  const late = open.filter((r) => { const due = responseDue(r); return due && due < now; });

  const setStatus = async (r: SupportRequest, status: SupportStatus) => {
    const saved = await saveSupport({ status, ...(status === 'resolved' ? { resolution } : {}) }, r.id);
    if (saved) toast.success(`Marked ${SUPPORT_STATUS_LABELS[status].toLowerCase()}`);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Support"
        description={`${open.length} open · ${late.length} waiting too long for a first reply`}
        actions={canSell && <Button className="gap-2 bg-accent hover:bg-accent/90" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Log request</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Show">
        {([['open', 'Open'], ['mine', 'Mine'], ['resolved', 'Resolved'], ['all', 'All']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setShow(v)} aria-pressed={show === v}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${show === v ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>{l}</button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center shadow-card">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"><LifeBuoy className="h-8 w-8 text-muted-foreground" /></div>
          <p className="font-medium">{show === 'resolved' ? 'Nothing resolved yet' : 'No open requests'}</p>
          <p className="text-sm text-muted-foreground">Log client problems here so nothing gets lost in email.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const c = getClient(r.clientId);
            const due = responseDue(r);
            return (
              <li key={r.id}>
                <button onClick={() => { setViewingId(r.id); setResolution(r.resolution || ''); }}
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card px-4 py-3 text-left text-sm shadow-card hover:bg-muted/40">
                  <span className={cn('rounded px-2 py-0.5 text-xs font-medium', PRIORITY_TONE[r.priority])}>{SUPPORT_PRIORITY_LABELS[r.priority]}</span>
                  <span className="font-medium">{r.title}</span>
                  <span className="text-muted-foreground">{c?.companyName || c?.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{SUPPORT_STATUS_LABELS[r.status]} · {memberName(r.assignedTo) || 'Unassigned'}</span>
                  <span className="w-full text-xs text-muted-foreground">
                    Opened {formatDistanceToNowStrict(new Date(r.openedAt), { addSuffix: true })}
                    {due && <span className={due < now ? ' font-medium text-destructive' : ' text-warning'}> · first reply {due < now ? 'overdue' : `due ${format(due, 'EEE h:mm a')}`}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Log a support request</DialogTitle>
            <DialogDescription>Reply targets: urgent 4 hours, normal 1 day, low 3 days.</DialogDescription>
          </DialogHeader>
          <NewRequestForm onCancel={() => setAdding(false)} onSubmit={async (d) => { if (await saveSupport(d)) { setAdding(false); toast.success('Request logged'); } }} />
        </DialogContent>
      </Dialog>

      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewingId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {viewing && (
            <>
              <SheetHeader><SheetTitle>{viewing.title}</SheetTitle></SheetHeader>
              <dl className="mt-4 grid grid-cols-[120px_1fr] gap-y-2 text-sm">
                <dt className="text-muted-foreground">Client</dt><dd><Link to={`/clients/${viewing.clientId}`} className="hover:underline">{getClient(viewing.clientId)?.companyName || getClient(viewing.clientId)?.name}</Link></dd>
                {viewing.reportedBy && <><dt className="text-muted-foreground">Reported by</dt><dd>{viewing.reportedBy} ({SUPPORT_CHANNEL_LABELS[viewing.channel].toLowerCase()})</dd></>}
                <dt className="text-muted-foreground">Opened</dt><dd>{format(new Date(viewing.openedAt), 'd MMM yyyy, h:mm a')}</dd>
                <dt className="text-muted-foreground">First reply</dt><dd>{viewing.firstResponseAt ? format(new Date(viewing.firstResponseAt), 'd MMM, h:mm a') : 'Not yet'}</dd>
                {viewing.resolvedAt && <><dt className="text-muted-foreground">Resolved</dt><dd>{format(new Date(viewing.resolvedAt), 'd MMM, h:mm a')}</dd></>}
                <dt className="text-muted-foreground">Billing</dt><dd>{viewing.billable ? 'Bill separately' : 'Covered / no charge'}</dd>
              </dl>
              {viewing.details && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm">{viewing.details}</p>}
              {canSell && (
                <div className="mt-6 space-y-3">
                  <Label htmlFor="sr-status">Status</Label>
                  <div id="sr-status" className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <Button key={s} size="sm" variant={viewing.status === s ? 'default' : 'outline'} disabled={viewing.status === s} onClick={() => setStatus(viewing, s)}>
                        {SUPPORT_STATUS_LABELS[s]}
                      </Button>
                    ))}
                  </div>
                  <div>
                    <Label htmlFor="sr-resolution">What fixed it</Label>
                    <Textarea id="sr-resolution" rows={3} className="mt-1.5" value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Saved when you mark it resolved" />
                    {viewing.status === 'resolved' && resolution !== (viewing.resolution || '') && (
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => saveSupport({ resolution }, viewing.id)}>Save note</Button>
                    )}
                  </div>
                  {isAdmin && (
                    <Button variant="ghost" className="gap-2 text-destructive" onClick={() => { deleteSupport(viewing.id); setViewingId(null); }}><Trash2 className="h-4 w-4" />Delete request</Button>
                  )}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
