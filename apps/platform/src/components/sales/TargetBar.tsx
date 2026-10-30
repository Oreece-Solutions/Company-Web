import { cn } from '@company-web/shared/utils';

// Actual against a min–max target: below min = warning, in range = success.
export function TargetBar({ label, actual, min, max }: { label: string; actual: number; min?: number; max?: number }) {
  const top = Math.max(max ?? min ?? 0, actual, 1);
  const tone = min === undefined ? 'bg-accent' : actual >= min ? 'bg-success' : 'bg-warning';
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tabular-nums">
          <span className="font-semibold">{actual}</span>
          {min !== undefined && <span className="text-muted-foreground"> / {min}{max !== undefined && max !== min ? `–${max}` : ''}</span>}
        </span>
      </div>
      <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={label}
        aria-valuenow={actual} aria-valuemin={0} aria-valuemax={max ?? min}>
        <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${Math.min(100, (actual / top) * 100)}%` }} />
        {min !== undefined && <div className="absolute top-0 h-full w-px bg-foreground/40" style={{ left: `${(min / top) * 100}%` }} />}
      </div>
    </div>
  );
}
