import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Checkbox, Input, Label, Textarea } from '@company-web/shared/ui';
import { Contact } from '@/types/crm';

const contactSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required'),
  jobTitle: z.string().optional(),
  email: z.string().email('Invalid email address').or(z.literal('')).optional(),
  phone: z.string().optional(),
  isPrimary: z.boolean(),
  notes: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  initialData?: Contact;
  onSubmit: (data: Omit<Contact, 'id' | 'clientId' | 'createdAt'>) => void;
  onCancel: () => void;
}

export function ContactForm({ initialData, onSubmit, onCancel }: ContactFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      fullName: initialData?.fullName || '',
      jobTitle: initialData?.jobTitle || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      isPrimary: initialData?.isPrimary ?? false,
      notes: initialData?.notes || '',
    },
  });

  const submit = (data: ContactFormData) => {
    onSubmit({
      fullName: data.fullName,
      jobTitle: data.jobTitle || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      isPrimary: data.isPrimary,
      notes: data.notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName">Name *</Label>
          <Input id="fullName" {...register('fullName')} className="mt-1.5" />
          {errors.fullName && <p className="mt-1 text-sm text-destructive">{errors.fullName.message}</p>}
        </div>
        <div>
          <Label htmlFor="jobTitle">Job title</Label>
          <Input id="jobTitle" {...register('jobTitle')} className="mt-1.5" placeholder="CTO" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-email">Email</Label>
          <Input id="contact-email" type="email" {...register('email')} className="mt-1.5" />
          {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="contact-phone">Phone</Label>
          <Input id="contact-phone" {...register('phone')} className="mt-1.5" />
        </div>
      </div>
      <div>
        <Label htmlFor="contact-notes">Notes</Label>
        <Textarea id="contact-notes" {...register('notes')} rows={2} className="mt-1.5" />
      </div>
      <Controller
        control={control}
        name="isPrimary"
        render={({ field }) => (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
            Primary contact for this account
          </label>
        )}
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-accent hover:bg-accent/90">
          {initialData ? 'Save Contact' : 'Add Contact'}
        </Button>
      </div>
    </form>
  );
}
