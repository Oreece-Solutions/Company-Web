import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Tags, Pencil, Trash2, Upload } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Textarea,
  Switch,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@company-web/shared/ui';
import { useHq } from '@/contexts/HqContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SelectField } from '@/components/crm/SelectField';
import { CsvImportDialog } from '@/components/hq/CsvImportDialog';
import { CURRENCIES, Currency } from '@/types/invoice';
import { Service, ServiceInput, SERVICE_CATEGORY_LABELS, SERVICE_UNIT_LABELS, ServiceCategory, ServiceUnit } from '@/types/hq';
import { formatMoney } from '@/lib/money';

const optionalNumber = z.union([z.coerce.number().min(0), z.literal('')]).optional();

const schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    category: z.enum(['project', 'recurring', 'hourly', 'add_on']),
    description: z.string().optional(),
    deliverables: z.string().optional(),
    exclusions: z.string().optional(),
    price: optionalNumber,
    priceApproved: z.boolean(),
    currency: z.string(),
    unit: z.enum(['fixed', 'month', 'hour']),
    estimatedHours: optionalNumber,
    estimatedCost: optionalNumber,
    active: z.boolean(),
    notes: z.string().optional(),
  })
  .refine((d) => !d.priceApproved || (d.price !== '' && d.price !== undefined), {
    path: ['price'],
    message: 'An approved price needs an amount',
  });

type FormData = z.infer<typeof schema>;
const toNum = (v: number | '' | undefined) => (v === '' || v === undefined ? undefined : Number(v));

function ServiceForm({ initial, onSubmit, onCancel }: { initial?: Service; onSubmit: (d: ServiceInput) => void; onCancel: () => void }) {
  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name || '',
      category: initial?.category || 'project',
      description: initial?.description || '',
      deliverables: initial?.deliverables || '',
      exclusions: initial?.exclusions || '',
      price: initial?.price ?? '',
      priceApproved: initial?.priceApproved ?? false,
      currency: initial?.currency || 'NZD',
      unit: initial?.unit || 'fixed',
      estimatedHours: initial?.estimatedHours ?? '',
      estimatedCost: initial?.estimatedCost ?? '',
      active: initial?.active ?? true,
      notes: initial?.notes || '',
    },
  });
  const [price, cost] = watch(['price', 'estimatedCost']);
  const margin = toNum(price) && toNum(cost) !== undefined ? Math.round((1 - toNum(cost)! / toNum(price)!) * 100) : undefined;

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((d) => onSubmit({
        name: d.name,
        category: d.category,
        description: d.description,
        deliverables: d.deliverables,
        exclusions: d.exclusions,
        price: toNum(d.price),
        priceApproved: d.priceApproved,
        currency: d.currency as Currency,
        unit: d.unit,
        estimatedHours: toNum(d.estimatedHours),
        estimatedCost: toNum(d.estimatedCost),
        active: d.active,
        sortOrder: initial?.sortOrder ?? 0,
        notes: d.notes,
      }))}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <div>
          <Label htmlFor="svc-name">Service *</Label>
          <Input id="svc-name" {...register('name')} className="mt-1.5" placeholder="Website, 5–6 pages" />
          {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="svc-category">Type</Label>
          <Controller control={control} name="category" render={({ field }) => (
            <SelectField id="svc-category" className="mt-1.5" value={field.value} onChange={field.onChange}
              options={(Object.keys(SERVICE_CATEGORY_LABELS) as ServiceCategory[]).map((c) => ({ value: c, label: SERVICE_CATEGORY_LABELS[c] }))} />
          )} />
        </div>
      </div>
      <div>
        <Label htmlFor="svc-description">Who it's for / the problem it solves</Label>
        <Textarea id="svc-description" {...register('description')} className="mt-1.5" rows={2} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="svc-deliverables">Deliverables</Label>
          <Textarea id="svc-deliverables" {...register('deliverables')} className="mt-1.5" rows={3} />
        </div>
        <div>
          <Label htmlFor="svc-exclusions">Not included</Label>
          <Textarea id="svc-exclusions" {...register('exclusions')} className="mt-1.5" rows={3} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="svc-price">Price (excl. GST)</Label>
          <Input id="svc-price" type="number" step="0.01" {...register('price')} className="mt-1.5" placeholder="Not set" />
          {errors.price && <p className="mt-1 text-sm text-destructive">{errors.price.message}</p>}
        </div>
        <div>
          <Label htmlFor="svc-unit">Charged</Label>
          <Controller control={control} name="unit" render={({ field }) => (
            <SelectField id="svc-unit" className="mt-1.5" value={field.value} onChange={field.onChange}
              options={(Object.keys(SERVICE_UNIT_LABELS) as ServiceUnit[]).map((u) => ({ value: u, label: u === 'fixed' ? 'Fixed price' : `Per ${u}` }))} />
          )} />
        </div>
        <div>
          <Label htmlFor="svc-currency">Currency</Label>
          <Controller control={control} name="currency" render={({ field }) => (
            <SelectField id="svc-currency" className="mt-1.5" value={field.value} onChange={field.onChange}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          )} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="svc-hours">Estimated hours</Label>
          <Input id="svc-hours" type="number" step="0.5" {...register('estimatedHours')} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="svc-cost">Contractor + tool cost</Label>
          <Input id="svc-cost" type="number" step="0.01" {...register('estimatedCost')} className="mt-1.5" />
        </div>
        <div>
          <Label>Gross margin (est.)</Label>
          <p className="mt-3 text-sm font-medium">{margin === undefined ? '—' : `${margin}%`}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-6">
        <Controller control={control} name="priceApproved" render={({ field }) => (
          <label className="flex items-center gap-2 text-sm"><Switch id="svc-approved" checked={field.value} onCheckedChange={field.onChange} />Price approved by me</label>
        )} />
        <Controller control={control} name="active" render={({ field }) => (
          <label className="flex items-center gap-2 text-sm"><Switch id="svc-active" checked={field.value} onCheckedChange={field.onChange} />Offered now</label>
        )} />
      </div>
      <div>
        <Label htmlFor="svc-notes">Notes</Label>
        <Textarea id="svc-notes" {...register('notes')} className="mt-1.5" rows={2} />
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-accent hover:bg-accent/90">{initial ? 'Save' : 'Add service'}</Button>
      </div>
    </form>
  );
}

export default function ServicesPage() {
  const { services, saveService, deleteService } = useHq();
  const [editing, setEditing] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const groups = (Object.keys(SERVICE_CATEGORY_LABELS) as ServiceCategory[])
    .map((c) => ({ category: c, items: services.filter((s) => s.category === c) }))
    .filter((g) => g.items.length > 0);

  return (
    <AppLayout>
      <PageHeader
        title="Services"
        description="What you sell and for how much. Quotes pick their lines from here."
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" />Import CSV</Button>
            <Button className="gap-2 bg-accent hover:bg-accent/90" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" />Add service
            </Button>
          </>
        }
      />

      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center shadow-card">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"><Tags className="h-8 w-8 text-muted-foreground" /></div>
          <p className="font-medium">No services yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">Add your offers. Leave the price empty until you've decided it.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.category}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{SERVICE_CATEGORY_LABELS[g.category]}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {g.items.map((s) => {
                  const margin = s.price && s.estimatedCost !== undefined ? Math.round((1 - s.estimatedCost / s.price) * 100) : undefined;
                  return (
                    <div key={s.id} className={`rounded-xl border border-border bg-card p-4 shadow-card ${s.active ? '' : 'opacity-60'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{s.name}</p>
                          {s.description && <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p>}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold">{s.price !== undefined ? formatMoney(s.price, s.currency) : <span className="text-muted-foreground">Price TBD</span>}</p>
                          {s.price !== undefined && <p className="text-xs text-muted-foreground">{SERVICE_UNIT_LABELS[s.unit]} + GST</p>}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full px-2 py-0.5 font-medium ${s.priceApproved ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                          {s.priceApproved ? 'Approved price' : 'Not approved'}
                        </span>
                        {s.estimatedHours !== undefined && <span className="text-muted-foreground">{s.estimatedHours} h est.</span>}
                        {margin !== undefined && <span className={margin < 40 ? 'text-destructive' : 'text-muted-foreground'}>{margin}% margin est.</span>}
                        {!s.active && <span className="text-muted-foreground">Not offered</span>}
                        <span className="ml-auto flex gap-1">
                          <Button variant="ghost" size="icon" aria-label={`Edit ${s.name}`} onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" aria-label={`Delete ${s.name}`} onClick={() => deleteService(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add service'}</DialogTitle>
            <DialogDescription>Mark a price as approved only once you've actually quoted or decided it.</DialogDescription>
          </DialogHeader>
          <ServiceForm key={editing?.id ?? 'new'} initial={editing ?? undefined} onCancel={() => setOpen(false)}
            onSubmit={async (d) => { if (await saveService(d, editing?.id)) { setOpen(false); setEditing(null); } }} />
        </DialogContent>
      </Dialog>

      <CsvImportDialog<ServiceInput>
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import services"
        description="Columns: name, category (project/recurring/hourly/add_on), price, unit (fixed/month/hour), price_approved (yes/no), currency, description, deliverables, exclusions, estimated_hours, notes."
        parseRow={(r) => {
          if (!r.name) return { ok: false, label: '', error: 'No name' };
          const category = (r.category || 'project') as ServiceCategory;
          const unit = (r.unit || 'fixed') as ServiceUnit;
          if (!(category in SERVICE_CATEGORY_LABELS)) return { ok: false, label: r.name, error: `Unknown category "${r.category}"` };
          if (!(unit in SERVICE_UNIT_LABELS)) return { ok: false, label: r.name, error: `Unknown unit "${r.unit}"` };
          const price = r.price ? Number(r.price.replace(/[^\d.]/g, '')) : undefined;
          return {
            ok: true,
            label: r.name,
            data: {
              name: r.name, category, unit, price,
              priceApproved: /^(yes|true|1)$/i.test(r.price_approved || ''),
              currency: (r.currency || 'NZD') as Currency,
              description: r.description, deliverables: r.deliverables, exclusions: r.exclusions,
              estimatedHours: r.estimated_hours ? Number(r.estimated_hours) : undefined,
              active: !/^(no|false|0)$/i.test(r.active || ''),
              sortOrder: Number(r.sort_order) || 0,
              notes: r.notes,
            },
          };
        }}
        saveRow={async (d) => ((await saveService(d)) ? null : 'Could not save (see message)')}
      />
    </AppLayout>
  );
}
