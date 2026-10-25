import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@company-web/shared/ui';
import { Client } from '@/types/invoice';
import { LEAD_SOURCES } from '@/types/crm';
import { useSales } from '@/contexts/SalesContext';
import { SelectField } from '@/components/crm/SelectField';

const INDUSTRIES = ['Retail & e-commerce', 'Finance', 'Healthcare', 'Education', 'Hospitality & tourism', 'Manufacturing', 'Logistics', 'Professional services', 'Construction', 'Government & NGO', 'Technology', 'Other'];

const CLIENT_STATUSES: { value: Client['status']; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  companyName: z.string().optional(),
  // Leads often arrive with only a name and one way to reach them.
  address: z.string().optional(),
  email: z.string().email('Invalid email address').or(z.literal('')),
  phone: z.string().optional(),
  status: z.enum(['lead', 'prospect', 'active', 'inactive']),
  source: z.string().optional(),
  estimatedValue: z.coerce.number().optional(),
  industry: z.string().optional(),
  website: z.string().optional(),
  country: z.string().optional(),
  ownerId: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  initialData?: Client;
  onSubmit: (data: Omit<Client, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export function ClientForm({ initialData, onSubmit, onCancel }: ClientFormProps) {
  const { teamMembers } = useSales();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: initialData?.name || '',
      companyName: initialData?.companyName || '',
      address: initialData?.address || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      status: initialData?.status || 'active',
      source: initialData?.source || '',
      estimatedValue: initialData?.estimatedValue,
      industry: initialData?.industry || '',
      website: initialData?.website || '',
      country: initialData?.country || '',
      ownerId: initialData?.ownerId || '',
      notes: initialData?.notes || '',
    },
  });

  const submit = (data: ClientFormData) => {
    onSubmit({
      name: data.name,
      // Empty strings (not undefined) so a cleared field is saved as cleared.
      companyName: data.companyName || '',
      address: data.address || '',
      email: data.email || '',
      phone: data.phone || '',
      status: data.status,
      source: data.source || '',
      // An emptied number field arrives as 0 or NaN; store "not set".
      estimatedValue: Number.isFinite(data.estimatedValue) && data.estimatedValue ? data.estimatedValue : undefined,
      industry: data.industry || '',
      website: data.website || '',
      country: data.country || '',
      ownerId: data.ownerId || '',
      notes: data.notes || '',
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Contact Name *</Label>
        <Input
          id="name"
          {...register('name')}
          className="mt-1.5"
          placeholder="John Doe"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="companyName">Company Name</Label>
        <Input
          id="companyName"
          {...register('companyName')}
          className="mt-1.5"
          placeholder="Acme Inc."
        />
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          {...register('address')}
          className="mt-1.5"
          placeholder="123 Main Street&#10;City, State 12345"
          rows={3}
        />
        {errors.address && (
          <p className="mt-1 text-sm text-destructive">{errors.address.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            className="mt-1.5"
            placeholder="john@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            {...register('phone')}
            className="mt-1.5"
            placeholder="+1 (555) 123-4567"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="status">Status</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="status" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                // Keep values that predate the list (e.g. "website" from the contact form).
                options={[...new Set([...LEAD_SOURCES, ...(field.value ? [field.value] : [])])].map((s) => ({ value: s, label: s }))}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="estimatedValue">Est. Value</Label>
          <Input
            id="estimatedValue"
            type="number"
            step="0.01"
            {...register('estimatedValue')}
            className="mt-1.5"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="industry">Industry</Label>
          <Controller
            control={control}
            name="industry"
            render={({ field }) => (
              <SelectField
                id="industry"
                className="mt-1.5"
                value={field.value}
                onChange={field.onChange}
                noneLabel="Not set"
                options={[...new Set([...INDUSTRIES, ...(field.value ? [field.value] : [])])].map((s) => ({ value: s, label: s }))}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input id="country" {...register('country')} className="mt-1.5" placeholder="New Zealand" />
        </div>
        <div>
          <Label htmlFor="ownerId">Account owner</Label>
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

      <div>
        <Label htmlFor="website">Website</Label>
        <Input id="website" {...register('website')} className="mt-1.5" placeholder="https://example.com" />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register('notes')} className="mt-1.5" rows={2} />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-accent hover:bg-accent/90">
          {initialData ? 'Update Client' : 'Add Client'}
        </Button>
      </div>
    </form>
  );
}
