import { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Label, Textarea,
} from '@company-web/shared/ui';
import { useHq } from '@/contexts/HqContext';
import { SelectField } from '@/components/crm/SelectField';
import { Prospect } from '@/types/hq';
import { Channel, CHANNEL_LABELS, LogContactInput } from '@/types/sales';

type Kind = LogContactInput['kind'];

const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: 'contact', label: 'Contacted them', hint: 'Email, call, message or form sent. First contact or follow-up is worked out for you.' },
  { value: 'conversation', label: 'Had a conversation', hint: 'They replied or you spoke properly.' },
  { value: 'note', label: 'Note only', hint: 'Something worth remembering; no contact made.' },
];

const defaultNext = (kind: Kind) =>
  kind === 'contact'
    ? { action: 'Follow up (once)', date: format(addDays(new Date(), 5), 'yyyy-MM-dd') }
    : kind === 'conversation'
      ? { action: 'Book a discovery call', date: format(addDays(new Date(), 1), 'yyyy-MM-dd') }
      : null;

interface Props {
  prospect: Prospect | null;
  initialKind?: Kind;
  onOpenChange: (open: boolean) => void;
}

// The rep's main action. Every save leaves the prospect with a next step.
export function LogContactDialog({ prospect, initialKind = 'contact', onOpenChange }: Props) {
  const { services, logContact, updateProspect } = useHq();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [channel, setChannel] = useState<Channel | ''>('');
  const [outcome, setOutcome] = useState('');
  const [objection, setObjection] = useState('');
  const [offer, setOffer] = useState('');
  const [notes, setNotes] = useState('');
  const [consentBasis, setConsentBasis] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!prospect) return;
    const next = defaultNext(initialKind);
    setKind(initialKind);
    setChannel('');
    setOutcome('');
    setObjection('');
    setOffer('');
    setNotes('');
    setConsentBasis(prospect.consentBasis || '');
    setNextAction(next?.action ?? prospect.nextAction ?? '');
    setNextActionDate(next?.date ?? prospect.nextActionDate ?? '');
    setError('');
  }, [prospect, initialKind]);

  const changeKind = (k: Kind) => {
    setKind(k);
    const next = defaultNext(k);
    if (next) {
      setNextAction(next.action);
      setNextActionDate(next.date);
    } else if (prospect) {
      setNextAction(prospect.nextAction || '');
      setNextActionDate(prospect.nextActionDate || '');
    }
  };

  const closed = prospect ? ['converted', 'disqualified'].includes(prospect.stage) : false;
  const needsConsent = kind !== 'note' && !prospect?.consentBasis;

  const save = async () => {
    if (!prospect) return;
    if (kind !== 'note' && !channel) return setError('Choose how you contacted them');
    if (needsConsent && !consentBasis.trim()) return setError('Record why contacting them is allowed');
    if (!closed && (!nextAction.trim() || !nextActionDate)) return setError('Every prospect needs a next action and a date');
    setError('');
    setSaving(true);
    if (needsConsent) {
      const ok = await updateProspect(prospect.id, { consentBasis }, { silent: true });
      if (!ok) return setSaving(false);
    }
    const ok = await logContact(prospect.id, { kind, channel, outcome, objection, offer, notes, nextAction, nextActionDate });
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  const offers = services.filter((s) => s.active).map((s) => ({ value: s.name, label: s.name }));

  return (
    <Dialog open={!!prospect} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Log activity · {prospect?.businessName}</DialogTitle>
          <DialogDescription>Record what happened and what happens next.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="What happened">
            {KINDS.filter((k) => !closed || k.value === 'note').map((k) => (
              <button key={k.value} type="button" role="radio" aria-checked={kind === k.value} onClick={() => changeKind(k.value)}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${kind === k.value ? 'border-accent bg-accent/5' : 'border-border hover:bg-muted/40'}`}>
                <span className="font-medium">{k.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{k.hint}</span>
              </button>
            ))}
          </div>

          {kind !== 'note' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="log-channel">Channel *</Label>
                <SelectField id="log-channel" className="mt-1.5" value={channel} onChange={(v) => setChannel(v as Channel)} placeholder="How?"
                  options={Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label }))} />
              </div>
              <div>
                <Label htmlFor="log-offer">Offer put to them</Label>
                <SelectField id="log-offer" className="mt-1.5" value={offer} onChange={setOffer} noneLabel="None yet" options={offers} />
              </div>
            </div>
          )}

          {needsConsent && (
            <div>
              <Label htmlFor="log-consent">Why contacting them is allowed *</Label>
              <Input id="log-consent" className="mt-1.5" value={consentBasis} onChange={(e) => setConsentBasis(e.target.value)}
                placeholder="Published business email, about their business" />
            </div>
          )}

          {kind !== 'note' && (
            <>
              <div>
                <Label htmlFor="log-outcome">Outcome</Label>
                <Input id="log-outcome" className="mt-1.5" value={outcome} onChange={(e) => setOutcome(e.target.value)}
                  placeholder={kind === 'contact' ? 'Sent first email / left voicemail' : 'Interested; manages quotes by phone'} />
              </div>
              <div>
                <Label htmlFor="log-objection">Objection raised (their words)</Label>
                <Input id="log-objection" className="mt-1.5" value={objection} onChange={(e) => setObjection(e.target.value)}
                  placeholder="We already have a website" />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="log-notes">Notes</Label>
            <Textarea id="log-notes" rows={2} className="mt-1.5" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {!closed && (
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <div>
                <Label htmlFor="log-next">Next action *</Label>
                <Input id="log-next" className="mt-1.5" value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="log-next-date">Due *</Label>
                <Input id="log-next-date" type="date" className="mt-1.5" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-accent hover:bg-accent/90" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
