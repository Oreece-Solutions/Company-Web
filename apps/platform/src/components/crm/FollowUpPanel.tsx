import { useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';
import { Button, Checkbox, Input } from '@company-web/shared/ui';
import { cn } from '@company-web/shared/utils';
import { useSales } from '@/contexts/SalesContext';
import { useAuth } from '@/contexts/AuthContext';
import { FollowUp } from '@/types/crm';
import { SelectField } from './SelectField';

function followUpDueLabel(dueDate: string, today = format(new Date(), 'yyyy-MM-dd')) {
  if (dueDate < today) return { label: `Overdue · ${format(parseISO(dueDate), 'MMM d')}`, tone: 'overdue' as const };
  if (dueDate === today) return { label: 'Today', tone: 'today' as const };
  return { label: format(parseISO(dueDate), 'EEE, MMM d'), tone: 'upcoming' as const };
}

export function FollowUpRow({ followUp, context }: { followUp: FollowUp; context?: React.ReactNode }) {
  const { setFollowUpDone, deleteFollowUp, getMemberName } = useSales();
  const due = followUpDueLabel(followUp.dueDate);
  const done = !!followUp.completedAt;
  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border p-3">
      <Checkbox checked={done} onCheckedChange={(v) => setFollowUpDone(followUp.id, v === true)} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', done && 'text-muted-foreground line-through')}>{followUp.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          <span className={cn(!done && due.tone === 'overdue' && 'font-medium text-destructive', !done && due.tone === 'today' && 'font-medium text-warning')}>
            {due.label}
          </span>
          {' · '}
          {getMemberName(followUp.assignedTo)}
          {context}
        </p>
      </div>
      <button onClick={() => deleteFollowUp(followUp.id)} className="opacity-0 transition-opacity group-hover:opacity-100" title="Delete follow-up">
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </button>
    </div>
  );
}

interface FollowUpPanelProps {
  clientId: string;
  dealId?: string;
}

export function FollowUpPanel({ clientId, dealId }: FollowUpPanelProps) {
  const { followUps, addFollowUp, teamMembers } = useSales();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 2), 'yyyy-MM-dd'));
  const [assignedTo, setAssignedTo] = useState(user?.id || '');
  const [showDone, setShowDone] = useState(false);

  const items = followUps.filter((f) => f.clientId === clientId && (!dealId || f.dealId === dealId));
  const open = items.filter((f) => !f.completedAt);
  const done = items.filter((f) => f.completedAt);

  const handleAdd = async () => {
    if (!title.trim() || !dueDate) return;
    const saved = await addFollowUp({ clientId, dealId, title: title.trim(), dueDate, assignedTo: assignedTo || undefined });
    if (saved) setTitle('');
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">Follow-ups</h2>
        <span className="ml-auto text-xs text-muted-foreground">{open.length} open</span>
      </div>
      <div className="space-y-2 border-b border-border p-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Next step, e.g. Send revised proposal" onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
        <div className="flex gap-2">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-[160px]" />
          <SelectField
            className="flex-1"
            value={assignedTo}
            onChange={setAssignedTo}
            placeholder="Assign to"
            options={teamMembers.map((m) => ({ value: m.userId, label: m.fullName }))}
          />
          <Button size="icon" onClick={handleAdd} disabled={!title.trim() || !dueDate} className="shrink-0 bg-accent hover:bg-accent/90" title="Add follow-up">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-2 p-4">
        {open.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No open follow-ups.</p>}
        {open.map((f) => <FollowUpRow key={f.id} followUp={f} />)}
        {done.length > 0 && (
          <button onClick={() => setShowDone(!showDone)} className="pt-1 text-xs text-muted-foreground hover:text-foreground">
            {showDone ? 'Hide' : 'Show'} {done.length} completed
          </button>
        )}
        {showDone && done.map((f) => <FollowUpRow key={f.id} followUp={f} />)}
      </div>
    </div>
  );
}
