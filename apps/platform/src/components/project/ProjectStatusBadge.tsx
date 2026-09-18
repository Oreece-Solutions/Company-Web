import { cn } from '@company-web/shared/utils';
import { Project } from '@/types/project';
import { PROJECT_STATUS_LABELS } from '@/types/project';

const STATUS_STYLES: Record<Project['status'], string> = {
  planning: 'bg-info/10 text-info',
  active: 'bg-success/10 text-success',
  on_hold: 'bg-warning/10 text-warning',
  completed: 'bg-muted text-muted-foreground',
};

export function ProjectStatusBadge({ status }: { status: Project['status'] }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[status])}>
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}
