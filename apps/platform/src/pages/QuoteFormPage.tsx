import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { useHq } from '@/contexts/HqContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Input, Label, Textarea } from '@company-web/shared/ui';
import { SelectField } from '@/components/crm/SelectField';
import { CURRENCIES, Currency } from '@/types/invoice';
import { computeQuoteTotals, OPEN_DEAL_STAGES, Quote, QuoteInput, QuoteItem } from '@/types/crm';
import { formatMoney } from '@/lib/money';

const itemSchema = z.object({
  description: z.string().trim().min(1, 'Describe the work'),
  quantity: z.coerce.number().positive('Must be more than 0'),
  unitPrice: z.coerce.number().min(0, 'Cannot be negative'),
});

const quoteSchema = z.object({
  clientId: z.string().min(1, 'Choose an account'),
  dealId: z.string().optional(),
  contactId: z.string().optional(),
  title: z.string().optional(),
  issueDate: z.string().min(1, 'Required'),
  validUntil: z.string().optional(),
  currency: z.enum(['LKR', 'NZD', 'AUD', 'USD', 'EUR', 'GBP']),
  items: z.array(itemSchema).min(1, 'Add at least one line'),
  discount: z.coerce.number().min(0, 'Cannot be negative'),
  taxRate: z.coerce.number().min(0).max(100, '0–100'),
  notes: z.string().optional(),
  terms: z.string().optional(),
}).refine((q) => !q.validUntil || q.validUntil >= q.issueDate, { path: ['validUntil'], message: 'Must be on or after the issue date' })
  .refine((q) => q.discount <= computeQuoteTotals(q.items as QuoteItem[], 0, 0).subtotal, { path: ['discount'], message: 'Larger than the subtotal' });

type QuoteFormData = z.infer<typeof quoteSchema>;

// Waits for data before mounting the editor: the form's default values are
// read once, so they must not be taken from a store that is still loading.
export default function QuoteFormPage() {
  const { id } = useParams();
  const { isLoading: appLoading } = useAppStore();
  const { getQuote, isLoading } = useSales();

  if (isLoading || appLoading) {
    return (
      <AppLayout>
        <PageHeader title="Loading…" />
      </AppLayout>
    );
  }

  const existing = id ? getQuote(id) : undefined;
  if (existing?.invoiceId) {
    return (
      <AppLayout>
        <PageHeader title={existing.quoteNumber} description="This quote has been invoiced and can no longer be edited." />
        <Link to={`/quotes/${existing.id}`} className="text-accent hover:underline">View quote</Link>
      </AppLayout>
    );
  }
  if (id && !existing) {
    return (
      <AppLayout>
        <PageHeader title="Quote not found" />
        <Link to="/quotes" className="text-accent hover:underline">Back to Quotes</Link>
      </AppLayout>
    );
  }
  return <QuoteEditor existing={existing} key={id || 'new'} />;
}

function QuoteEditor({ existing }: { existing?: Quote }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { clients, company } = useAppStore();
  const { getDeal, deals, getContactsForClient, addQuote, updateQuote } = useSales();

  const fromDeal = params.get('dealId') ? getDeal(params.get('dealId')!) : undefined;
  const today = format(new Date(), 'yyyy-MM-dd');

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: existing
      ? {
          clientId: existing.clientId,
          dealId: existing.dealId || '',
          contactId: existing.contactId || '',
          title: existing.title,
          issueDate: existing.issueDate,
          validUntil: existing.validUntil || '',
          currency: existing.currency,
          items: existing.items,
          discount: existing.discount,
          taxRate: existing.taxRate,
          notes: existing.notes || '',
          terms: existing.terms || '',
        }
      : {
          clientId: fromDeal?.clientId || params.get('clientId') || '',
          dealId: fromDeal?.id || '',
          contactId: fromDeal?.contactId || '',
          title: fromDeal?.title || '',
          issueDate: today,
          validUntil: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
          currency: fromDeal?.currency || company.defaultCurrency || 'NZD',
          items: [{ description: '', quantity: 1, unitPrice: 0 }],
          discount: 0,
          taxRate: 0,
          notes: '',
          terms: company.quoteTerms || '',
        },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const clientId = watch('clientId');
  const items = watch('items');
  const currency = watch('currency') as Currency;
  const { services } = useHq();
  const catalogue = services.filter((s) => s.active);
  const totals = computeQuoteTotals(
    items.map((i) => ({ description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
    Number(watch('discount')) || 0,
    Number(watch('taxRate')) || 0,
  );
  const clientDeals = deals.filter((d) => d.clientId === clientId && (OPEN_DEAL_STAGES.includes(d.stage) || d.id === watch('dealId')));
  const contacts = clientId ? getContactsForClient(clientId) : [];

  const onSubmit = async (data: QuoteFormData) => {
    const input: QuoteInput = {
      clientId: data.clientId,
      dealId: data.dealId || undefined,
      contactId: data.contactId || undefined,
      title: data.title || '',
      issueDate: data.issueDate,
      validUntil: data.validUntil || undefined,
      currency: data.currency as Currency,
      items: data.items.map((i) => ({ description: i.description.trim(), quantity: i.quantity, unitPrice: i.unitPrice })),
      discount: data.discount,
      taxRate: data.taxRate,
      notes: data.notes || undefined,
      terms: data.terms || undefined,
    };
    const saved = existing
      ? await updateQuote(existing.id, { ...input, dealId: input.dealId || '', contactId: input.contactId || '', validUntil: input.validUntil || '', notes: input.notes || '', terms: input.terms || '' })
      : await addQuote(input);
    if (saved) navigate(`/quotes/${saved.id}`);
  };

  return (
    <AppLayout>
      <Link to={existing ? `/quotes/${existing.id}` : '/quotes'} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
      <PageHeader title={existing ? `Edit ${existing.quoteNumber}` : 'New Quote'} description="Totals and tax are calculated automatically." />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 rounded-xl border border-border bg-card p-6 shadow-card md:grid-cols-3">
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
                  onChange={(v) => { field.onChange(v); setValue('dealId', ''); setValue('contactId', ''); }}
                  placeholder="Choose an account"
                  disabled={!!existing}
                  options={clients.map((c) => ({ value: c.id, label: c.companyName || c.name }))}
                />
              )}
            />
            {errors.clientId && <p className="mt-1 text-sm text-destructive">{errors.clientId.message}</p>}
          </div>
          <div>
            <Label htmlFor="dealId">Deal</Label>
            <Controller
              control={control}
              name="dealId"
              render={({ field }) => (
                <SelectField
                  id="dealId"
                  className="mt-1.5"
                  value={field.value}
                  onChange={field.onChange}
                  noneLabel="Not linked"
                  disabled={!clientId}
                  options={clientDeals.map((d) => ({ value: d.id, label: d.title }))}
                />
              )}
            />
          </div>
          <div>
            <Label htmlFor="contactId">Attention</Label>
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
                  disabled={!clientId}
                  options={contacts.map((c) => ({ value: c.id, label: c.fullName }))}
                />
              )}
            />
          </div>
          <div className="md:col-span-3">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} className="mt-1.5" placeholder="Website redesign and hosting" />
          </div>
          <div>
            <Label htmlFor="issueDate">Issue date *</Label>
            <Input id="issueDate" type="date" {...register('issueDate')} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="validUntil">Valid until</Label>
            <Input id="validUntil" type="date" {...register('validUntil')} className="mt-1.5" />
            {errors.validUntil && <p className="mt-1 text-sm text-destructive">{errors.validUntil.message}</p>}
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <SelectField id="currency" className="mt-1.5" value={field.value} onChange={field.onChange} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
              )}
            />
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Line items</h2>
            <div className="flex gap-2">
              {catalogue.length > 0 && (
                <SelectField
                  id="add-service"
                  className="h-9 w-56"
                  placeholder="Add from Services…"
                  value=""
                  onChange={(id) => {
                    const svc = catalogue.find((s) => s.id === id);
                    if (!svc) return;
                    const unit = svc.unit === 'month' ? ' (per month)' : svc.unit === 'hour' ? ' (per hour)' : '';
                    const blank = items.length === 1 && !items[0].description.trim() && !Number(items[0].unitPrice);
                    const line = { description: `${svc.name}${unit}`, quantity: 1, unitPrice: svc.price ?? 0 };
                    if (blank) setValue('items.0', line, { shouldDirty: true });
                    else append(line);
                  }}
                  options={catalogue.map((s) => ({
                    value: s.id,
                    label: `${s.name}${s.price !== undefined ? ` · ${s.price}` : ' · price TBD'}${s.currency !== currency ? ` (${s.currency})` : ''}`,
                  }))}
                />
              )}
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}>
                <Plus className="h-3.5 w-3.5" />
                Add line
              </Button>
            </div>
          </div>
          {errors.items?.root && <p className="mb-2 text-sm text-destructive">{errors.items.root.message}</p>}
          {errors.items?.message && <p className="mb-2 text-sm text-destructive">{errors.items.message}</p>}
          <div className="hidden gap-3 px-1 pb-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[1fr_90px_140px_140px_40px]">
            <span>Description</span><span>Qty / hours</span><span>Unit price</span><span className="text-right">Amount</span><span />
          </div>
          <div className="space-y-3">
            {fields.map((field, index) => {
              const line = items[index];
              const amount = Math.round((Number(line?.quantity) || 0) * (Number(line?.unitPrice) || 0) * 100) / 100;
              return (
                <div key={field.id} className="grid gap-3 md:grid-cols-[1fr_90px_140px_140px_40px] md:items-start">
                  <div>
                    <Textarea rows={1} {...register(`items.${index}.description`)} placeholder="e.g. Front-end development" />
                    {errors.items?.[index]?.description && <p className="mt-1 text-xs text-destructive">{errors.items[index]?.description?.message}</p>}
                  </div>
                  <div>
                    <Input type="number" step="0.25" min="0" {...register(`items.${index}.quantity`)} />
                    {errors.items?.[index]?.quantity && <p className="mt-1 text-xs text-destructive">{errors.items[index]?.quantity?.message}</p>}
                  </div>
                  <div>
                    <Input type="number" step="0.01" min="0" {...register(`items.${index}.unitPrice`)} />
                    {errors.items?.[index]?.unitPrice && <p className="mt-1 text-xs text-destructive">{errors.items[index]?.unitPrice?.message}</p>}
                  </div>
                  <p className="py-2 text-right font-mono text-sm">{formatMoney(amount, currency)}</p>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} title="Remove line">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-sm space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{formatMoney(totals.subtotal, currency)}</span></div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="discount" className="text-muted-foreground">Discount</Label>
                <Input id="discount" type="number" step="0.01" min="0" {...register('discount')} className="h-8 w-36 text-right" />
              </div>
              {errors.discount && <p className="text-right text-xs text-destructive">{errors.discount.message}</p>}
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="taxRate" className="text-muted-foreground">Tax rate (%) <span className="text-xs">GST 15% · VAT 18%</span></Label>
                <Input id="taxRate" type="number" step="0.01" min="0" max="100" {...register('taxRate')} className="h-8 w-36 text-right" />
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="font-mono">{formatMoney(totals.taxAmount, currency)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold"><span>Total</span><span className="font-mono">{formatMoney(totals.total, currency)}</span></div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 rounded-xl border border-border bg-card p-6 shadow-card md:grid-cols-2">
          <div>
            <Label htmlFor="notes">Notes to client</Label>
            <Textarea id="notes" {...register('notes')} rows={4} className="mt-1.5" placeholder="Scope, assumptions, timeline..." />
          </div>
          <div>
            <Label htmlFor="terms">Terms</Label>
            <Textarea id="terms" {...register('terms')} rows={4} className="mt-1.5" placeholder="Payment terms, validity, IP..." />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(existing ? `/quotes/${existing.id}` : '/quotes')}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-accent hover:bg-accent/90">
            {existing ? 'Save Quote' : 'Create Quote'}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
