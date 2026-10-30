import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useSalesDept } from '@/contexts/SalesDeptContext';
import { Prospect } from '@/types/hq';
import { ACTIVITY_LABELS, CHANNEL_LABELS, SalesActivity } from '@/types/sales';

// Everything done with a prospect, newest first. Reloads when the prospect changes.
export function ProspectTimeline({ prospect }: { prospect: Prospect }) {
  const { activitiesFor, memberName } = useSalesDept();
  const [items, setItems] = useState<SalesActivity[] | null>(null);

  useEffect(() => {
    let live = true;
    activitiesFor(prospect.id).then((a) => live && setItems(a));
    return () => { live = false; };
  }, [prospect.id, prospect.updatedAt, activitiesFor]);

  if (!items) return <p className="text-muted-foreground">Loading history…</p>;
  if (!items.length) return <p className="text-muted-foreground">No activity yet.</p>;
  return (
    <ol className="space-y-3 border-l border-border pl-4">
      {items.map((a) => (
        <li key={a.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-accent" />
          <p>
            <span className="font-medium">{ACTIVITY_LABELS[a.kind]}</span>
            {a.channel && <span className="text-muted-foreground"> · {CHANNEL_LABELS[a.channel]}</span>}
            {a.offer && <span className="text-muted-foreground"> · offered {a.offer}</span>}
          </p>
          {a.outcome && <p>{a.outcome}</p>}
          {a.objection && <p className="text-warning">Objection: {a.objection}</p>}
          {a.notes && <p className="whitespace-pre-line text-muted-foreground">{a.notes}</p>}
          <p className="text-xs text-muted-foreground">{format(parseISO(a.occurredAt), 'd MMM yyyy, HH:mm')} · {memberName(a.userId) ?? 'System'}</p>
        </li>
      ))}
    </ol>
  );
}
