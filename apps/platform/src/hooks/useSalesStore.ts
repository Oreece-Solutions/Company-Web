import { useState, useEffect, useCallback } from 'react';
import { supabase, Json, TablesUpdate } from '@company-web/shared/data-access';
import { useAuth } from '@/contexts/AuthContext';
import { Currency } from '@/types/invoice';
import {
  Contact,
  Deal,
  DealStage,
  DealStageChange,
  FollowUp,
  Quote,
  QuoteInput,
  QuoteItem,
  QuoteStatus,
  TeamMember,
} from '@/types/crm';
import { toast } from 'sonner';

// Sales CRM data (supabase/migrations/20261003000001_crm_sales.sql). Like the
// main store, everything is shared across the team and RLS controls access.
// Totals, probabilities, stage history and account status are maintained by
// database triggers, so writes re-read the row instead of trusting local maths.

interface DbContact {
  id: string;
  client_id: string;
  full_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
}

interface DbDeal {
  id: string;
  client_id: string;
  contact_id: string | null;
  title: string;
  stage: DealStage;
  value: number;
  currency: string;
  probability: number | null;
  service_type: string | null;
  source: string | null;
  expected_close_date: string | null;
  owner_id: string | null;
  lost_reason: string | null;
  closed_at: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DbStageChange {
  id: string;
  deal_id: string;
  from_stage: DealStage | null;
  to_stage: DealStage;
  changed_by: string | null;
  changed_at: string;
}

interface DbFollowUp {
  id: string;
  client_id: string;
  deal_id: string | null;
  title: string;
  due_date: string;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
}

interface DbQuote {
  id: string;
  quote_number: string;
  client_id: string;
  deal_id: string | null;
  contact_id: string | null;
  title: string;
  status: QuoteStatus;
  issue_date: string;
  valid_until: string | null;
  currency: string;
  items: Json;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  invoice_id: string | null;
  sent_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapDbContact(db: DbContact): Contact {
  return {
    id: db.id,
    clientId: db.client_id,
    fullName: db.full_name,
    jobTitle: db.job_title || undefined,
    email: db.email || undefined,
    phone: db.phone || undefined,
    isPrimary: db.is_primary,
    notes: db.notes || undefined,
    createdAt: db.created_at,
  };
}

function mapDbDeal(db: DbDeal): Deal {
  return {
    id: db.id,
    clientId: db.client_id,
    contactId: db.contact_id || undefined,
    title: db.title,
    stage: db.stage,
    value: Number(db.value),
    currency: db.currency as Currency,
    probability: db.probability ?? 0,
    serviceType: db.service_type || undefined,
    source: db.source || undefined,
    expectedCloseDate: db.expected_close_date || undefined,
    ownerId: db.owner_id || undefined,
    lostReason: db.lost_reason || undefined,
    closedAt: db.closed_at || undefined,
    projectId: db.project_id || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapDbStageChange(db: DbStageChange): DealStageChange {
  return {
    id: db.id,
    dealId: db.deal_id,
    fromStage: db.from_stage || undefined,
    toStage: db.to_stage,
    changedBy: db.changed_by || undefined,
    changedAt: db.changed_at,
  };
}

function mapDbFollowUp(db: DbFollowUp): FollowUp {
  return {
    id: db.id,
    clientId: db.client_id,
    dealId: db.deal_id || undefined,
    title: db.title,
    dueDate: db.due_date,
    assignedTo: db.assigned_to || undefined,
    completedAt: db.completed_at || undefined,
    createdAt: db.created_at,
  };
}

function parseQuoteItems(items: Json): QuoteItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      description: (item.description as string) || '',
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unit_price) || 0,
    };
  });
}

function mapDbQuote(db: DbQuote): Quote {
  return {
    id: db.id,
    quoteNumber: db.quote_number,
    clientId: db.client_id,
    dealId: db.deal_id || undefined,
    contactId: db.contact_id || undefined,
    title: db.title,
    status: db.status,
    issueDate: db.issue_date,
    validUntil: db.valid_until || undefined,
    currency: db.currency as Currency,
    items: parseQuoteItems(db.items),
    subtotal: Number(db.subtotal),
    discount: Number(db.discount),
    taxRate: Number(db.tax_rate),
    taxAmount: Number(db.tax_amount),
    total: Number(db.total),
    notes: db.notes || undefined,
    terms: db.terms || undefined,
    invoiceId: db.invoice_id || undefined,
    sentAt: db.sent_at || undefined,
    decidedAt: db.decided_at || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function quoteToDb(data: Partial<QuoteInput>) {
  const row: TablesUpdate<'quotes'> = {};
  if (data.clientId !== undefined) row.client_id = data.clientId;
  if (data.dealId !== undefined) row.deal_id = data.dealId || null;
  if (data.contactId !== undefined) row.contact_id = data.contactId || null;
  if (data.title !== undefined) row.title = data.title;
  if (data.issueDate !== undefined) row.issue_date = data.issueDate;
  if (data.validUntil !== undefined) row.valid_until = data.validUntil || null;
  if (data.currency !== undefined) row.currency = data.currency;
  if (data.items !== undefined) {
    row.items = data.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unitPrice),
    }));
  }
  if (data.discount !== undefined) row.discount = data.discount || 0;
  if (data.taxRate !== undefined) row.tax_rate = data.taxRate || 0;
  if (data.notes !== undefined) row.notes = data.notes || null;
  if (data.terms !== undefined) row.terms = data.terms || null;
  return row;
}

// Database errors raised by our triggers carry a readable message.
function errorMessage(error: { message?: string } | null, fallback: string) {
  const message = error?.message || '';
  if (/foreign key/i.test(message) && /quotes/i.test(message)) return 'This account has quotes and cannot be deleted';
  if (/row-level security/i.test(message)) return 'You do not have permission to do that';
  if (message && !/violates|syntax|column/i.test(message)) return message;
  return fallback;
}

export type DealInput = Omit<Deal, 'id' | 'createdAt' | 'updatedAt' | 'closedAt' | 'projectId' | 'probability'> & {
  probability?: number;
};

export function useSalesStore() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: true });
    if (data) setContacts(data.map((c) => mapDbContact(c as DbContact)));
  }, []);

  const fetchAll = useCallback(async (silent = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);
    try {
      const [dealsRes, followUpsRes, quotesRes, profilesRes] = await Promise.all([
        supabase.from('deals').select('*').order('created_at', { ascending: false }),
        supabase.from('follow_ups').select('*').order('due_date', { ascending: true }),
        supabase.from('quotes').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('user_id, full_name'),
        fetchContacts(),
      ]);
      if (dealsRes.data) setDeals(dealsRes.data.map((d) => mapDbDeal(d as DbDeal)));
      if (followUpsRes.data) setFollowUps(followUpsRes.data.map((f) => mapDbFollowUp(f as DbFollowUp)));
      if (quotesRes.data) setQuotes(quotesRes.data.map((q) => mapDbQuote(q as DbQuote)));
      if (profilesRes.data) {
        setTeamMembers(
          profilesRes.data
            .map((p) => ({ userId: p.user_id, fullName: p.full_name || 'Team member' }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName)),
        );
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast.error('Failed to load sales data');
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchContacts]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Contacts --------------------------------------------------------------

  const addContact = useCallback(async (clientId: string, data: Omit<Contact, 'id' | 'clientId' | 'createdAt'>) => {
    if (!user) return null;
    if (data.isPrimary) {
      await supabase.from('contacts').update({ is_primary: false }).eq('client_id', clientId).eq('is_primary', true);
    }
    const { data: row, error } = await supabase
      .from('contacts')
      .insert({
        client_id: clientId,
        full_name: data.fullName,
        job_title: data.jobTitle || null,
        email: data.email || null,
        phone: data.phone || null,
        is_primary: data.isPrimary,
        notes: data.notes || null,
        created_by: user.id,
      })
      .select()
      .single();
    if (error) {
      toast.error(errorMessage(error, 'Failed to add contact'));
      return null;
    }
    await fetchContacts();
    toast.success('Contact added');
    return mapDbContact(row as DbContact);
  }, [user, fetchContacts]);

  const updateContact = useCallback(async (id: string, data: Partial<Omit<Contact, 'id' | 'clientId' | 'createdAt'>>) => {
    if (!user) return;
    const contact = contacts.find((c) => c.id === id);
    if (data.isPrimary && contact && !contact.isPrimary) {
      await supabase.from('contacts').update({ is_primary: false }).eq('client_id', contact.clientId).eq('is_primary', true);
    }
    const row: TablesUpdate<'contacts'> = {};
    if (data.fullName !== undefined) row.full_name = data.fullName;
    if (data.jobTitle !== undefined) row.job_title = data.jobTitle || null;
    if (data.email !== undefined) row.email = data.email || null;
    if (data.phone !== undefined) row.phone = data.phone || null;
    if (data.isPrimary !== undefined) row.is_primary = data.isPrimary;
    if (data.notes !== undefined) row.notes = data.notes || null;
    const { error } = await supabase.from('contacts').update(row).eq('id', id);
    if (error) {
      toast.error(errorMessage(error, 'Failed to update contact'));
      return;
    }
    await fetchContacts();
    toast.success('Contact updated');
  }, [user, contacts, fetchContacts]);

  const deleteContact = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) {
      toast.error(errorMessage(error, 'Failed to delete contact'));
      return;
    }
    setContacts((prev) => prev.filter((c) => c.id !== id));
    toast.success('Contact deleted');
  }, [user]);

  const getContactsForClient = useCallback(
    (clientId: string) => contacts.filter((c) => c.clientId === clientId).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
    [contacts],
  );

  // Deals -----------------------------------------------------------------

  const replaceDeal = (row: DbDeal) => {
    const mapped = mapDbDeal(row);
    setDeals((prev) => (prev.some((d) => d.id === mapped.id) ? prev.map((d) => (d.id === mapped.id ? mapped : d)) : [mapped, ...prev]));
    return mapped;
  };

  const addDeal = useCallback(async (data: DealInput) => {
    if (!user) return null;
    const { data: row, error } = await supabase
      .from('deals')
      .insert({
        client_id: data.clientId,
        contact_id: data.contactId || null,
        title: data.title,
        stage: data.stage,
        value: data.value || 0,
        currency: data.currency,
        probability: data.probability ?? null,
        service_type: data.serviceType || null,
        source: data.source || null,
        expected_close_date: data.expectedCloseDate || null,
        owner_id: data.ownerId || null,
        lost_reason: data.lostReason || null,
        created_by: user.id,
      })
      .select()
      .single();
    if (error) {
      toast.error(errorMessage(error, 'Failed to create deal'));
      return null;
    }
    toast.success('Deal created');
    return replaceDeal(row as DbDeal);
  }, [user]);

  const updateDeal = useCallback(async (id: string, data: Partial<DealInput>, options: { silent?: boolean } = {}) => {
    if (!user) return null;
    const row: TablesUpdate<'deals'> = {};
    if (data.clientId !== undefined) row.client_id = data.clientId;
    if (data.contactId !== undefined) row.contact_id = data.contactId || null;
    if (data.title !== undefined) row.title = data.title;
    if (data.stage !== undefined) row.stage = data.stage;
    if (data.value !== undefined) row.value = data.value || 0;
    if (data.currency !== undefined) row.currency = data.currency;
    if (data.probability !== undefined) row.probability = data.probability;
    if (data.serviceType !== undefined) row.service_type = data.serviceType || null;
    if (data.source !== undefined) row.source = data.source || null;
    if (data.expectedCloseDate !== undefined) row.expected_close_date = data.expectedCloseDate || null;
    if (data.ownerId !== undefined) row.owner_id = data.ownerId || null;
    if (data.lostReason !== undefined) row.lost_reason = data.lostReason || null;
    const { data: updated, error } = await supabase.from('deals').update(row).eq('id', id).select().single();
    if (error) {
      toast.error(errorMessage(error, 'Failed to update deal'));
      return null;
    }
    if (!options.silent) toast.success('Deal updated');
    return replaceDeal(updated as DbDeal);
  }, [user]);

  const moveDealStage = useCallback(async (id: string, stage: DealStage, lostReason?: string) => {
    const deal = deals.find((d) => d.id === id);
    if (!deal || deal.stage === stage) return deal || null;
    // Optimistic: the card moves at once; the database result replaces it.
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage } : d)));
    const updated = await updateDeal(id, { stage, ...(stage === 'lost' ? { lostReason } : {}) }, { silent: true });
    if (!updated) setDeals((prev) => prev.map((d) => (d.id === id ? deal : d)));
    return updated;
  }, [deals, updateDeal]);

  // Returns the delivery project id (or null when none was requested).
  const winDeal = useCallback(async (id: string, createProject: boolean) => {
    if (!user) return { ok: false, projectId: null as string | null };
    const { data: projectId, error } = await supabase.rpc('win_deal', { _deal_id: id, _create_project: createProject });
    if (error) {
      toast.error(errorMessage(error, 'Failed to mark the deal as won'));
      return { ok: false, projectId: null };
    }
    const { data: row } = await supabase.from('deals').select('*').eq('id', id).single();
    if (row) replaceDeal(row as DbDeal);
    toast.success(projectId ? 'Deal won — delivery project created' : 'Deal won');
    return { ok: true, projectId: (projectId as string | null) ?? null };
  }, [user]);

  const deleteDeal = useCallback(async (id: string) => {
    if (!user) return false;
    const { error } = await supabase.from('deals').delete().eq('id', id);
    if (error) {
      toast.error(errorMessage(error, 'Failed to delete deal'));
      return false;
    }
    setDeals((prev) => prev.filter((d) => d.id !== id));
    setFollowUps((prev) => prev.filter((f) => f.dealId !== id));
    setQuotes((prev) => prev.map((q) => (q.dealId === id ? { ...q, dealId: undefined } : q)));
    toast.success('Deal deleted');
    return true;
  }, [user]);

  const getDeal = useCallback((id: string) => deals.find((d) => d.id === id), [deals]);

  const fetchStageHistory = useCallback(async (dealId: string) => {
    const { data } = await supabase
      .from('deal_stage_changes')
      .select('*')
      .eq('deal_id', dealId)
      .order('changed_at', { ascending: true });
    return (data || []).map((r) => mapDbStageChange(r as DbStageChange));
  }, []);

  // Follow-ups ------------------------------------------------------------

  const addFollowUp = useCallback(async (data: { clientId: string; dealId?: string; title: string; dueDate: string; assignedTo?: string }) => {
    if (!user) return null;
    const { data: row, error } = await supabase
      .from('follow_ups')
      .insert({
        client_id: data.clientId,
        deal_id: data.dealId || null,
        title: data.title,
        due_date: data.dueDate,
        assigned_to: data.assignedTo || user.id,
        created_by: user.id,
      })
      .select()
      .single();
    if (error) {
      toast.error(errorMessage(error, 'Failed to add follow-up'));
      return null;
    }
    const mapped = mapDbFollowUp(row as DbFollowUp);
    setFollowUps((prev) => [...prev, mapped].sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
    toast.success('Follow-up scheduled');
    return mapped;
  }, [user]);

  const setFollowUpDone = useCallback(async (id: string, done: boolean) => {
    if (!user) return;
    const completedAt = done ? new Date().toISOString() : null;
    const { error } = await supabase.from('follow_ups').update({ completed_at: completedAt }).eq('id', id);
    if (error) {
      toast.error(errorMessage(error, 'Failed to update follow-up'));
      return;
    }
    setFollowUps((prev) => prev.map((f) => (f.id === id ? { ...f, completedAt: completedAt || undefined } : f)));
  }, [user]);

  const deleteFollowUp = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('follow_ups').delete().eq('id', id);
    if (error) {
      toast.error(errorMessage(error, 'Failed to delete follow-up'));
      return;
    }
    setFollowUps((prev) => prev.filter((f) => f.id !== id));
  }, [user]);

  // Quotes ----------------------------------------------------------------

  const replaceQuote = (row: DbQuote) => {
    const mapped = mapDbQuote(row);
    setQuotes((prev) => (prev.some((q) => q.id === mapped.id) ? prev.map((q) => (q.id === mapped.id ? mapped : q)) : [mapped, ...prev]));
    return mapped;
  };

  const addQuote = useCallback(async (data: QuoteInput) => {
    if (!user) return null;
    const { data: row, error } = await supabase
      .from('quotes')
      .insert({ ...quoteToDb(data), client_id: data.clientId, created_by: user.id })
      .select()
      .single();
    if (error) {
      toast.error(errorMessage(error, 'Failed to create quote'));
      return null;
    }
    toast.success('Quote created');
    return replaceQuote(row as DbQuote);
  }, [user]);

  const updateQuote = useCallback(async (id: string, data: Partial<QuoteInput>) => {
    if (!user) return null;
    const { data: row, error } = await supabase.from('quotes').update(quoteToDb(data)).eq('id', id).select().single();
    if (error) {
      toast.error(errorMessage(error, 'Failed to update quote'));
      return null;
    }
    toast.success('Quote updated');
    return replaceQuote(row as DbQuote);
  }, [user]);

  const setQuoteStatus = useCallback(async (id: string, status: QuoteStatus) => {
    if (!user) return null;
    const { data: row, error } = await supabase.from('quotes').update({ status }).eq('id', id).select().single();
    if (error) {
      toast.error(errorMessage(error, 'Failed to update quote'));
      return null;
    }
    return replaceQuote(row as DbQuote);
  }, [user]);

  const convertQuoteToInvoice = useCallback(async (id: string) => {
    if (!user) return null;
    const { data: invoiceId, error } = await supabase.rpc('convert_quote_to_invoice', { _quote_id: id });
    if (error) {
      toast.error(errorMessage(error, 'Failed to create the invoice'));
      return null;
    }
    const { data: row } = await supabase.from('quotes').select('*').eq('id', id).single();
    if (row) replaceQuote(row as DbQuote);
    toast.success('Invoice created from quote');
    return invoiceId as string;
  }, [user]);

  const deleteQuote = useCallback(async (id: string) => {
    if (!user) return false;
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (error) {
      toast.error(errorMessage(error, 'Failed to delete quote'));
      return false;
    }
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    toast.success('Quote deleted');
    return true;
  }, [user]);

  const getQuote = useCallback((id: string) => quotes.find((q) => q.id === id), [quotes]);

  const getMemberName = useCallback(
    (userId?: string) => (userId ? teamMembers.find((m) => m.userId === userId)?.fullName || 'Team member' : 'Unassigned'),
    [teamMembers],
  );

  return {
    contacts,
    deals,
    followUps,
    quotes,
    teamMembers,
    isLoading,
    refetch: useCallback(() => fetchAll(true), [fetchAll]),
    refetchContacts: fetchContacts,
    addContact,
    updateContact,
    deleteContact,
    getContactsForClient,
    addDeal,
    updateDeal,
    moveDealStage,
    winDeal,
    deleteDeal,
    getDeal,
    fetchStageHistory,
    addFollowUp,
    setFollowUpDone,
    deleteFollowUp,
    addQuote,
    updateQuote,
    setQuoteStatus,
    convertQuoteToInvoice,
    deleteQuote,
    getQuote,
    getMemberName,
  };
}
