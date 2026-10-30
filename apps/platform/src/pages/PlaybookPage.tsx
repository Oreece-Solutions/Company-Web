import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Label,
  Tabs, TabsContent, TabsList, TabsTrigger, Textarea,
} from '@company-web/shared/ui';
import { cn } from '@company-web/shared/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useHq } from '@/contexts/HqContext';
import { useSalesDept } from '@/contexts/SalesDeptContext';
import { targetFor } from '@/hooks/useSalesDeptStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SelectField } from '@/components/crm/SelectField';
import {
  fillTemplate, PlaybookSection, SalesTemplate, SalesTemplateInput, TARGET_LABELS, TARGET_METRICS,
  TEMPLATE_KIND_LABELS, TemplateKind, TemplateStatus,
} from '@/types/sales';

// The sales handbook and the approved outreach scripts, in one place.
export default function PlaybookPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'templates' ? 'templates' : 'handbook';
  return (
    <AppLayout>
      <PageHeader title="Sales playbook" description="How Oreece sells: who does what, who we sell to, what we offer, and the words we use." />
      <Tabs value={tab} onValueChange={(v) => setParams(v === 'handbook' ? {} : { tab: v })}>
        <TabsList className="mb-6">
          <TabsTrigger value="handbook">Handbook</TabsTrigger>
          <TabsTrigger value="templates">Templates & scripts</TabsTrigger>
        </TabsList>
        <TabsContent value="handbook"><Handbook /></TabsContent>
        <TabsContent value="templates"><Templates /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function Handbook() {
  const { playbook, isAdmin, saveSection, deleteSection, targets } = useSalesDept();
  const { services } = useHq();
  const [editing, setEditing] = useState<Partial<PlaybookSection> | null>(null);
  const offers = services.filter((s) => s.active && /cleaning/i.test(s.name));

  return (
    <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="hidden xl:block">
        <ul className="sticky top-6 space-y-1 text-sm">
          {playbook.map((s) => <li key={s.id}><a href={`#${s.slug}`} className="block rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">{s.title}</a></li>)}
        </ul>
      </nav>
      <div className="min-w-0 space-y-4">
        {playbook.map((s) => (
          <section key={s.id} id={s.slug} className="scroll-mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">{s.title}</h2>
              {isAdmin && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" aria-label={`Edit ${s.title}`} onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            <Body text={s.body} />
            {s.slug === 'offer' && offers.length > 0 && (
              <p className="mt-3 text-sm">
                In Services: {offers.map((o, i) => <span key={o.id}>{i > 0 && ', '}<Link to="/services" className="text-accent hover:underline">{o.name}</Link>{o.priceApproved ? '' : ' (price not approved)'}</span>)}
              </p>
            )}
            {s.slug === 'targets' && (
              <table className="mt-4 w-full max-w-md text-sm">
                <tbody className="divide-y divide-border">
                  {TARGET_METRICS.map((m) => {
                    const t = targetFor(targets, m);
                    return <tr key={m}><td className="py-1.5">{TARGET_LABELS[m]}</td><td className="py-1.5 text-right tabular-nums">{t ? `${t.weeklyMin}${t.weeklyMax !== undefined ? `–${t.weeklyMax}` : ''}` : '—'} / week</td></tr>;
                  })}
                </tbody>
              </table>
            )}
          </section>
        ))}
        {isAdmin && (
          <Button variant="outline" className="gap-2" onClick={() => setEditing({ title: '', body: '' })}><Plus className="h-4 w-4" />Add section</Button>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit section' : 'New section'}</DialogTitle>
            <DialogDescription>Plain text. Lines starting with "- " show as bullets.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="pb-title">Title</Label>
                <Input id="pb-title" className="mt-1.5" value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="pb-body">Text</Label>
                <Textarea id="pb-body" rows={16} className="mt-1.5 font-mono text-sm" value={editing.body || ''} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
              </div>
              <div className="flex justify-between gap-3">
                {editing.id ? (
                  <Button variant="ghost" className="text-destructive" onClick={async () => { await deleteSection(editing.id!); setEditing(null); }}>
                    <Trash2 className="mr-2 h-4 w-4" />Delete
                  </Button>
                ) : <span />}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                  <Button className="bg-accent hover:bg-accent/90" disabled={!editing.title?.trim()}
                    onClick={async () => { if (await saveSection({ title: editing.title!, body: editing.body || '', slug: editing.slug }, editing.id)) setEditing(null); }}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Paragraphs, "- " bullets and numbered lines, without a Markdown library.
function Body({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        const bullets = lines.filter((l) => l.startsWith('- '));
        if (bullets.length && bullets.length >= lines.length - 1) {
          const heading = lines[0].startsWith('- ') ? null : lines[0];
          return (
            <div key={i}>
              {heading && <p className="font-medium">{heading}</p>}
              <ul className="list-disc space-y-1 pl-5">{bullets.map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>
            </div>
          );
        }
        return <p key={i} className="whitespace-pre-line">{b}</p>;
      })}
    </div>
  );
}

const STATUS_STYLES: Record<TemplateStatus, string> = {
  draft: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  retired: 'bg-muted text-muted-foreground',
};

const EMPTY: SalesTemplateInput = { name: '', kind: 'email', segment: '', subject: '', body: '', status: 'draft', sortOrder: 100 };

function Templates() {
  const { user } = useAuth();
  const { prospects } = useHq();
  const { templates, isAdmin, team, saveTemplate, setTemplateStatus, deleteTemplate } = useSalesDept();
  const [showAll, setShowAll] = useState(false);
  const [prospectId, setProspectId] = useState('');
  const [contactName, setContactName] = useState('');
  const [editing, setEditing] = useState<(SalesTemplateInput & { id?: string }) | null>(null);

  const me = team.find((m) => m.userId === user?.id)?.fullName;
  const founder = team.find((m) => m.role === 'admin')?.fullName;
  const prospect = prospects.find((p) => p.id === prospectId);
  const values = {
    business: prospect?.businessName,
    observation: prospect?.observedProblem?.replace(/\.$/, '').replace(/^./, (c) => c.toLowerCase()),
    evidence: prospect?.evidence,
    website: prospect?.website,
    name: contactName,
    sender: me,
    founder,
  };

  const shown = useMemo(() => templates.filter((t) => showAll || t.status !== 'retired'), [templates, showAll]);
  const kinds = Array.from(new Set(shown.map((t) => t.kind)));

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied`);
    } catch {
      toast.error('Copy failed; select the text and copy it instead');
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <p className="mb-3 text-sm text-muted-foreground">
          Pick a prospect to fill in the placeholders. Only <span className="font-medium text-success">approved</span> templates can be used with prospects; drafts wait for the founder.
          Personalise every message; never send in bulk.
        </p>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
          <div>
            <Label htmlFor="tpl-prospect">Prospect</Label>
            <SelectField id="tpl-prospect" className="mt-1.5" value={prospectId} onChange={setProspectId} noneLabel="No prospect (show placeholders)"
              options={prospects.filter((p) => !['converted', 'disqualified'].includes(p.stage)).map((p) => ({ value: p.id, label: p.businessName }))} />
          </div>
          <div>
            <Label htmlFor="tpl-name">Contact's first name</Label>
            <Input id="tpl-name" className="mt-1.5" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="If known" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)}>{showAll ? 'Hide retired' : 'Show retired'}</Button>
            <Button size="sm" className="gap-1 bg-accent hover:bg-accent/90" onClick={() => setEditing({ ...EMPTY })}><Plus className="h-4 w-4" />New draft</Button>
          </div>
        </div>
        {prospect && !prospect.observedProblem && <p className="mt-2 text-sm text-warning">This prospect has no problem recorded, so {'{observation}'} stays empty. Research it first.</p>}
      </section>

      {kinds.map((k) => (
        <section key={k}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{TEMPLATE_KIND_LABELS[k]}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {shown.filter((t) => t.kind === k).map((t) => {
              const usable = t.status === 'approved';
              const subject = t.subject ? fillTemplate(t.subject, values) : undefined;
              const body = fillTemplate(t.body, values);
              return (
                <article key={t.id} className={cn('flex flex-col rounded-xl border bg-card p-5 shadow-card', usable ? 'border-border' : 'border-dashed border-border opacity-90')}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{t.name}</h3>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[t.status])}>{t.status === 'draft' ? 'Draft: needs approval' : t.status === 'approved' ? 'Approved' : 'Retired'}</span>
                    {t.segment && <span className="text-xs text-muted-foreground">{t.segment}</span>}
                  </div>
                  {subject && <p className="mb-2 text-sm"><span className="text-muted-foreground">Subject: </span>{subject}</p>}
                  <pre className="flex-1 whitespace-pre-wrap rounded-lg bg-muted/40 p-3 font-sans text-sm">{body}</pre>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(usable || isAdmin) && (
                      <>
                        {subject && <Button size="sm" variant="outline" className="gap-1" onClick={() => copy(subject, 'Subject')}><Copy className="h-3.5 w-3.5" />Subject</Button>}
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => copy(body, 'Text')}><Copy className="h-3.5 w-3.5" />Copy text</Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="gap-1" onClick={() => setEditing({ ...t })}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                    {isAdmin && t.status !== 'approved' && (
                      <Button size="sm" className="gap-1 bg-success text-success-foreground hover:bg-success/90" onClick={() => setTemplateStatus(t, 'approved')}><Check className="h-3.5 w-3.5" />Approve</Button>
                    )}
                    {isAdmin && t.status === 'approved' && <Button size="sm" variant="ghost" onClick={() => setTemplateStatus(t, 'retired')}>Retire</Button>}
                    {isAdmin && t.status === 'retired' && <Button size="sm" variant="ghost" onClick={() => setTemplateStatus(t, 'draft')}>Back to draft</Button>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <p className="text-xs text-muted-foreground">
        Placeholders: {'{name} {business} {observation} {evidence} {website} {sender} {founder} {meeting_time}'}. Any left in braces still need filling in by hand.
      </p>

      <TemplateDialog value={editing} isAdmin={isAdmin} onClose={() => setEditing(null)}
        onSave={async (v) => { if (await saveTemplate(v, v.id)) setEditing(null); }}
        onDelete={isAdmin ? async (id) => { await deleteTemplate(id); setEditing(null); } : undefined} />
    </div>
  );
}

function TemplateDialog({ value, isAdmin, onClose, onSave, onDelete }: {
  value: (SalesTemplateInput & { id?: string }) | null;
  isAdmin: boolean;
  onClose: () => void;
  onSave: (v: SalesTemplateInput & { id?: string }) => void;
  onDelete?: (id: string) => void;
}) {
  const [v, setV] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setV(value);
  }
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{value?.id ? 'Edit template' : 'New template'}</DialogTitle>
          <DialogDescription>{isAdmin ? 'Approve it when the wording is right.' : 'Saved as a draft. The founder approves it before it is used.'}</DialogDescription>
        </DialogHeader>
        {v && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="tpl-ed-name">Name *</Label>
                <Input id="tpl-ed-name" className="mt-1.5" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="tpl-ed-kind">Type</Label>
                <SelectField id="tpl-ed-kind" className="mt-1.5" value={v.kind} onChange={(k) => setV({ ...v, kind: k as TemplateKind })}
                  options={Object.entries(TEMPLATE_KIND_LABELS).map(([value, label]) => ({ value, label }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <div>
                <Label htmlFor="tpl-ed-subject">Email subject</Label>
                <Input id="tpl-ed-subject" className="mt-1.5" value={v.subject || ''} onChange={(e) => setV({ ...v, subject: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="tpl-ed-segment">For</Label>
                <Input id="tpl-ed-segment" className="mt-1.5" value={v.segment || ''} onChange={(e) => setV({ ...v, segment: e.target.value })} placeholder="cleaning" />
              </div>
            </div>
            <div>
              <Label htmlFor="tpl-ed-body">Text *</Label>
              <Textarea id="tpl-ed-body" rows={12} className="mt-1.5" value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />
            </div>
            <div className="flex justify-between gap-3">
              {v.id && onDelete ? <Button variant="ghost" className="text-destructive" onClick={() => onDelete(v.id!)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button> : <span />}
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button className="bg-accent hover:bg-accent/90" disabled={!v.name.trim() || !v.body.trim()} onClick={() => onSave(v)}>Save</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
