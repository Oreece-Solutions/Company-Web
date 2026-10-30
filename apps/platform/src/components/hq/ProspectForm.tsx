import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label, Textarea } from '@company-web/shared/ui';
import { SelectField } from '@/components/crm/SelectField';
import { CURRENCIES } from '@/types/invoice';
import { OUTREACH_STAGES, Prospect, ProspectInput, PROSPECT_STAGES, PROSPECT_STAGE_LABELS } from '@/types/hq';
import { Segment, SEGMENT_LABELS, TeamMember } from '@/types/sales';

const schema = z
  .object({
    businessName: z.string().trim().min(1, 'Business name is required'),
    website: z.string().optional(),
    industry: z.string().optional(),
    location: z.string().optional(),
    contactChannel: z.string().optional(),
    leadSource: z.string().optional(),
    observedProblem: z.string().optional(),
    evidence: z.string().optional(),
    tier: z.string().optional(),
    stage: z.enum(PROSPECT_STAGES as [string, ...string[]]),
    consentBasis: z.string().optional(),
    nextAction: z.string().optional(),
    nextActionDate: z.string().optional(),
    estimatedValue: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
    currency: z.string(),
    notes: z.string().optional(),
    disqualifiedReason: z.string().optional(),
    segment: z.string().optional(),
    assignedTo: z.string().optional(),
  })
  // Same rules as the database, checked before saving.
  .refine((d) => !d.observedProblem?.trim() || !!d.evidence?.trim(), {
    path: ['evidence'],
    message: 'Say how you know (e.g. "Visited site 25 Oct: email link broken")',
  })
  .refine((d) => !OUTREACH_STAGES.includes(d.stage as Prospect['stage']) || !!d.consentBasis?.trim(), {
    path: ['consentBasis'],
    message: 'Needed before contacting them (e.g. "Published business phone")',
  })
  .refine((d) => d.stage !== 'disqualified' || !!d.disqualifiedReason?.trim(), {
    path: ['disqualifiedReason'],
    message: 'Say why',
  })
  // Once research is done, every open prospect has a clear next step.
  .refine((d) => ['researching', 'converted', 'disqualified'].includes(d.stage) || (!!d.nextAction?.trim() && !!d.nextActionDate), {
    path: ['nextAction'],
    message: 'Set the next action and its date',
  });

type FormData = z.infer<typeof schema>;

interface ProspectFormProps {
  initialData?: Prospect;
  team?: TeamMember[];
  onSubmit: (data: ProspectInput) => void;
  onCancel: () => void;
}

export function ProspectForm({ initialData, team = [], onSubmit, onCancel }: ProspectFormProps) {
  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      businessName: initialData?.businessName || '',
      website: initialData?.website || '',
      industry: initialData?.industry || '',
      location: initialData?.location || 'Auckland',
      contactChannel: initialData?.contactChannel || '',
      leadSource: initialData?.leadSource || 'Web research',
      observedProblem: initialData?.observedProblem || '',
      evidence: initialData?.evidence || '',
      tier: initialData?.tier || '',
      stage: initialData?.stage || 'researching',
      consentBasis: initialData?.consentBasis || '',
      nextAction: initialData?.nextAction || '',
      nextActionDate: initialData?.nextActionDate || '',
      estimatedValue: initialData?.estimatedValue ?? '',
      currency: initialData?.currency || 'NZD',
      notes: initialData?.notes || '',
      disqualifiedReason: initialData?.disqualifiedReason || '',
      segment: initialData?.segment || '',
      assignedTo: initialData?.assignedTo || '',
    },
  });
  const stage = watch('stage');

  const submit = (d: FormData) =>
    onSubmit({
      businessName: d.businessName,
      website: d.website,
      industry: d.industry,
      location: d.location,
      contactChannel: d.contactChannel,
      leadSource: d.leadSource,
      observedProblem: d.observedProblem,
      evidence: d.evidence,
      tier: (d.tier || undefined) as Prospect['tier'],
      stage: d.stage as Prospect['stage'],
      consentBasis: d.consentBasis,
      nextAction: d.nextAction,
      nextActionDate: d.nextActionDate,
      estimatedValue: d.estimatedValue === '' || d.estimatedValue === undefined ? undefined : Number(d.estimatedValue),
      currency: d.currency as Prospect['currency'],
      notes: d.notes,
      disqualifiedReason: d.disqualifiedReason,
      segment: (d.segment || '') as Segment | '',
      // New prospects default to whoever adds them (database default).
      assignedTo: d.assignedTo || (initialData ? '' : undefined),
    });

  const err = (name: keyof FormData) =>
    errors[name] && <p className="mt-1 text-sm text-destructive">{errors[name]?.message as string}</p>;

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="businessName">Business *</Label>
          <Input id="businessName" {...register('businessName')} className="mt-1.5" placeholder="Sample Cleaning Co" />
          {err('businessName')}
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input id="website" {...register('website')} className="mt-1.5" placeholder="https://example.co.nz" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="segment">Segment</Label>
          <Controller
            control={control}
            name="segment"
            render={({ field }) => (
              <SelectField id="segment" className="mt-1.5" value={field.value} onChange={field.onChange} noneLabel="Not set"
                options={Object.entries(SEGMENT_LABELS).map(([value, label]) => ({ value, label }))} />
            )}
          />
        </div>
        <div>
          <Label htmlFor="assignedTo">Owner</Label>
          <Controller
            control={control}
            name="assignedTo"
            render={({ field }) => (
              <SelectField id="assignedTo" className="mt-1.5" value={field.value} onChange={field.onChange}
                noneLabel={initialData ? 'Nobody' : 'Me'}
                options={team.map((m) => ({ value: m.userId, label: m.fullName || 'Team member' }))} />
            )}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" {...register('industry')} className="mt-1.5" placeholder="Cleaning" />
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...register('location')} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="tier">Tier</Label>
          <Controller
            control={control}
            name="tier"
            render={({ field }) => (
              <SelectField
                id="tier"
                className="mt-1.5"
                value={field.value}
                onChange={field.onChange}
                noneLabel="No tier"
                options={[
                  { value: 'A', label: 'A: clear problem' },
                  { value: 'B', label: 'B: smaller gap' },
                  { value: 'C', label: 'C: no website' },
                ]}
              />
            )}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="observedProblem">Problem you saw</Label>
        <Textarea id="observedProblem" {...register('observedProblem')} className="mt-1.5" rows={2} placeholder="Email button on the site is broken" />
      </div>
      <div>
        <Label htmlFor="evidence">Evidence</Label>
        <Input id="evidence" {...register('evidence')} className="mt-1.5" placeholder="Checked page source, 25 Oct 2026" />
        {err('evidence')}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contactChannel">How to contact</Label>
          <Input id="contactChannel" {...register('contactChannel')} className="mt-1.5" placeholder="Published phone / contact form" />
        </div>
        <div>
          <Label htmlFor="leadSource">Lead source</Label>
          <Input id="leadSource" {...register('leadSource')} className="mt-1.5" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="stage">Stage</Label>
          <Controller
            control={control}
            name="stage"
            render={({ field }) => (
              <SelectField
                id="stage"
                className="mt-1.5"
                value={field.value}
                onChange={field.onChange}
                options={PROSPECT_STAGES.filter((s) => s !== 'converted').map((s) => ({ value: s, label: PROSPECT_STAGE_LABELS[s] }))}
                disabled={initialData?.stage === 'converted'}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="consentBasis">Why contacting them is allowed</Label>
          <Input id="consentBasis" {...register('consentBasis')} className="mt-1.5" placeholder="Published business phone" />
          {err('consentBasis')}
        </div>
      </div>
      {stage === 'disqualified' && (
        <div>
          <Label htmlFor="disqualifiedReason">Reason for disqualifying</Label>
          <Input id="disqualifiedReason" {...register('disqualifiedReason')} className="mt-1.5" placeholder="Franchise, run by head office" />
          {err('disqualifiedReason')}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <div>
          <Label htmlFor="nextAction">Next action</Label>
          <Input id="nextAction" {...register('nextAction')} className="mt-1.5" placeholder="Call and mention the broken email link" />
          {err('nextAction')}
        </div>
        <div>
          <Label htmlFor="nextActionDate">Due</Label>
          <Input id="nextActionDate" type="date" {...register('nextActionDate')} className="mt-1.5" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <div>
          <Label htmlFor="estimatedValue">Estimated value (an estimate, not a quote)</Label>
          <Input id="estimatedValue" type="number" step="0.01" {...register('estimatedValue')} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <SelectField id="currency" className="mt-1.5" value={field.value} onChange={field.onChange}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            )}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register('notes')} className="mt-1.5" rows={2} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-accent hover:bg-accent/90">
          {initialData ? 'Save' : 'Add prospect'}
        </Button>
      </div>
    </form>
  );
}
