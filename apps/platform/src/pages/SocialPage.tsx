import { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Megaphone, Check, X, MessageSquareWarning, RefreshCw } from 'lucide-react';
import { Button, Textarea } from '@company-web/shared/ui';
import { supabase } from '@company-web/shared/data-access';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SocialQueueItem } from '@/types/hq';
import { hqErrorMessage } from '@/hooks/useHqStore';

const STATUS_LABELS: Record<string, string> = {
  NEEDS_APPROVAL: 'Waiting for you',
  APPROVED: 'Approved',
  SCHEDULED: 'Scheduled',
  PUBLISHING: 'Publishing',
  FAILED: 'Failed',
};

// The Oreece Social OS (n8n + schema social) drafts posts; nothing is
// published without a human approval. This is the same approval as Telegram.
export default function SocialPage() {
  const [items, setItems] = useState<SocialQueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('social_queue');
    if (err) {
      setError(hqErrorMessage(err, 'The Social OS queue is not available'));
      setItems([]);
      return;
    }
    setError(null);
    setItems((data || []).map((r) => ({
      contentId: r.content_id,
      approvalId: r.approval_id || undefined,
      brand: r.brand,
      platform: r.platform,
      format: r.format,
      status: r.status,
      headline: r.headline || undefined,
      hook: r.hook || undefined,
      caption: r.caption || undefined,
      cta: r.cta || undefined,
      hashtags: r.hashtags || [],
      linkUrl: r.link_url || undefined,
      revision: r.revision,
      feedback: r.feedback || undefined,
      slotAt: r.slot_at || undefined,
      updatedAt: r.updated_at,
    })));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (item: SocialQueueItem, decision: 'approve' | 'reject' | 'changes') => {
    if (!item.approvalId) return;
    const note = feedback[item.contentId]?.trim();
    if (decision === 'changes' && !note) {
      toast.error('Say what should change first');
      return;
    }
    setBusy(item.contentId);
    const { data, error: err } = await supabase.rpc('social_decide', { _approval_id: item.approvalId, _decision: decision, _feedback: note || null });
    setBusy(null);
    if (err) {
      toast.error(hqErrorMessage(err, 'Could not record the decision'));
      return;
    }
    const res = data as { applied?: boolean; reason?: string } | null;
    if (res && res.applied === false) toast.message(`Recorded, but not applied: ${res.reason}`);
    else toast.success(decision === 'approve' ? 'Approved. The Social OS will schedule it.' : decision === 'reject' ? 'Rejected' : 'Sent back for changes');
    load();
  };

  const waiting = (items || []).filter((i) => i.status === 'NEEDS_APPROVAL');
  const rest = (items || []).filter((i) => i.status !== 'NEEDS_APPROVAL');

  return (
    <AppLayout>
      <PageHeader
        title="Social approvals"
        description="Posts drafted by the Oreece Social OS. Nothing goes out until you approve it."
        actions={<Button variant="outline" className="gap-2" onClick={load}><RefreshCw className="h-4 w-4" />Refresh</Button>}
      />

      {error && (
        <div className="mb-6 rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm">
          {error}. The Social OS runs on n8n, which isn't deployed yet; once it is, drafts appear here.
        </div>
      )}

      {items && items.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center shadow-card">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"><Megaphone className="h-8 w-8 text-muted-foreground" /></div>
          <p className="font-medium">Nothing waiting</p>
          <p className="text-sm text-muted-foreground">New drafts show up here after they pass the Social OS quality checks.</p>
        </div>
      )}

      {waiting.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warning">Waiting for you ({waiting.length})</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {waiting.map((i) => (
              <article key={i.contentId} className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-card">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{i.brand} · {i.platform} · {i.format}{i.revision > 1 ? ` · revision ${i.revision}` : ''}</p>
                {i.headline && <h3 className="mb-1 font-semibold">{i.headline}</h3>}
                {i.hook && <p className="mb-2 font-medium">{i.hook}</p>}
                <p className="whitespace-pre-line text-sm">{i.caption}</p>
                {i.cta && <p className="mt-2 text-sm font-medium">{i.cta}</p>}
                {i.hashtags.length > 0 && <p className="mt-2 text-sm text-accent">{i.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}</p>}
                {i.feedback && <p className="mt-3 rounded-md bg-muted p-2 text-xs"><span className="font-medium">Earlier feedback: </span>{i.feedback}</p>}
                <Textarea
                  id={`fb-${i.contentId}`}
                  aria-label="Feedback"
                  className="mt-4"
                  rows={2}
                  placeholder="Feedback (needed for 'Request changes')"
                  value={feedback[i.contentId] || ''}
                  onChange={(e) => setFeedback({ ...feedback, [i.contentId]: e.target.value })}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" className="gap-1 bg-success text-success-foreground hover:bg-success/90" disabled={busy === i.contentId || !i.approvalId} onClick={() => decide(i, 'approve')}>
                    <Check className="h-4 w-4" />Approve
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" disabled={busy === i.contentId || !i.approvalId} onClick={() => decide(i, 'changes')}>
                    <MessageSquareWarning className="h-4 w-4" />Request changes
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1 text-destructive" disabled={busy === i.contentId || !i.approvalId} onClick={() => decide(i, 'reject')}>
                    <X className="h-4 w-4" />Reject
                  </Button>
                </div>
                {!i.approvalId && <p className="mt-2 text-xs text-muted-foreground">No open approval request yet; the Social OS creates one when it asks.</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Approved and scheduled</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-card">
            {rest.map((i) => (
              <li key={i.contentId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${i.status === 'FAILED' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>{STATUS_LABELS[i.status] || i.status}</span>
                <span className="font-medium">{i.headline || i.hook || i.caption?.slice(0, 80)}</span>
                <span className="text-muted-foreground">{i.brand} · {i.platform}</span>
                {i.slotAt && <span className="ml-auto text-muted-foreground">{format(parseISO(i.slotAt), 'EEE d MMM, HH:mm')}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppLayout>
  );
}
