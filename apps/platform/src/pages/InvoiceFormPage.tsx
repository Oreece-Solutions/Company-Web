import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { useAppStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@company-web/shared/ui';
import { Input } from '@company-web/shared/ui';
import { Label } from '@company-web/shared/ui';
import { Textarea } from '@company-web/shared/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@company-web/shared/ui';
import { useToast } from '@company-web/shared/utils';
import { Currency, CURRENCIES, CURRENCY_SYMBOLS } from '@/types/invoice';
import { CurrencyDisplay } from '@/components/invoice/InvoiceHelpers';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Service description is required'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
});

const invoiceSchema = z.object({
  clientId: z.string().min(1, 'Please select a client'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']),
  lineItems: z.array(lineItemSchema).min(1, 'Add at least one service'),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

export default function InvoiceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { clients, getInvoice, createInvoice, updateInvoice } = useAppStore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const existingInvoice = isEditing ? getInvoice(id!) : null;

  const defaultValues: InvoiceFormData = existingInvoice
    ? {
        clientId: existingInvoice.clientId,
        invoiceDate: existingInvoice.invoiceDate,
        dueDate: existingInvoice.dueDate,
        currency: existingInvoice.currency,
        lineItems: existingInvoice.lineItems.map(item => ({
          description: item.description,
          amount: item.amount,
        })),
        notes: existingInvoice.notes || '',
      }
    : {
        clientId: '',
        invoiceDate: format(new Date(), 'yyyy-MM-dd'),
        dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        currency: 'LKR' as Currency,
        lineItems: [{ description: '', amount: 0 }],
        notes: '',
      };

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  const watchLineItems = watch('lineItems');
  const watchCurrency = watch('currency');

  const calculateTotal = () => {
    return watchLineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const onSubmit = async (data: InvoiceFormData) => {
    if (clients.length === 0) {
      toast({
        title: 'No clients',
        description: 'Please add a client first before creating an invoice.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (isEditing && existingInvoice) {
        updateInvoice(existingInvoice.id, {
          clientId: data.clientId,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          currency: data.currency,
          lineItems: data.lineItems.map((item, index) => ({
            id: existingInvoice.lineItems[index]?.id || `new-${index}`,
            description: item.description,
            amount: item.amount,
          })),
          notes: data.notes,
        });
        toast({
          title: 'Invoice updated',
          description: 'Your invoice has been updated successfully.',
        });
      } else {
        createInvoice({
          clientId: data.clientId,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          currency: data.currency,
          lineItems: data.lineItems.map(item => ({
            description: item.description,
            amount: item.amount,
          })),
          notes: data.notes,
        });
        toast({
          title: 'Invoice created',
          description: 'Your invoice has been created successfully.',
        });
      }
      navigate('/invoices');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save invoice. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing && !existingInvoice) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Invoice not found</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title={isEditing ? 'Edit Invoice' : 'New Invoice'}
        description={isEditing ? `Editing ${existingInvoice?.invoiceNumber}` : 'Create a new invoice for your client'}
        actions={
          <Button variant="outline" onClick={() => navigate('/invoices')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 max-w-4xl"
      >
        {/* Invoice Details */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Invoice Details</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <Label htmlFor="clientId">Client *</Label>
              <Select
                value={watch('clientId')}
                onValueChange={(value) => setValue('clientId', value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.length === 0 ? (
                    <div className="py-2 px-4 text-sm text-muted-foreground">
                      No clients yet. Add one first.
                    </div>
                  ) : (
                    clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} {client.companyName && `(${client.companyName})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.clientId && (
                <p className="mt-1 text-sm text-destructive">{errors.clientId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="invoiceDate">Invoice Date *</Label>
              <Input
                id="invoiceDate"
                type="date"
                {...register('invoiceDate')}
                className="mt-1.5"
              />
              {errors.invoiceDate && (
                <p className="mt-1 text-sm text-destructive">{errors.invoiceDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                {...register('dueDate')}
                className="mt-1.5"
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-destructive">{errors.dueDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={watch('currency')}
                onValueChange={(value) => setValue('currency', value as Currency)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency} ({CURRENCY_SYMBOLS[currency]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Services</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ description: '', amount: 0 })}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          </div>

          {errors.lineItems && !Array.isArray(errors.lineItems) && (
            <p className="mb-4 text-sm text-destructive">{errors.lineItems.message}</p>
          )}

          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-12 gap-3 text-sm font-medium text-muted-foreground px-1">
              <div className="col-span-8">Service Description</div>
              <div className="col-span-3 text-right">Amount</div>
              <div className="col-span-1"></div>
            </div>

            {/* Items */}
            {fields.map((field, index) => {
              return (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="grid grid-cols-12 gap-3 items-start"
                >
                  <div className="col-span-8">
                    <Input
                      {...register(`lineItems.${index}.description`)}
                      placeholder="e.g., Web Development, Consulting, Design Services..."
                    />
                    {errors.lineItems?.[index]?.description && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.lineItems[index]?.description?.message}
                      </p>
                    )}
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        {CURRENCY_SYMBOLS[watchCurrency]}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...register(`lineItems.${index}.amount`, { valueAsNumber: true })}
                        placeholder="0.00"
                        className="pl-12"
                      />
                    </div>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Total */}
            <div className="border-t border-border pt-4 mt-4">
              <div className="flex items-center justify-end gap-4">
                <span className="text-lg font-semibold text-foreground">Total:</span>
                <span className="text-2xl font-bold text-primary">
                  <CurrencyDisplay amount={calculateTotal()} currency={watchCurrency} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Notes</h2>
          <Textarea
            {...register('notes')}
            placeholder="Add any notes or payment terms..."
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/invoices')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="gap-2 bg-primary hover:bg-primary/90">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEditing ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </div>
      </motion.form>
    </AppLayout>
  );
}
