import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';
import { SalesTarget } from '@/types/sales';

// Sales weeks run Monday to Sunday (targets are per week).
export function weekRange(offsetWeeks = 0, now = new Date()) {
  const start = addDays(startOfWeek(now, { weekStartsOn: 1 }), offsetWeeks * 7);
  return { from: format(start, 'yyyy-MM-dd'), to: format(addDays(start, 6), 'yyyy-MM-dd') };
}

// A weekly target stretched or shrunk to a date range (e.g. 30 days ≈ 4.3 weeks).
export function scaledTarget(t: SalesTarget | undefined, from: string, to: string) {
  if (!t) return undefined;
  const weeks = (differenceInCalendarDays(parseISO(to), parseISO(from)) + 1) / 7;
  return {
    min: Math.round(t.weeklyMin * weeks),
    max: t.weeklyMax !== undefined ? Math.round(t.weeklyMax * weeks) : undefined,
  };
}

// Day (yyyy-MM-dd) an activity happened, in the browser's time zone.
export const activityDay = (iso: string) => format(new Date(iso), 'yyyy-MM-dd');

export const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '—');
