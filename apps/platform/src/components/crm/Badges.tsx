import { cn } from '@company-web/shared/utils';
import { DealStage, DEAL_STAGE_LABELS, QuoteStatus, QUOTE_STATUS_LABELS } from '@/types/crm';

const STAGE_STYLES: Record<DealStage, string> = {
  lead: 'bg-muted text-muted-foreground',
  qualified: 'bg-info/10 text-info',
  proposal: 'bg-accent/10 text-accent',
  negotiation: 'bg-warning/10 text-warning',
  won: 'bg-success/10 text-success',
  lost: 'bg-destructive/10 text-destructive',
};

export function DealStageBadge({ stage }: { stage: DealStage }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STAGE_STYLES[stage])}>
      {DEAL_STAGE_LABELS[stage]}
    </span>
  );
}

const QUOTE_STYLES: Record<QuoteStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-info/10 text-info',
  accepted: 'bg-success/10 text-success',
  declined: 'bg-destructive/10 text-destructive',
  expired: 'bg-warning/10 text-warning',
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', QUOTE_STYLES[status])}>
      {QUOTE_STATUS_LABELS[status]}
    </span>
  );
}
