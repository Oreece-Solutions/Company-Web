import { InvoiceStatus, CURRENCY_SYMBOLS, Currency } from '@/types/invoice';
import { cn } from '@company-web/shared/utils';
import { Badge } from '@company-web/shared/ui';

interface StatusBadgeProps {
  status: InvoiceStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'capitalize font-medium px-2.5 py-0.5',
        status === 'paid' && 'border-success/30 bg-success/10 text-success',
        status === 'partially_paid' && 'border-amber-500/30 bg-amber-500/10 text-amber-600',
        status === 'unpaid' && 'border-warning/30 bg-warning/10 text-warning'
      )}
    >
      {status === 'partially_paid' ? 'Partially Paid' : status}
    </Badge>
  );
}

interface CurrencyDisplayProps {
  amount: number;
  currency: Currency;
  className?: string;
}

export function CurrencyDisplay({ amount, currency, className }: CurrencyDisplayProps) {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return (
    <span className={cn('font-mono', className)}>
      {CURRENCY_SYMBOLS[currency]}{formatted}
    </span>
  );
}
