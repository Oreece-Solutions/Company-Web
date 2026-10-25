import { useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label } from '@company-web/shared/ui';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { useAuth } from '@/contexts/AuthContext';
import { SelectField } from './SelectField';
import { CURRENCIES, Currency } from '@/types/invoice';
import { Deal, DEAL_STAGE_LABELS, DEAL_STAGE_PROBABILITY, LEAD_SOURCES, OPEN_DEAL_STAGES, SERVICE_TYPES } from '@/types/crm';
import { DealInput } from '@/hooks/useSalesStore';

const dealSchema = z.object({
  title: z.string().trim().min(1, 'Give the deal a name'),
  clientId: z.string().min(1, 'Choose an account'),
  contactId: z.string().optional(),
  stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation']),
  value: z.coerce.number().min(0, 'Value cannot be negative'),
  currency: z.enum(['LKR', 'NZD', 'AUD', 'USD', 'EUR', 'GBP']),
  probability: z.coerce.number().int().min(0).max(100),
  expectedCloseDate: z.string().optional(),
  serviceType: z.string().optional(),
  source: z.string().optional(),
  ownerId: z.string().optional(),
});

type DealFormData = z.infer<typeof dealSchema>;

interface DealFormProps {
  initialData?: Deal;
  // Pre-selects (and locks) the account when adding from an account page.
  clientId?: string;
  onSubmit: (data: DealInput) => void;
  onCancel: () => void;
}

export function DealForm({ initialData, clientId, onSubmit, onCancel }: DealFormProps) {
  const { clients, company } = useAppStore();
  const { teamMembers, getContactsForClient } = useSales();
  const { user } = useAuth();
  const isClosed = initialData && (initialData.stage === 'won' || initialData.stage === 'lost');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getFieldState,
    formState: { errors, isSubmitting },
  } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: initialData?.title || '',
      clientId: initialData?.clientId || clientId || '',
      contactId: initialData?.contactId || '',
      stage: initialData && !isClosed ? (initialData.stage as DealFormData['stage']) : 'lead',
      value: initialData?.value ?? 0,
      currency: initialData?.currency || company.defaultCurrency || 'NZD',
      probability: initialData?.probability ?? DEAL_STAGE_PROBABILITY.lead,
      expectedCloseDate: initialData?.expectedCloseDate || '',
      serviceType: initialData?.serviceType || '',
      source: initialData?.source || '',
      ownerId: initialData?.ownerId || user?.id || '',
    },
  });

  const selectedClientId = watch('clientId');
  const stage = watch('stage');
  const contacts = selectedClientId ? getContactsForClient(selectedClientId) : [];

  // A stage change resets probability to that stage's default unless the
  // user has typed their own figure.
  const previousStage = useRef(stage);
  useEffect(() => {
    if (previousStage.current === stage) return;
    previousStage.current = stage;
    if (!getFieldState('probability').isDirty) {
      setValue('probability', DEAL_STAGE_PROBABILITY[stage]);
    }
  }, [stage, setValue, getFieldState]);

  const submit = (data: DealFormData) => {
    onSubmit({
      title: data.title,
      clientId: data.clientId,
      contactId: data.contactId || undefined,
      // A closed deal keeps its stage; it is reopened from the deal page.
      stage: isClosed ? initialData!.stage : data.stage,
      value: data.value,
      currency: data.currency as Currency,
      probability: data.probability,
      expectedCloseDate: data.expectedCloseDate || undefined,
      serviceType: data.serviceType || undefined,
      source: data.source || undefined,
      ownerId: data.ownerId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div>
        <Label htmlFor="title">Deal name *</Label>
        <Input id="title" {...register('title')} className="mt-1.5" placeholder="E-commerce website rebuild" />
        {errors.title && <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="clientId">Account *</Label>
          <Controller
            control={control}
            name="clientId"
            render={({ field }) => (
              <SelectField
                id="clientId"
                className="mt-1.5"
                value={field.value}
                onChange={(v) => { field.onChange(v); setValue('contactId', ''); }}
                placeholder="Choose an account"
                disabled={!!clientId || !!initialData}
                options={clients.map((c) => ({ value: c.id, label: c.companyName || c.name }))}
              />
            )}
          />
          {errors.clientId && <p className="mt-1 text-sm text-destructive">{errors.clientId.message}</p>}
        </div>
        <div>
          <Label htmlFor="contactId">Contact</Label>
          <Controller
            control={control}
            name="contactId"
            render={({ field }) => (
              <SelectField
                id="contactId"
                className="mt-1.5"
                value={field.value}
                onChange={field.onChange}
                noneLabel="No contact"
                disabled={!selectedClientId}
                options={contacts.map((c) => ({ value: c.id, label: c.jobTitle ? `${c.fullName} (${c.jobTitle})` : c.fullName }))}
              />
            )}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Label htmlFor="value">Value</Label>
          <Input id="value" type="number" step="0.01" min="0" {...register('value')} className="mt-1.5" />
          {errors.value && <p className="mt-1 text-sm text-destructive">{errors.value.message}</p>}
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <SelectField
                id="currency"
                className="mt-1.5"
                value={field.value}
                onChange={field.onChange}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              />
            )}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {!isClosed && (
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
                  options={OPEN_DEAL_STAGES.map((s) => ({ value: s, label: DEAL_STAGE_LABELS[s] }))}
                />
              )}
            />
          </div>
        )}
        <div>
          <Label htmlFor="probability">Win chance (%)</Label>
          <Input id="probability" type="number" min="0" max="100" {...register('probability')} className="mt-1.5" disabled={isClosed} />
          {errors.probability && <p className="mt-1 text-sm text-destructive">Enter 0–100</p>}
        </div>
        <div>
          <Label htmlFor="expectedCloseDate">Expected close</Label>
          <Input id="expectedCloseDate" type="date" {...register('expectedCloseDate')} className="mt-1.5" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="serviceType">Service</Label>
          <Controller
            control={control}
            name="serviceType"
            render={({ field }) => (
              <SelectField
                id="serviceType"
                className="mt-1.5"
                value={field.value}
                onChange={field.onChange}
                noneLabel="Not set"
                options={SERVICE_TYPES.map((s) => ({ value: s, label: s }))}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="source">Source</Label>
          <Controller
            control={control}
            name="source"
            render={({ field }) => (
              <SelectField
                id="source"
                className="mt-1.5"
                value={field.value}
                onChange={field.onChange}
                noneLabel="Not set"
                options={LEAD_SOURCES.map((s) => ({ value: s, label: s }))}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="ownerId">Owner</Label>
          <Controller
            control={control}
            name="ownerId"
            render={({ field }) => (
              <SelectField
                id="ownerId"
                className="mt-1.5"
                value={field.value}
                onChange={field.onChange}
                noneLabel="Unassigned"
                options={teamMembers.map((m) => ({ value: m.userId, label: m.fullName }))}
              />
            )}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-accent hover:bg-accent/90">
          {initialData ? 'Save Deal' : 'Create Deal'}
        </Button>
      </div>
    </form>
  );
}
