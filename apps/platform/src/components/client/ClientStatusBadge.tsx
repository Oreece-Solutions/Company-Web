import { cn } from '@company-web/shared/utils';
import { Client } from '@/types/invoice';

const STATUS_STYLES: Record<Client['status'], string> = {
  lead: 'bg-info/10 text-info',
  prospect: 'bg-warning/10 text-warning',
  active: 'bg-success/10 text-success',
  inactive: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<Client['status'], string> = {
  lead: 'Lead',
  prospect: 'Prospect',
  active: 'Active',
  inactive: 'Inactive',
};

export function ClientStatusBadge({ status }: { status: Client['status'] }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
