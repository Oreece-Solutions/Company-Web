import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Edit, Trash2, Trophy, XCircle, RotateCcw, FileText, Plus, Check } from 'lucide-react';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@company-web/shared/ui';
import { cn } from '@company-web/shared/utils';
import { DealForm } from '@/components/crm/DealForm';
import { DealStageBadge, QuoteStatusBadge } from '@/components/crm/Badges';
import { WinDealDialog, LoseDealDialog } from '@/components/crm/CloseDealDialogs';
import { ActivityFeed } from '@/components/crm/ActivityFeed';
import { FollowUpPanel } from '@/components/crm/FollowUpPanel';
import { DealStageChange, DEAL_STAGE_LABELS, OPEN_DEAL_STAGES, effectiveQuoteStatus } from '@/types/crm';
import { formatMoney } from '@/lib/money';
import { DealInput } from '@/hooks/useSalesStore';

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getClient, getProject, refetch } = useAppStore();
  const { getDeal, updateDeal, moveDealStage, deleteDeal, fetchStageHistory, quotes, contacts, getMemberName, isLoading } = useSales();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [winOpen, setWinOpen] = useState(false);
  const [loseOpen, setLoseOpen] = useState(false);
  const [history, setHistory] = useState<DealStageChange[]>([]);

  const deal = id ? getDeal(id) : undefined;

  // Reload the stage history whenever the stage changes.
  const dealId = deal?.id;
  const dealStage = deal?.stage;
  useEffect(() => {
    if (dealId) fetchStageHistory(dealId).then(setHistory);
  }, [dealId, dealStage, fetchStageHistory]);

  if (!deal) {
    return (
      <AppLayout>
        <PageHeader title={isLoading ? 'Loading…' : 'Deal not found'} />
        <Link to="/pipeline" className="text-accent hover:underline">Back to Pipeline</Link>
      </AppLayout>
    );
  }

  const client = getClient(deal.clientId);
  const contact = deal.contactId ? contacts.find((c) => c.id === deal.contactId) : undefined;
  const project = deal.projectId ? getProject(deal.projectId) : undefined;
  const dealQuotes = quotes.filter((q) => q.dealId === deal.id);
  const isClosed = deal.stage === 'won' || deal.stage === 'lost';
  const currentIndex = OPEN_DEAL_STAGES.indexOf(deal.stage);

  const handleUpdate = async (data: DealInput) => {
    const updated = await updateDeal(deal.id, data);
    if (updated) {
      setIsEditOpen(false);
      if (data.stage !== deal.stage) refetch();
    }
  };

  const moveTo = async (stage: typeof OPEN_DEAL_STAGES[number]) => {
    if (await moveDealStage(deal.id, stage)) refetch();
  };

  const handleDelete = async () => {
    if (await deleteDeal(deal.id)) navigate('/pipeline');
  };

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: 'Value', value: <span className="font-mono">{formatMoney(deal.value, deal.currency)}</span> },
    { label: 'Win chance', value: `${deal.probability}%` },
    { label: 'Weighted', value: <span className="font-mono">{formatMoney((deal.value * deal.probability) / 100, deal.currency)}</span> },
    { label: 'Expected close', value: deal.expectedCloseDate ? format(parseISO(deal.expectedCloseDate), 'MMM d, yyyy') : '—' },
    { label: 'Owner', value: getMemberName(deal.ownerId) },
    { label: 'Contact', value: contact ? `${contact.fullName}${contact.jobTitle ? ` · ${contact.jobTitle}` : ''}` : '—' },
    { label: 'Service', value: deal.serviceType || '—' },
    { label: 'Source', value: deal.source || '—' },
  ];
  if (deal.closedAt) facts.push({ label: deal.stage === 'won' ? 'Won on' : 'Lost on', value: format(new Date(deal.closedAt), 'MMM d, yyyy') });

  return (
    <AppLayout>
      <Link to="/pipeline" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Pipeline
      </Link>

      <PageHeader
        title={deal.title}
        description={client ? undefined : 'Unknown account'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!isClosed && (
              <>
                <Button onClick={() => setWinOpen(true)} className="gap-2 bg-success text-success-foreground hover:bg-success/90">
                  <Trophy className="h-4 w-4" />
                  Won
                </Button>
                <Button variant="outline" onClick={() => setLoseOpen(true)} className="gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  Lost
                </Button>
              </>
            )}
            {isClosed && (
              <Button variant="outline" onClick={() => moveTo('negotiation')} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reopen
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsEditOpen(true)} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Delete deal">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete deal</AlertDialogTitle>
                  <AlertDialogDescription>
                    Delete {deal.title}? Its follow-ups are deleted too; activities and quotes stay on the account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />
      {client && (
        <p className="-mt-6 mb-6 text-muted-foreground">
          <Link to={`/clients/${client.id}`} className="hover:underline">{client.companyName || client.name}</Link>
        </p>
      )}

      {/* Stage stepper */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-card">
        {isClosed ? (
          <div className="flex flex-wrap items-center gap-3">
            <DealStageBadge stage={deal.stage} />
            {deal.stage === 'lost' && deal.lostReason && <span className="text-sm text-muted-foreground">Reason: {deal.lostReason}</span>}
            {project && (
              <Link to={`/projects/${project.id}`} className="text-sm text-accent hover:underline">
                Delivery project: {project.name}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {OPEN_DEAL_STAGES.map((stage, i) => (
              <button
                key={stage}
                onClick={() => moveTo(stage)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  i < currentIndex && 'bg-accent/15 text-accent',
                  i === currentIndex && 'bg-accent text-accent-foreground',
                  i > currentIndex && 'bg-muted text-muted-foreground hover:bg-muted/70',
                )}
              >
                {i < currentIndex && <Check className="h-3.5 w-3.5" />}
                {DEAL_STAGE_LABELS[stage]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ActivityFeed clientId={deal.clientId} dealId={deal.id} stageChanges={history} />
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-3 font-semibold">Details</h2>
            <dl className="space-y-2 text-sm">
              {facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="text-right font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <FollowUpPanel clientId={deal.clientId} dealId={deal.id} />

          <div className="rounded-xl border border-border bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-semibold">Quotes</h2>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate(`/quotes/new?dealId=${deal.id}`)}>
                <Plus className="h-3.5 w-3.5" />
                New quote
              </Button>
            </div>
            <div className="divide-y divide-border">
              {dealQuotes.length === 0 ? (
                <p className="p-5 text-center text-sm text-muted-foreground">No quotes yet.</p>
              ) : (
                dealQuotes.map((q) => (
                  <Link key={q.id} to={`/quotes/${q.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/50">
                    <span className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{q.quoteNumber}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-sm">{formatMoney(q.total, q.currency)}</span>
                      <QuoteStatusBadge status={effectiveQuoteStatus(q)} />
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
            <DialogDescription>Update the deal's details.</DialogDescription>
          </DialogHeader>
          <DealForm initialData={deal} onSubmit={handleUpdate} onCancel={() => setIsEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <WinDealDialog deal={winOpen ? deal : null} onOpenChange={setWinOpen} />
      <LoseDealDialog deal={loseOpen ? deal : null} onOpenChange={setLoseOpen} />
    </AppLayout>
  );
}
