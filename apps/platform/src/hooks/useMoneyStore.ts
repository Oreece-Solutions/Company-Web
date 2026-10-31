import { useState, useEffect, useCallback } from 'react';
import { supabase, Tables, TablesInsert } from '@company-web/shared/data-access';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { hqErrorMessage } from '@/hooks/useHqStore';
import { hasAccess } from '@/lib/access';
import { Currency } from '@/types/invoice';
import { BillingInterval, Expense, ExpenseCategory, ExpenseInput, GstSummary, Retainer, RetainerInput, RetainerStatus } from '@/types/money';

// Retainers, expenses and GST. Only billing roles can read these (RLS), so the
// store stays empty for everyone else.

const opt = (v: string | null | undefined) => v || undefined;
const nul = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

function mapRetainer(db: Tables<'retainers'>): Retainer {
  return {
    id: db.id, clientId: db.client_id, serviceId: opt(db.service_id), name: db.name, description: opt(db.description),
    amount: Number(db.amount), currency: db.currency as Currency, interval: db.billing_interval as BillingInterval,
    nextInvoiceDate: db.next_invoice_date, paymentTermsDays: db.payment_terms_days, status: db.status as RetainerStatus,
    startDate: db.start_date, endDate: opt(db.end_date), lastInvoiceId: opt(db.last_invoice_id), notes: opt(db.notes),
  };
}

function mapExpense(db: Tables<'expenses'>): Expense {
  return {
    id: db.id, spentOn: db.spent_on, supplier: db.supplier, description: opt(db.description), category: db.category as ExpenseCategory,
    amount: Number(db.amount), currency: db.currency as Currency, gstClaimable: db.gst_claimable, projectId: opt(db.project_id),
    contractorId: opt(db.contractor_id), receiptUrl: opt(db.receipt_url), notes: opt(db.notes), createdBy: opt(db.created_by),
  };
}

export function useMoneyStore() {
  const { user, roles } = useAuth();
  const canBill = hasAccess(roles, 'bill');
  const [retainers, setRetainers] = useState<Retainer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user || !canBill) {
      setRetainers([]);
      setExpenses([]);
      setIsLoading(false);
      return;
    }
    const [r, e] = await Promise.all([
      supabase.from('retainers').select('*').order('next_invoice_date'),
      supabase.from('expenses').select('*').order('spent_on', { ascending: false }),
    ]);
    if (r.error || e.error) toast.error('Failed to load money data');
    if (r.data) setRetainers(r.data.map(mapRetainer));
    if (e.data) setExpenses(e.data.map(mapExpense));
    setIsLoading(false);
  }, [user, canBill]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveRetainer = useCallback(async (d: RetainerInput, id?: string) => {
    const row: TablesInsert<'retainers'> = {
      client_id: d.clientId, service_id: d.serviceId || null, name: d.name.trim(), description: nul(d.description),
      amount: d.amount, currency: d.currency, billing_interval: d.interval, next_invoice_date: d.nextInvoiceDate,
      payment_terms_days: d.paymentTermsDays, status: d.status, start_date: d.startDate, end_date: d.endDate || null, notes: nul(d.notes),
    };
    const query = id ? supabase.from('retainers').update(row).eq('id', id) : supabase.from('retainers').insert(row);
    const { data, error } = await query.select().single();
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to save the retainer'));
      return null;
    }
    const saved = mapRetainer(data);
    setRetainers((prev) => (id ? prev.map((x) => (x.id === id ? saved : x)) : [...prev, saved]).sort((a, b) => a.nextInvoiceDate.localeCompare(b.nextInvoiceDate)));
    toast.success(id ? 'Retainer saved' : 'Retainer added');
    return saved;
  }, []);

  const setRetainerStatus = useCallback(async (r: Retainer, status: RetainerStatus) => {
    const { data, error } = await supabase.from('retainers').update({ status }).eq('id', r.id).select().single();
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to update the retainer'));
      return;
    }
    setRetainers((prev) => prev.map((x) => (x.id === r.id ? mapRetainer(data) : x)));
  }, []);

  const deleteRetainer = useCallback(async (id: string) => {
    // Only admins can delete (RLS); the screens show Delete to admins only.
    const { error } = await supabase.from('retainers').delete().eq('id', id);
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to delete'));
      return false;
    }
    setRetainers((prev) => prev.filter((x) => x.id !== id));
    return true;
  }, []);

  // Creates the invoices for every retainer that is due; returns how many.
  const invoiceDueRetainers = useCallback(async () => {
    const { data, error } = await supabase.rpc('invoice_due_retainers', {});
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to create retainer invoices'));
      return null;
    }
    await fetchAll();
    return data as number;
  }, [fetchAll]);

  const saveExpense = useCallback(async (d: ExpenseInput, id?: string) => {
    const row: TablesInsert<'expenses'> = {
      spent_on: d.spentOn, supplier: d.supplier.trim(), description: nul(d.description), category: d.category, amount: d.amount,
      currency: d.currency, gst_claimable: d.gstClaimable, project_id: d.projectId || null, contractor_id: d.contractorId || null,
      receipt_url: nul(d.receiptUrl), notes: nul(d.notes),
    };
    const query = id ? supabase.from('expenses').update(row).eq('id', id) : supabase.from('expenses').insert(row);
    const { data, error } = await query.select().single();
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to save the expense'));
      return null;
    }
    const saved = mapExpense(data);
    setExpenses((prev) => (id ? prev.map((x) => (x.id === id ? saved : x)) : [saved, ...prev]).sort((a, b) => b.spentOn.localeCompare(a.spentOn)));
    toast.success(id ? 'Expense saved' : 'Expense added');
    return saved;
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    // Only admins can delete (RLS); the screens show Delete to admins only.
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to delete'));
      return false;
    }
    setExpenses((prev) => prev.filter((x) => x.id !== id));
    return true;
  }, []);

  const gstSummary = useCallback(async (from: string, to: string) => {
    const { data, error } = await supabase.rpc('gst_summary', { _from: from, _to: to });
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to work out GST'));
      return null;
    }
    return data as unknown as GstSummary;
  }, []);

  return {
    retainers, expenses, isLoading, refetch: fetchAll,
    saveRetainer, setRetainerStatus, deleteRetainer, invoiceDueRetainers,
    saveExpense, deleteExpense, gstSummary,
  };
}
