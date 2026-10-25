import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@company-web/shared/ui';

const NONE = '__none__';

interface SelectFieldProps {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  // Adds a "none" option that maps to an empty string (Radix Select cannot
  // hold an empty value itself).
  noneLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function SelectField({ id, value, onChange, options, placeholder, noneLabel, className, disabled }: SelectFieldProps) {
  return (
    <Select
      value={value ? value : noneLabel ? NONE : undefined}
      onValueChange={(v) => onChange(v === NONE ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {noneLabel && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
