import { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Label, Textarea,
} from '@company-web/shared/ui';
import { useHq } from '@/contexts/HqContext';
import { Prospect } from '@/types/hq';

// Books the founder's discovery call; the prospect moves to "Conversation booked"
// and the call shows on the founder's Today screen.
export function BookDiscoveryDialog({ prospect, onOpenChange }: { prospect: Prospect | null; onOpenChange: (open: boolean) => void }) {
  const { bookDiscovery } = useHq();
  const [at, setAt] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!prospect) return;
    setAt(prospect.discoveryAt
      ? format(new Date(prospect.discoveryAt), "yyyy-MM-dd'T'HH:mm")
      : `${format(addDays(new Date(), 2), 'yyyy-MM-dd')}T10:00`);
    setNotes('');
  }, [prospect]);

  const save = async () => {
    if (!prospect || !at) return;
    setSaving(true);
    // datetime-local is the browser's local time; send it as an instant.
    const ok = await bookDiscovery(prospect.id, new Date(at).toISOString(), notes);
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={!!prospect} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{prospect?.discoveryAt ? 'Move' : 'Book'} discovery call · {prospect?.businessName}</DialogTitle>
          <DialogDescription>20–30 minutes with the founder. Only book times already agreed with the business.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="disc-at">Date and time *</Label>
            <Input id="disc-at" type="datetime-local" className="mt-1.5" value={at} onChange={(e) => setAt(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="disc-notes">Notes for the founder</Label>
            <Textarea id="disc-notes" rows={3} className="mt-1.5" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Who will be on the call, what they care about, best number" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-accent hover:bg-accent/90" disabled={saving || !at} onClick={save}>{saving ? 'Booking…' : 'Book call'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
