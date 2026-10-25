import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@company-web/shared/ui';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { Deal } from '@/types/crm';
import { formatMoney } from '@/lib/money';

const LOST_REASONS = ['Price', 'Chose a competitor', 'No budget', 'No decision / went quiet', 'Timing', 'Not a fit'];

interface DialogProps {
  deal: Deal | null;
  onOpenChange: (open: boolean) => void;
}

export function WinDealDialog({ deal, onOpenChange }: DialogProps) {
  const navigate = useNavigate();
  const { refetch } = useAppStore();
  const { winDeal } = useSales();
  const [createProject, setCreateProject] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const confirm = async () => {
    if (!deal) return;
    setIsSaving(true);
    const result = await winDeal(deal.id, createProject && !deal.projectId);
    setIsSaving(false);
    if (!result.ok) return;
    // The database also activated the account and may have created a project.
    await refetch();
    onOpenChange(false);
    if (result.projectId && !deal.projectId) navigate(`/projects/${result.projectId}`);
  };

  return (
    <Dialog open={!!deal} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Mark deal as won</DialogTitle>
          <DialogDescription>
            {deal && `${deal.title} — ${formatMoney(deal.value, deal.currency)}`}
          </DialogDescription>
        </DialogHeader>
        {deal && !deal.projectId && (
          <label className="flex items-start gap-3 rounded-lg border border-border p-3">
            <Checkbox checked={createProject} onCheckedChange={(v) => setCreateProject(v === true)} className="mt-0.5" />
            <span className="text-sm">
              <span className="font-medium">Create a delivery project</span>
              <span className="block text-muted-foreground">Opens a project for this account with the deal value as its budget.</span>
            </span>
          </label>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={confirm} disabled={isSaving} className="bg-success text-success-foreground hover:bg-success/90">
            Mark as won
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LoseDealDialog({ deal, onOpenChange }: DialogProps) {
  const { moveDealStage } = useSales();
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const confirm = async () => {
    if (!deal || !reason.trim()) return;
    setIsSaving(true);
    const updated = await moveDealStage(deal.id, 'lost', reason.trim());
    setIsSaving(false);
    if (updated) {
      setReason('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={!!deal} onOpenChange={(open) => { if (!open) setReason(''); onOpenChange(open); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Mark deal as lost</DialogTitle>
          <DialogDescription>Recording why helps spot patterns in lost deals.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {LOST_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${reason === r ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
            >
              {r}
            </button>
          ))}
        </div>
        <div>
          <Label htmlFor="lost-reason">Reason *</Label>
          <Textarea id="lost-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="mt-1.5" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={confirm} disabled={isSaving || !reason.trim()} variant="destructive">
            Mark as lost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
