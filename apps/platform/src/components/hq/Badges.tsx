import { cn } from '@company-web/shared/utils';
import { ProspectStage, PROSPECT_STAGE_LABELS, ProspectTier } from '@/types/hq';
import { ProjectHealth, PROJECT_HEALTH_LABELS } from '@/types/project';

const pill = 'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium';

const STAGE_STYLES: Record<ProspectStage, string> = {
  researching: 'bg-muted text-muted-foreground',
  ready: 'bg-info/10 text-info',
  contacted: 'bg-accent/10 text-accent',
  follow_up_due: 'bg-warning/10 text-warning',
  conversation_booked: 'bg-success/10 text-success',
  nurture: 'bg-muted text-muted-foreground',
  converted: 'bg-success/10 text-success',
  disqualified: 'bg-destructive/10 text-destructive',
};

export function ProspectStageBadge({ stage }: { stage: ProspectStage }) {
  return <span className={cn(pill, STAGE_STYLES[stage])}>{PROSPECT_STAGE_LABELS[stage]}</span>;
}

const TIER_STYLES: Record<ProspectTier, string> = {
  A: 'bg-success/10 text-success',
  B: 'bg-warning/10 text-warning',
  C: 'bg-info/10 text-info',
};

export function TierBadge({ tier }: { tier?: ProspectTier }) {
  if (!tier) return null;
  return <span className={cn(pill, 'font-semibold', TIER_STYLES[tier])}>Tier {tier}</span>;
}

const HEALTH_STYLES: Record<ProjectHealth, string> = {
  on_track: 'bg-success/10 text-success',
  at_risk: 'bg-warning/10 text-warning',
  blocked: 'bg-destructive/10 text-destructive',
};

export function HealthBadge({ health }: { health: ProjectHealth }) {
  return <span className={cn(pill, HEALTH_STYLES[health])}>{PROJECT_HEALTH_LABELS[health]}</span>;
}
