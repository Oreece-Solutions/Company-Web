import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Search, Plus, Upload, Download, Radar, MoreHorizontal, ExternalLink, Globe, PhoneOutgoing, ArrowRightCircle, Ban, Trash2, Pencil, CalendarPlus, StickyNote } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@company-web/shared/ui';
import { useHq } from '@/contexts/HqContext';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProspectForm } from '@/components/hq/ProspectForm';
import { ProspectStageBadge, TierBadge } from '@/components/hq/Badges';
import { CsvImportDialog } from '@/components/hq/CsvImportDialog';
import { Prospect, ProspectInput, ProspectStage } from '@/types/hq';
import { parseProspectCsvRow } from '@/lib/prospectCsv';
import { downloadCsv } from '@/lib/csv';
import { formatMoney } from '@/lib/money';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesDept } from '@/contexts/SalesDeptContext';
import { LogContactDialog } from '@/components/sales/LogContactDialog';
import { BookDiscoveryDialog } from '@/components/sales/BookDiscoveryDialog';
import { ProspectTimeline } from '@/components/sales/ProspectTimeline';
import { SEGMENT_LABELS } from '@/types/sales';

type Filter = 'active' | 'mine' | 'due' | 'noNext' | 'tierA' | 'converted' | 'disqualified' | 'all';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'mine', label: 'Mine' },
  { value: 'due', label: 'Due now' },
  { value: 'noNext', label: 'No next action' },
  { value: 'tierA', label: 'Tier A' },
  { value: 'converted', label: 'Converted' },
  { value: 'disqualified', label: 'Disqualified' },
  { value: 'all', label: 'All' },
];

const CLOSED: ProspectStage[] = ['converted', 'disqualified'];

export default function LeadsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { prospects, addProspect, updateProspect, deleteProspect, convertProspect, checkWebsite } = useHq();
  const { user } = useAuth();
  const { team, memberName } = useSalesDept();
  const [logging, setLogging] = useState<{ prospect: Prospect; kind: 'contact' | 'conversation' | 'note' } | null>(null);
  const [booking, setBooking] = useState<Prospect | null>(null);
  const { refetch: refetchMain } = useAppStore();
  const { refetch: refetchSales } = useSales();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [viewing, setViewing] = useState<Prospect | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [converting, setConverting] = useState<Prospect | null>(null);
  const [dealTitle, setDealTitle] = useState('');
  const [contactName, setContactName] = useState('');
  const [deleting, setDeleting] = useState<Prospect | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const filter = (params.get('view') as Filter) || 'active';

  // /leads?new=1 (from the Sales desk) opens the add form.
  useEffect(() => {
    if (params.get('new')) {
      setEditing(null);
      setFormOpen(true);
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);
  const today = format(new Date(), 'yyyy-MM-dd');

  const counts = useMemo(() => ({
    active: prospects.filter((p) => !CLOSED.includes(p.stage)).length,
    mine: prospects.filter((p) => !CLOSED.includes(p.stage) && p.assignedTo === user?.id).length,
    due: prospects.filter((p) => !CLOSED.includes(p.stage) && p.nextActionDate && p.nextActionDate <= today).length,
    noNext: prospects.filter((p) => !CLOSED.includes(p.stage) && (!p.nextAction || !p.nextActionDate)).length,
  }), [prospects, today, user?.id]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prospects
      .filter((p) => {
        if (filter === 'active' && CLOSED.includes(p.stage)) return false;
        if (filter === 'mine' && (CLOSED.includes(p.stage) || p.assignedTo !== user?.id)) return false;
        if (filter === 'noNext' && (CLOSED.includes(p.stage) || (p.nextAction && p.nextActionDate))) return false;
        if (filter === 'due' && (CLOSED.includes(p.stage) || !p.nextActionDate || p.nextActionDate > today)) return false;
        if (filter === 'tierA' && (p.tier !== 'A' || CLOSED.includes(p.stage))) return false;
        if ((filter === 'converted' || filter === 'disqualified') && p.stage !== filter) return false;
        if (!q) return true;
        return [p.businessName, p.industry, p.location, p.observedProblem, p.website].some((v) => v?.toLowerCase().includes(q));
      })
      .sort((a, b) => (a.nextActionDate || '9999').localeCompare(b.nextActionDate || '9999') || (a.tier || 'Z').localeCompare(b.tier || 'Z'));
  }, [prospects, filter, search, today, user?.id]);

  const live = (p: Prospect | null) => (p ? prospects.find((x) => x.id === p.id) || p : null);
  const current = live(viewing);

  const save = async (data: ProspectInput) => {
    const ok = editing ? await updateProspect(editing.id, data) : (await addProspect(data))?.prospect;
    if (ok) {
      setFormOpen(false);
      setEditing(null);
    }
  };

  const logActivity = (p: Prospect, kind: 'contact' | 'conversation' | 'note' = 'contact') => setLogging({ prospect: p, kind });

  const runCheck = async (p: Prospect) => {
    setChecking(p.id);
    await checkWebsite(p.id);
    setChecking(null);
  };

  const doConvert = async () => {
    if (!converting) return;
    const dealId = await convertProspect(converting.id, dealTitle, contactName);
    if (dealId) {
      await Promise.all([refetchMain(), refetchSales()]);
      setConverting(null);
      navigate(`/deals/${dealId}`);
    }
  };

  const applyIssues = async (p: Prospect) => {
    const issues = p.siteCheck?.issues || [];
    if (!issues.length) return;
    await updateProspect(p.id, {
      observedProblem: issues.join('; '),
      evidence: `Automated website check ${p.siteCheckedAt ? format(parseISO(p.siteCheckedAt), 'd MMM yyyy') : ''}. Confirm by eye before contacting.`,
    });
  };

  const actions = (p: Prospect) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${p.businessName}`} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => { setEditing(p); setFormOpen(true); }}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
        {p.website && (
          <DropdownMenuItem disabled={checking === p.id} onClick={() => runCheck(p)}>
            <Globe className="mr-2 h-4 w-4" />{checking === p.id ? 'Checking…' : 'Check website'}
          </DropdownMenuItem>
        )}
        {!CLOSED.includes(p.stage) && (
          <>
            <DropdownMenuItem onClick={() => logActivity(p)}><PhoneOutgoing className="mr-2 h-4 w-4" />Log contact</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setBooking(p)}><CalendarPlus className="mr-2 h-4 w-4" />Book discovery call</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setConverting(p); setDealTitle(''); setContactName(''); }}>
              <ArrowRightCircle className="mr-2 h-4 w-4" />Convert to deal
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setEditing({ ...p, stage: 'disqualified' }); setFormOpen(true); }}>
              <Ban className="mr-2 h-4 w-4" />Disqualify
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={() => logActivity(p, 'note')}><StickyNote className="mr-2 h-4 w-4" />Add note</DropdownMenuItem>
        {p.dealId && <DropdownMenuItem onClick={() => navigate(`/deals/${p.dealId}`)}><ArrowRightCircle className="mr-2 h-4 w-4" />Open deal</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(p)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <AppLayout>
      <PageHeader
        title="Lead Finder"
        description="Businesses you researched, each with a problem you saw yourself"
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={() => downloadCsv(`oreece-leads-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows.map((p) => ({ business_name: p.businessName, website: p.website, industry: p.industry, location: p.location, tier: p.tier, stage: p.stage, observed_problem: p.observedProblem, evidence: p.evidence, contact_channel: p.contactChannel, consent_basis: p.consentBasis, next_action: p.nextAction, next_action_date: p.nextActionDate, est_value_nzd_estimate: p.estimatedValue, notes: p.notes })))}>
              <Download className="h-4 w-4" />Export
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />Import CSV
            </Button>
            <Button className="gap-2 bg-accent hover:bg-accent/90" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" />Add prospect
            </Button>
          </>
        }
      />

      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="lead-search" placeholder="Search business, industry, problem…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setParams(f.value === 'active' ? {} : { view: f.value })}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${filter === f.value ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
            >
              {f.label}
              {f.value === 'active' && ` (${counts.active})`}
              {f.value === 'mine' && ` (${counts.mine})`}
              {f.value === 'due' && counts.due > 0 && ` (${counts.due})`}
              {f.value === 'noNext' && counts.noNext > 0 && ` (${counts.noNext})`}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center shadow-card">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Radar className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium">No prospects here</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add a business you researched, or import <span className="font-mono">~/Oreece/sales/pipeline.csv</span>.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Problem seen</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Next action</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => {
                const overdue = p.nextActionDate && p.nextActionDate < today && !CLOSED.includes(p.stage);
                const dueToday = p.nextActionDate === today && !CLOSED.includes(p.stage);
                return (
                  <tr key={p.id} className="cursor-pointer align-top hover:bg-muted/40" onClick={() => setViewing(p)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium">{p.businessName}<TierBadge tier={p.tier} /></div>
                      <div className="text-xs text-muted-foreground">{[p.segment ? SEGMENT_LABELS[p.segment] : p.industry, p.location, p.assignedTo && memberName(p.assignedTo)].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td className="max-w-[320px] px-4 py-3">
                      <p className="line-clamp-2">{p.observedProblem || <span className="text-muted-foreground">—</span>}</p>
                    </td>
                    <td className="px-4 py-3"><ProspectStageBadge stage={p.stage} /></td>
                    <td className="px-4 py-3">
                      <p className="line-clamp-1">{p.nextAction || (CLOSED.includes(p.stage) ? <span className="text-muted-foreground">—</span> : <span className="text-destructive">No next action</span>)}</p>
                      {p.nextActionDate && (
                        <p className={`text-xs ${overdue ? 'font-medium text-destructive' : dueToday ? 'font-medium text-warning' : 'text-muted-foreground'}`}>
                          {overdue ? 'Overdue · ' : dueToday ? 'Today · ' : ''}{format(parseISO(p.nextActionDate), 'EEE d MMM')}
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">{actions(p)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / edit */}
      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{editing?.id ? `Edit ${editing.businessName}` : 'Add prospect'}</DialogTitle>
            <DialogDescription>Only record problems you have seen yourself, and how you know.</DialogDescription>
          </DialogHeader>
          <ProspectForm key={editing?.id ?? 'new'} initialData={editing ?? undefined} team={team} onSubmit={save} onCancel={() => { setFormOpen(false); setEditing(null); }} />
        </DialogContent>
      </Dialog>

      {/* Details */}
      <Sheet open={!!current} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {current && (
            <>
              <SheetHeader>
                <SheetTitle className="flex flex-wrap items-center gap-2">{current.businessName}<TierBadge tier={current.tier} /></SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <ProspectStageBadge stage={current.stage} />
                  {current.website && (
                    <a href={current.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                      {current.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}<ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {current.discoveryAt && (
                  <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-success">Discovery call</p>
                    <p className="mt-0.5 font-medium">{format(parseISO(current.discoveryAt), "EEE d MMM yyyy 'at' h:mm a")}</p>
                  </div>
                )}
                <Detail label="Segment" value={current.segment && SEGMENT_LABELS[current.segment]} />
                <Detail label="Owner" value={memberName(current.assignedTo)} />
                <Detail label="Problem seen" value={current.observedProblem} />
                <Detail label="Evidence" value={current.evidence} />
                <Detail label="How to contact" value={current.contactChannel} />
                <Detail label="Why contacting is allowed" value={current.consentBasis} />
                <Detail label="Next action" value={[current.nextAction, current.nextActionDate && format(parseISO(current.nextActionDate), 'EEE d MMM yyyy')].filter(Boolean).join(' — ')} />
                {current.estimatedValue !== undefined && <Detail label="Estimated value" value={`${formatMoney(current.estimatedValue, current.currency)} (estimate)`} />}
                {current.lastContactedAt && <Detail label="Last contacted" value={format(parseISO(current.lastContactedAt), 'd MMM yyyy')} />}
                {current.disqualifiedReason && <Detail label="Disqualified because" value={current.disqualifiedReason} />}
                <Detail label="Notes" value={current.notes} />

                <div className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium">Website check</p>
                    {current.website && (
                      <Button size="sm" variant="outline" disabled={checking === current.id} onClick={() => runCheck(current)}>
                        {checking === current.id ? 'Checking…' : current.siteCheck ? 'Re-check' : 'Check now'}
                      </Button>
                    )}
                  </div>
                  {current.siteCheck ? (
                    <>
                      <p className="mb-2 text-xs text-muted-foreground">
                        {current.siteCheckedAt && format(parseISO(current.siteCheckedAt), 'd MMM yyyy, HH:mm')}
                        {current.siteCheck.platform && ` · ${current.siteCheck.platform}`}
                        {current.siteCheck.seconds !== undefined && ` · ${current.siteCheck.seconds}s`}
                      </p>
                      {current.siteCheck.issues?.length ? (
                        <>
                          <ul className="list-disc space-y-1 pl-5">{current.siteCheck.issues.map((i) => <li key={i}>{i}</li>)}</ul>
                          <Button size="sm" variant="ghost" className="mt-2 px-0 text-accent" onClick={() => applyIssues(current)}>
                            Use these as the problem seen
                          </Button>
                        </>
                      ) : (
                        <p className="text-muted-foreground">No visible problems found on the homepage.</p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">{current.website ? 'Not checked yet.' : 'No website recorded.'}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(current); setFormOpen(true); }}>Edit</Button>
                  {!CLOSED.includes(current.stage) && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => logActivity(current)}>Log contact</Button>
                      <Button variant="outline" size="sm" onClick={() => logActivity(current, 'conversation')}>Log conversation</Button>
                      <Button variant="outline" size="sm" onClick={() => setBooking(current)}>{current.discoveryAt ? 'Move call' : 'Book discovery call'}</Button>
                      <Button size="sm" className="bg-accent hover:bg-accent/90" onClick={() => { setConverting(current); setDealTitle(''); setContactName(''); }}>
                        Convert to deal
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => logActivity(current, 'note')}>Add note</Button>
                  {current.clientId && <Button variant="outline" size="sm" asChild><Link to={`/clients/${current.clientId}`}>Open account</Link></Button>}
                </div>

                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">History</p>
                  <ProspectTimeline prospect={current} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Convert */}
      <Dialog open={!!converting} onOpenChange={(o) => !o && setConverting(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Convert {converting?.businessName}</DialogTitle>
            <DialogDescription>Creates an account, a primary contact and an open deal in the pipeline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="convert-contact">Contact person (optional)</Label>
              <Input id="convert-contact" className="mt-1.5" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Owner's name, if you know it" />
            </div>
            <div>
              <Label htmlFor="convert-title">Deal title (optional)</Label>
              <Input id="convert-title" className="mt-1.5" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} placeholder={`${converting?.businessName ?? ''} – website & digital`} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConverting(null)}>Cancel</Button>
              <Button className="bg-accent hover:bg-accent/90" onClick={doConvert}>Convert</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.businessName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the prospect and its research notes. An account or deal created from it is kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleting) deleteProspect(deleting.id); setDeleting(null); setViewing(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LogContactDialog prospect={logging ? live(logging.prospect) : null} initialKind={logging?.kind} onOpenChange={(o) => !o && setLogging(null)} />
      <BookDiscoveryDialog prospect={booking ? live(booking) : null} onOpenChange={(o) => !o && setBooking(null)} />

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import prospects"
        description="Columns from ~/Oreece/sales/pipeline.csv are recognised (business_name, website, observed_opportunity, evidence, stage, consent_basis…). Rows that break a rule are shown and skipped."
        parseRow={parseProspectCsvRow}
        saveRow={async (data) => {
          const res = await addProspect(data, { silent: true });
          return res && 'error' in res ? res.error : null;
        }}
      />
    </AppLayout>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-line">{value}</p>
    </div>
  );
}

