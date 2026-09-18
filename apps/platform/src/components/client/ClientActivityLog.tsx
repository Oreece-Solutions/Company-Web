import { useState } from 'react';
import { Phone, Mail, Users as MeetingIcon, StickyNote, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@company-web/shared/ui';
import { useAppStore } from '@/contexts/StoreContext';
import { Client, ClientActivity } from '@/types/invoice';
import { formatDistanceToNow } from 'date-fns';

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

interface ClientActivityLogProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientActivityLog({ client, open, onOpenChange }: ClientActivityLogProps) {
  const { getActivitiesForClient, addActivity } = useAppStore();
  const [type, setType] = useState<ClientActivity['type']>('note');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const activities = getActivitiesForClient(client.id);

  const handleAdd = async () => {
    if (!note.trim()) return;
    setIsSaving(true);
    await addActivity(client.id, { type, note: note.trim() });
    setNote('');
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{client.name} — Activity</DialogTitle>
          <DialogDescription>Calls, emails, meetings and notes logged for this client.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Select value={type} onValueChange={(v) => setType(v as ClientActivity['type'])}>
            <SelectTrigger className="w-[140px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_LABEL) as ClientActivity['type'][]).map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened?"
            rows={2}
            className="flex-1"
          />
          <Button size="icon" onClick={handleAdd} disabled={isSaving || !note.trim()} className="shrink-0 bg-accent hover:bg-accent/90">
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
          {activities.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No activity logged yet.</p>
          ) : (
            activities.map((activity) => {
              const Icon = TYPE_ICON[activity.type];
              return (
                <div key={activity.id} className="flex gap-3 rounded-lg border border-border p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{TYPE_LABEL[activity.type]}</span>
                      <span className="text-xs text-muted-foreground">
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
      </DialogContent>
    </Dialog>
  );
}
