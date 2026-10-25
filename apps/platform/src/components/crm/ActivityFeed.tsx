import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Phone, Mail, Users as MeetingIcon, StickyNote, Send, ArrowRightLeft } from 'lucide-react';
import { Button, Textarea } from '@company-web/shared/ui';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { ClientActivity } from '@/types/invoice';
import { DealStageChange, DEAL_STAGE_LABELS } from '@/types/crm';
import { SelectField } from './SelectField';

const TYPE_ICON: Record<ClientActivity['type'], typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: MeetingIcon,
  note: StickyNote,
};

const TYPE_LABEL: Record<ClientActivity['type'], string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  note: 'Note',
};

interface ActivityFeedProps {
  clientId: string;
  // On a deal page: new entries are linked to the deal and only its entries
  // (plus its stage history) are shown.
  dealId?: string;
  stageChanges?: DealStageChange[];
}

type FeedEntry =
  | { kind: 'activity'; at: string; activity: ClientActivity }
  | { kind: 'stage'; at: string; change: DealStageChange };

export function ActivityFeed({ clientId, dealId, stageChanges = [] }: ActivityFeedProps) {
  const { activities, addActivity } = useAppStore();
  const { getContactsForClient, getDeal, getMemberName } = useSales();
  const [type, setType] = useState<ClientActivity['type']>('call');
  const [contactId, setContactId] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const contacts = getContactsForClient(clientId);
  const entries: FeedEntry[] = [
    ...activities
      .filter((a) => a.clientId === clientId && (!dealId || a.dealId === dealId))
      .map((a) => ({ kind: 'activity' as const, at: a.createdAt, activity: a })),
    ...stageChanges.map((c) => ({ kind: 'stage' as const, at: c.changedAt, change: c })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const handleAdd = async () => {
    if (!note.trim()) return;
    setIsSaving(true);
    const saved = await addActivity(clientId, { type, note: note.trim(), dealId, contactId: contactId || undefined });
    setIsSaving(false);
    if (saved) setNote('');
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold">Activity</h2>
        <p className="text-sm text-muted-foreground">Calls, emails, meetings and notes</p>
      </div>
      <div className="space-y-2 border-b border-border p-4">
        <div className="flex flex-wrap gap-2">
          <SelectField
            className="w-[130px]"
            value={type}
            onChange={(v) => setType(v as ClientActivity['type'])}
            options={(Object.keys(TYPE_LABEL) as ClientActivity['type'][]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
          />
          {contacts.length > 0 && (
            <SelectField
              className="w-[200px]"
              value={contactId}
              onChange={setContactId}
              noneLabel="No contact"
              options={contacts.map((c) => ({ value: c.id, label: c.fullName }))}
            />
          )}
        </div>
        <div className="flex gap-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened? What was agreed?"
            rows={2}
            className="flex-1"
          />
          <Button size="icon" onClick={handleAdd} disabled={isSaving || !note.trim()} className="shrink-0 self-end bg-accent hover:bg-accent/90" title="Log activity">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="max-h-[480px] space-y-3 overflow-y-auto p-4">
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          entries.map((entry) => {
            if (entry.kind === 'stage') {
              const { change } = entry;
              return (
                <div key={`s-${change.id}`} className="flex items-center gap-3 px-1 text-sm text-muted-foreground">
                  <ArrowRightLeft className="h-4 w-4 shrink-0" />
                  <span className="flex-1">
                    {change.fromStage
                      ? `Moved from ${DEAL_STAGE_LABELS[change.fromStage]} to ${DEAL_STAGE_LABELS[change.toStage]}`
                      : `Created in ${DEAL_STAGE_LABELS[change.toStage]}`}
                    {change.changedBy && ` by ${getMemberName(change.changedBy)}`}
                  </span>
                  <span className="text-xs">{formatDistanceToNow(new Date(change.changedAt), { addSuffix: true })}</span>
                </div>
              );
            }
            const { activity } = entry;
            const Icon = TYPE_ICON[activity.type] || StickyNote;
            const contact = activity.contactId ? contacts.find((c) => c.id === activity.contactId) : undefined;
            const deal = !dealId && activity.dealId ? getDeal(activity.dealId) : undefined;
            return (
              <div key={activity.id} className="flex gap-3 rounded-lg border border-border p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {TYPE_LABEL[activity.type] || activity.type}
                      {contact && <span className="font-normal text-muted-foreground"> with {contact.fullName}</span>}
                      {deal && (
                        <span className="font-normal text-muted-foreground">
                          {' · '}
                          <Link to={`/deals/${deal.id}`} className="hover:underline">{deal.title}</Link>
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {activity.createdBy ? `${getMemberName(activity.createdBy)} · ` : ''}
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{activity.note}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
