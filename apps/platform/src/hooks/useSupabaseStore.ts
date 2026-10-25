import { useState, useEffect, useCallback } from 'react';
import { supabase, Json } from '@company-web/shared/data-access';
import { useAuth } from '@/contexts/AuthContext';
import { Company, Client, ClientActivity, Invoice, LineItem, Currency, Payment, InvoiceStatus } from '@/types/invoice';
import { Project, Task } from '@/types/project';
import { toast } from 'sonner';

// All business data below is shared across the whole team (see
// supabase/migrations/20260916000001_platform_foundation.sql) -- queries are
// not scoped by the current user; RLS (is_team_member) controls access
// instead. `user_id` / `created_by` columns are kept only as an audit trail.

interface DbCompanySettings {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  tax_number: string | null;
  logo_url: string | null;
  bank_account_name: string | null;
  bank_name: string | null;
  bank_account_type: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  signature_url: string | null;
  default_currency: string | null;
  quote_terms: string | null;
}

interface DbClient {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  source: string | null;
  estimated_value: number | null;
  last_contacted_at: string | null;
  industry: string | null;
  website: string | null;
  country: string | null;
  notes: string | null;
  owner_id: string | null;
  created_at: string;
}

interface DbInvoice {
  id: string;
  user_id: string | null;
  client_id: string | null;
  project_id: string | null;
  invoice_number: string;
  date: string;
  due_date: string | null;
  items: Json;
  subtotal: number;
  total: number;
  notes: string | null;
  status: string;
  payment_date: string | null;
  payment_amount: number | null;
  payment_reference: string | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
}

interface DbPayment {
  id: string;
  invoice_id: string;
  user_id: string | null;
  payment_date: string;
  amount: number;
  reference: string | null;
  created_at: string;
}

interface DbActivity {
  id: string;
  client_id: string;
  deal_id: string | null;
  contact_id: string | null;
  type: string;
  note: string;
  created_by: string | null;
  created_at: string;
}

interface DbProject {
  id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  due_date: string | null;
  budget: number | null;
  health: Project['health'];
  next_milestone: string | null;
  waiting_on_client: string | null;
  created_at: string;
  updated_at: string;
}

interface DbTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: string | null;
  due_date: string | null;
  contractor_id: string | null;
  brief: string | null;
  definition_of_done: string | null;
  access_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapDbCompanyToCompany(db: DbCompanySettings): Company {
  return {
    id: db.id,
    name: db.name,
    address: db.address || '',
    email: db.email || '',
    phone: db.phone || '',
    website: db.website || undefined,
    taxNumber: db.tax_number || undefined,
    logo: db.logo_url || undefined,
    signature: db.signature_url || undefined,
    bankDetails: {
      bankName: db.bank_name || '',
      accountName: db.bank_account_name || '',
      accountType: db.bank_account_type || '',
      accountNumber: db.bank_account_number || '',
      branch: db.bank_branch || '',
    },
    defaultCurrency: (db.default_currency as Currency) || 'LKR',
    quoteTerms: db.quote_terms || '',
  };
}

function mapDbClientToClient(db: DbClient): Client {
  return {
    id: db.id,
    name: db.name,
    companyName: db.company_name || undefined,
    address: db.address || '',
    email: db.email || '',
    phone: db.phone || '',
    status: (db.status as Client['status']) || 'lead',
    source: db.source || undefined,
    estimatedValue: db.estimated_value ?? undefined,
    lastContactedAt: db.last_contacted_at || undefined,
    industry: db.industry || undefined,
    website: db.website || undefined,
    country: db.country || undefined,
    notes: db.notes || undefined,
    ownerId: db.owner_id || undefined,
    createdAt: db.created_at,
  };
}

function parseLineItems(items: Json): LineItem[] {
  if (Array.isArray(items)) {
    return items.map((item, idx) => ({
      id: (item as Record<string, unknown>).id as string || `item-${idx}`,
      description: (item as Record<string, unknown>).description as string || '',
      amount: Number((item as Record<string, unknown>).amount) || 0,
    }));
  }
  return [];
}

function mapDbPaymentToPayment(db: DbPayment): Payment {
  return {
    id: db.id,
    invoiceId: db.invoice_id,
    paymentDate: db.payment_date,
    amount: Number(db.amount),
    reference: db.reference || undefined,
    createdAt: db.created_at,
  };
}

function mapDbActivityToActivity(db: DbActivity): ClientActivity {
  return {
    id: db.id,
    clientId: db.client_id,
    dealId: db.deal_id || undefined,
    contactId: db.contact_id || undefined,
    type: (db.type as ClientActivity['type']) || 'note',
    note: db.note,
    createdBy: db.created_by || undefined,
    createdAt: db.created_at,
  };
}

function mapDbProjectToProject(db: DbProject): Project {
  return {
    id: db.id,
    clientId: db.client_id || undefined,
    name: db.name,
    description: db.description || undefined,
    status: (db.status as Project['status']) || 'planning',
    startDate: db.start_date || undefined,
    dueDate: db.due_date || undefined,
    budget: db.budget ?? undefined,
    health: db.health || 'on_track',
    nextMilestone: db.next_milestone || undefined,
    waitingOnClient: db.waiting_on_client || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapDbTaskToTask(db: DbTask): Task {
  return {
    id: db.id,
    projectId: db.project_id,
    title: db.title,
    description: db.description || undefined,
    status: (db.status as Task['status']) || 'todo',
    priority: (db.priority as Task['priority']) || 'medium',
    assignee: db.assignee || undefined,
    dueDate: db.due_date || undefined,
    contractorId: db.contractor_id || undefined,
    brief: db.brief || undefined,
    definitionOfDone: db.definition_of_done || undefined,
    accessNotes: db.access_notes || undefined,
    completedAt: db.completed_at || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapStatusFromDb(status: string): InvoiceStatus {
  if (status === 'Paid') return 'paid';
  if (status === 'Partially Paid') return 'partially_paid';
  return 'unpaid';
}

function mapDbInvoiceToInvoice(db: DbInvoice, payments: Payment[] = []): Invoice {
  return {
    id: db.id,
    invoiceNumber: db.invoice_number,
    clientId: db.client_id || '',
    projectId: db.project_id || undefined,
    invoiceDate: db.date,
    dueDate: db.due_date || '',
    currency: (db.currency as Currency) || 'LKR',
    lineItems: parseLineItems(db.items),
    subtotal: Number(db.subtotal),
    total: Number(db.total),
    status: mapStatusFromDb(db.status),
    notes: db.notes || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    paymentDate: db.payment_date || undefined,
    amountReceived: db.payment_amount ? Number(db.payment_amount) : undefined,
    paymentReference: db.payment_reference || undefined,
    payments,
  };
}

export function useSupabaseStore() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // `silent` reloads in the background (after database-side changes such as
  // a won deal creating a project) without showing the loading state.
  const fetchData = useCallback(async (silent = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);
    try {
      const { data: companyData } = await supabase
        .from('company_settings')
        .select('*')
        .maybeSingle();

      if (companyData) {
        setCompany(mapDbCompanyToCompany(companyData as DbCompanySettings));
      }

      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsData) {
        setClients(clientsData.map((c) => mapDbClientToClient(c as DbClient)));
      }

      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: true });

      const paymentsMap = new Map<string, Payment[]>();
      if (paymentsData) {
        for (const p of paymentsData) {
          const payment = mapDbPaymentToPayment(p as DbPayment);
          const existing = paymentsMap.get(payment.invoiceId) || [];
          existing.push(payment);
          paymentsMap.set(payment.invoiceId, existing);
        }
      }

      if (invoicesData) {
        setInvoices(invoicesData.map((i) => {
          const inv = i as DbInvoice;
          return mapDbInvoiceToInvoice(inv, paymentsMap.get(inv.id) || []);
        }));
      }

      const { data: activitiesData } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });

      if (activitiesData) {
        setActivities(activitiesData.map((a) => mapDbActivityToActivity(a as DbActivity)));
      }

      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsData) {
        setProjects(projectsData.map((p) => mapDbProjectToProject(p as DbProject)));
      }

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true });

      if (tasksData) {
        setTasks(tasksData.map((t) => mapDbTaskToTask(t as DbTask)));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  // Company settings (single shared row)
  const updateCompany = useCallback(async (data: Partial<Company>) => {
    if (!user || !company?.id) return;

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.taxNumber !== undefined) updateData.tax_number = data.taxNumber;
    if (data.logo !== undefined) updateData.logo_url = data.logo;
    if (data.signature !== undefined) updateData.signature_url = data.signature;
    if (data.defaultCurrency !== undefined) updateData.default_currency = data.defaultCurrency;
    if (data.quoteTerms !== undefined) updateData.quote_terms = data.quoteTerms;
    if (data.bankDetails) {
      updateData.bank_name = data.bankDetails.bankName;
      updateData.bank_account_name = data.bankDetails.accountName;
      updateData.bank_account_type = data.bankDetails.accountType;
      updateData.bank_account_number = data.bankDetails.accountNumber;
      updateData.bank_branch = data.bankDetails.branch;
    }

    const { data: updated, error } = await supabase
      .from('company_settings')
      .update(updateData)
      .eq('id', company.id)
      .select()
      .single();

    if (error) {
      toast.error('Failed to update company');
      return;
    }

    setCompany(mapDbCompanyToCompany(updated as DbCompanySettings));
    toast.success('Company updated');
  }, [user, company?.id]);

  // Client operations
  const addClient = useCallback(async (data: Omit<Client, 'id' | 'createdAt' | 'status'> & { status?: Client['status'] }) => {
    if (!user) return null;

    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        name: data.name,
        company_name: data.companyName || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        status: data.status || 'active',
        source: data.source || null,
        estimated_value: data.estimatedValue ?? null,
        industry: data.industry || null,
        website: data.website || null,
        country: data.country || null,
        notes: data.notes || null,
        owner_id: data.ownerId || null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add client');
      return null;
    }

    const mapped = mapDbClientToClient(newClient as DbClient);
    setClients(prev => [mapped, ...prev]);
    toast.success('Client added');
    return mapped;
  }, [user]);

  const updateClient = useCallback(async (id: string, data: Partial<Client>) => {
    if (!user) return;

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.companyName !== undefined) updateData.company_name = data.companyName || null;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.source !== undefined) updateData.source = data.source || null;
    if ('estimatedValue' in data) updateData.estimated_value = data.estimatedValue ?? null;
    if (data.industry !== undefined) updateData.industry = data.industry || null;
    if (data.website !== undefined) updateData.website = data.website || null;
    if (data.country !== undefined) updateData.country = data.country || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.ownerId !== undefined) updateData.owner_id = data.ownerId || null;

    const { error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update client');
      return;
    }

    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    toast.success('Client updated');
  }, [user]);

  const deleteClient = useCallback(async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete client');
      return;
    }

    setClients(prev => prev.filter(c => c.id !== id));
    toast.success('Client deleted');
  }, [user]);

  const getClient = useCallback((id: string) => {
    return clients.find(c => c.id === id);
  }, [clients]);

  // Client activity log
  const addActivity = useCallback(async (clientId: string, data: { type: ClientActivity['type']; note: string; dealId?: string; contactId?: string }) => {
    if (!user) return null;

    const { data: newActivity, error } = await supabase
      .from('activities')
      .insert({
        client_id: clientId,
        deal_id: data.dealId || null,
        contact_id: data.contactId || null,
        type: data.type,
        note: data.note,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to log activity');
      return null;
    }

    const mapped = mapDbActivityToActivity(newActivity as DbActivity);
    setActivities(prev => [mapped, ...prev]);
    if (mapped.type !== 'note') {
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, lastContactedAt: mapped.createdAt } : c));
    }
    return mapped;
  }, [user]);

  const getActivitiesForClient = useCallback((clientId: string) => {
    return activities.filter(a => a.clientId === clientId);
  }, [activities]);

  // Project operations
  const addProject = useCallback(async (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'health'> & { status?: Project['status']; health?: Project['health'] }) => {
    if (!user) return null;

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        client_id: data.clientId || null,
        name: data.name,
        description: data.description || null,
        status: data.status || 'planning',
        start_date: data.startDate || null,
        due_date: data.dueDate || null,
        budget: data.budget ?? null,
        health: data.health || 'on_track',
        next_milestone: data.nextMilestone || null,
        waiting_on_client: data.waitingOnClient || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create project');
      return null;
    }

    const mapped = mapDbProjectToProject(newProject as DbProject);
    setProjects(prev => [mapped, ...prev]);
    toast.success('Project created');
    return mapped;
  }, [user]);

  const updateProject = useCallback(async (id: string, data: Partial<Project>) => {
    if (!user) return;

    const updateData: Record<string, unknown> = {};
    if (data.clientId !== undefined) updateData.client_id = data.clientId || null;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    // Empty form fields mean "no date"; Postgres rejects an empty string.
    if (data.startDate !== undefined) updateData.start_date = data.startDate || null;
    if (data.dueDate !== undefined) updateData.due_date = data.dueDate || null;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.health !== undefined) updateData.health = data.health;
    if (data.nextMilestone !== undefined) updateData.next_milestone = data.nextMilestone || null;
    if (data.waitingOnClient !== undefined) updateData.waiting_on_client = data.waitingOnClient || null;

    const { error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update project');
      return;
    }

    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p));
    toast.success('Project updated');
  }, [user]);

  const deleteProject = useCallback(async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete project');
      return;
    }

    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.filter(t => t.projectId !== id));
    toast.success('Project deleted');
  }, [user]);

  const getProject = useCallback((id: string) => {
    return projects.find(p => p.id === id);
  }, [projects]);

  // Task operations
  const addTask = useCallback(async (projectId: string, data: Omit<Task, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'status'> & { status?: Task['status'] }) => {
    if (!user) return null;

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        title: data.title,
        description: data.description || null,
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        assignee: data.assignee || null,
        due_date: data.dueDate || null,
        contractor_id: data.contractorId || null,
        brief: data.brief || null,
        definition_of_done: data.definitionOfDone || null,
        access_notes: data.accessNotes || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add task');
      return null;
    }

    const mapped = mapDbTaskToTask(newTask as DbTask);
    setTasks(prev => [...prev, mapped]);
    toast.success('Task added');
    return mapped;
  }, [user]);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    if (!user) return;

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.assignee !== undefined) updateData.assignee = data.assignee || null;
    if (data.dueDate !== undefined) updateData.due_date = data.dueDate || null;
    if (data.contractorId !== undefined) updateData.contractor_id = data.contractorId || null;
    if (data.brief !== undefined) updateData.brief = data.brief || null;
    if (data.definitionOfDone !== undefined) updateData.definition_of_done = data.definitionOfDone || null;
    if (data.accessNotes !== undefined) updateData.access_notes = data.accessNotes || null;

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update task');
      return;
    }

    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next = { ...t, ...data, updatedAt: new Date().toISOString() };
      if (data.status !== undefined) next.completedAt = data.status === 'done' ? t.completedAt || new Date().toISOString() : undefined;
      return next;
    }));
  }, [user]);

  const deleteTask = useCallback(async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete task');
      return;
    }

    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success('Task deleted');
  }, [user]);

  const getTasksForProject = useCallback((projectId: string) => {
    return tasks.filter(t => t.projectId === projectId);
  }, [tasks]);

  // Invoice operations
  const createInvoice = useCallback(async (data: {
    clientId: string;
    projectId?: string;
    invoiceDate: string;
    dueDate: string;
    currency: Currency;
    lineItems: Omit<LineItem, 'id'>[];
    notes?: string;
  }) => {
    if (!user) return null;

    const lineItems: LineItem[] = data.lineItems.map((item, idx) => ({
      ...item,
      id: `item-${idx}`,
    }));
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

    // Invoice numbers are sequential across the whole team, not per-user.
    const { count } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true });

    const total = (count ?? invoices.length);
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const invoiceNumber = `INV-${year}${month}-${(total + 1).toString().padStart(4, '0')}`;

    const { data: newInvoice, error } = await supabase
      .from('invoices')
      .insert([{
        user_id: user.id,
        client_id: data.clientId,
        project_id: data.projectId || null,
        invoice_number: invoiceNumber,
        date: data.invoiceDate,
        due_date: data.dueDate,
        items: lineItems as unknown as Json,
        subtotal,
        total: subtotal,
        notes: data.notes || null,
        status: 'Unpaid',
        currency: data.currency,
      }])
      .select()
      .single();

    if (error) {
      toast.error('Failed to create invoice');
      return null;
    }

    const mapped = mapDbInvoiceToInvoice(newInvoice as DbInvoice);
    setInvoices(prev => [mapped, ...prev]);
    toast.success('Invoice created');
    return mapped;
  }, [user, invoices.length]);

  const updateInvoice = useCallback(async (id: string, data: Partial<Invoice>) => {
    if (!user) return;

    const updateData: Record<string, unknown> = {};
    if (data.clientId !== undefined) updateData.client_id = data.clientId;
    if (data.projectId !== undefined) updateData.project_id = data.projectId || null;
    if (data.invoiceDate !== undefined) updateData.date = data.invoiceDate;
    if (data.dueDate !== undefined) updateData.due_date = data.dueDate;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.status !== undefined) updateData.status = data.status === 'paid' ? 'Paid' : 'Unpaid';
    if (data.paymentDate !== undefined) updateData.payment_date = data.paymentDate;
    if (data.amountReceived !== undefined) updateData.payment_amount = data.amountReceived;
    if (data.paymentReference !== undefined) updateData.payment_reference = data.paymentReference;

    if (data.lineItems !== undefined) {
      updateData.items = data.lineItems as unknown as Record<string, unknown>[];
      const subtotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0);
      updateData.subtotal = subtotal;
      updateData.total = subtotal;
    }

    const { error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update invoice');
      return;
    }

    setInvoices(prev => prev.map(inv => {
      if (inv.id !== id) return inv;
      const updated = { ...inv, ...data, updatedAt: new Date().toISOString() };
      if (data.lineItems) {
        updated.subtotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0);
        updated.total = updated.subtotal;
      }
      return updated;
    }));
  }, [user]);

  const deleteInvoice = useCallback(async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete invoice');
      return;
    }

    setInvoices(prev => prev.filter(inv => inv.id !== id));
    toast.success('Invoice deleted');
  }, [user]);

  const getInvoice = useCallback((id: string) => {
    return invoices.find(inv => inv.id === id);
  }, [invoices]);

  // Payment operations
  const addPayment = useCallback(async (invoiceId: string, data: { paymentDate: string; amount: number; reference?: string }) => {
    if (!user) return null;

    const { data: newPayment, error } = await supabase
      .from('payments')
      .insert({
        invoice_id: invoiceId,
        user_id: user.id,
        payment_date: data.paymentDate,
        amount: data.amount,
        reference: data.reference || null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to record payment');
      return null;
    }

    const payment = mapDbPaymentToPayment(newPayment as DbPayment);

    // Refetch the invoice to get updated status from database trigger
    const { data: updatedInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (updatedInvoice) {
      setInvoices(prev => prev.map(inv => {
        if (inv.id !== invoiceId) return inv;
        const payments = [...(inv.payments || []), payment];
        return mapDbInvoiceToInvoice(updatedInvoice as DbInvoice, payments);
      }));
    }

    toast.success('Payment recorded');
    return payment;
  }, [user]);

  const deletePayment = useCallback(async (paymentId: string, invoiceId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (error) {
      toast.error('Failed to delete payment');
      return;
    }

    const { data: updatedInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (updatedInvoice) {
      setInvoices(prev => prev.map(inv => {
        if (inv.id !== invoiceId) return inv;
        const payments = (inv.payments || []).filter(p => p.id !== paymentId);
        return mapDbInvoiceToInvoice(updatedInvoice as DbInvoice, payments);
      }));
    }

    toast.success('Payment deleted');
  }, [user]);

  return {
    company: company || {
      id: '',
      name: '',
      address: '',
      email: '',
      phone: '',
    },
    clients,
    invoices,
    activities,
    projects,
    tasks,
    isLoading,
    refetch,
    updateCompany,
    addClient,
    updateClient,
    deleteClient,
    getClient,
    addActivity,
    getActivitiesForClient,
    addProject,
    updateProject,
    deleteProject,
    getProject,
    addTask,
    updateTask,
    deleteTask,
    getTasksForProject,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoice,
    addPayment,
    deletePayment,
  };
}
