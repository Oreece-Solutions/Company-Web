import { useState, useEffect, useCallback } from 'react';
import { supabase, Json, Tables, TablesInsert } from '@company-web/shared/data-access';
import { useAuth } from '@/contexts/AuthContext';
import { Currency } from '@/types/invoice';
import {
  ClientSystem,
  ClientSystemInput,
  Contractor,
  ContractorInput,
  Prospect,
  ProspectInput,
  ProspectStage,
  Service,
  ServiceInput,
  SiteCheck,
  WeeklyMetrics,
  WeeklyPriority,
  WeeklyReview,
  WeeklyReviewInput,
} from '@/types/hq';
import { LogContactInput } from '@/types/sales';
import { toast } from 'sonner';

// Oreece HQ data (supabase/migrations/20261025000001_hq_operations.sql):
// Lead Finder prospects, the services catalogue, weekly reviews, contractors
// and client systems. Shared across the team; RLS controls access. Rules such
// as "a problem needs evidence" and "outreach needs a consent basis" live in
// the database, so its error messages are shown as they are.

const num = (v: number | null | undefined) => (v === null || v === undefined ? undefined : Number(v));
const opt = (v: string | null | undefined) => v || undefined;
const nul = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

function mapProspect(db: Tables<'prospects'>): Prospect {
  return {
    id: db.id,
    businessName: db.business_name,
    website: opt(db.website),
    industry: opt(db.industry),
    location: opt(db.location),
    contactChannel: opt(db.contact_channel),
    leadSource: opt(db.lead_source),
    observedProblem: opt(db.observed_problem),
    evidence: opt(db.evidence),
    tier: (db.tier as Prospect['tier']) || undefined,
    stage: db.stage,
    consentBasis: opt(db.consent_basis),
    nextAction: opt(db.next_action),
    nextActionDate: opt(db.next_action_date),
    lastContactedAt: opt(db.last_contacted_at),
    estimatedValue: num(db.estimated_value),
    currency: db.currency as Currency,
    notes: opt(db.notes),
    siteCheck: (db.site_check as SiteCheck | null) || undefined,
    siteCheckedAt: opt(db.site_checked_at),
    disqualifiedReason: opt(db.disqualified_reason),
    clientId: opt(db.client_id),
    dealId: opt(db.deal_id),
    segment: (db.segment as Prospect['segment']) || undefined,
    assignedTo: opt(db.assigned_to),
    discoveryAt: opt(db.discovery_at),
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function prospectToDb(data: Partial<ProspectInput>) {
  const row: Partial<TablesInsert<'prospects'>> = {};
  if (data.businessName !== undefined) row.business_name = data.businessName.trim();
  if (data.website !== undefined) row.website = nul(data.website);
  if (data.industry !== undefined) row.industry = nul(data.industry);
  if (data.location !== undefined) row.location = nul(data.location);
  if (data.contactChannel !== undefined) row.contact_channel = nul(data.contactChannel);
  if (data.leadSource !== undefined) row.lead_source = nul(data.leadSource);
  if (data.observedProblem !== undefined) row.observed_problem = nul(data.observedProblem);
  if (data.evidence !== undefined) row.evidence = nul(data.evidence);
  if (data.tier !== undefined) row.tier = data.tier || null;
  if (data.stage !== undefined) row.stage = data.stage;
  if (data.consentBasis !== undefined) row.consent_basis = nul(data.consentBasis);
  if (data.nextAction !== undefined) row.next_action = nul(data.nextAction);
  if (data.nextActionDate !== undefined) row.next_action_date = data.nextActionDate || null;
  if (data.lastContactedAt !== undefined) row.last_contacted_at = data.lastContactedAt || null;
  if (data.estimatedValue !== undefined) row.estimated_value = data.estimatedValue ?? null;
  if (data.currency !== undefined) row.currency = data.currency;
  if (data.notes !== undefined) row.notes = nul(data.notes);
  if (data.disqualifiedReason !== undefined) row.disqualified_reason = nul(data.disqualifiedReason);
  if (data.segment !== undefined) row.segment = data.segment || null;
  if (data.assignedTo !== undefined) row.assigned_to = data.assignedTo || null;
  return row;
}

function mapService(db: Tables<'services'>): Service {
  return {
    id: db.id,
    name: db.name,
    category: db.category as Service['category'],
    description: opt(db.description),
    deliverables: opt(db.deliverables),
    exclusions: opt(db.exclusions),
    price: num(db.price),
    priceApproved: db.price_approved,
    currency: db.currency as Currency,
    unit: db.unit as Service['unit'],
    estimatedHours: num(db.estimated_hours),
    estimatedCost: num(db.estimated_cost),
    active: db.active,
    sortOrder: db.sort_order,
    notes: opt(db.notes),
  };
}

function serviceToDb(data: Partial<ServiceInput>) {
  const row: Partial<TablesInsert<'services'>> = {};
  if (data.name !== undefined) row.name = data.name.trim();
  if (data.category !== undefined) row.category = data.category;
  if (data.description !== undefined) row.description = nul(data.description);
  if (data.deliverables !== undefined) row.deliverables = nul(data.deliverables);
  if (data.exclusions !== undefined) row.exclusions = nul(data.exclusions);
  if (data.price !== undefined) row.price = data.price ?? null;
  if (data.priceApproved !== undefined) row.price_approved = data.priceApproved;
  if (data.currency !== undefined) row.currency = data.currency;
  if (data.unit !== undefined) row.unit = data.unit;
  if (data.estimatedHours !== undefined) row.estimated_hours = data.estimatedHours ?? null;
  if (data.estimatedCost !== undefined) row.estimated_cost = data.estimatedCost ?? null;
  if (data.active !== undefined) row.active = data.active;
  if (data.sortOrder !== undefined) row.sort_order = data.sortOrder;
  if (data.notes !== undefined) row.notes = nul(data.notes);
  return row;
}

function mapReview(db: Tables<'weekly_reviews'>): WeeklyReview {
  const priorities = Array.isArray(db.priorities) ? (db.priorities as Record<string, string>[]) : [];
  return {
    id: db.id,
    weekEnding: db.week_ending,
    metrics: (db.metrics as WeeklyMetrics) || {},
    hoursSales: num(db.hours_sales),
    hoursDelivery: num(db.hours_delivery),
    hoursAdmin: num(db.hours_admin),
    completed: opt(db.completed),
    blockers: opt(db.blockers),
    marketing: opt(db.marketing),
    notes: opt(db.notes),
    priorities: priorities.map((p) => ({ title: p.title || '', why: p.why, outcome: p.outcome, nextStep: p.next_step })),
    updatedAt: db.updated_at,
  };
}

function mapContractor(db: Tables<'contractors'>): Contractor {
  return {
    id: db.id,
    name: db.name,
    skills: db.skills || [],
    email: opt(db.email),
    phone: opt(db.phone),
    location: opt(db.location),
    rate: num(db.rate),
    rateUnit: db.rate_unit as Contractor['rateUnit'],
    currency: db.currency as Currency,
    agreementSignedOn: opt(db.agreement_signed_on),
    confidentialitySigned: db.confidentiality_signed,
    ipAssignmentSigned: db.ip_assignment_signed,
    active: db.active,
    notes: opt(db.notes),
  };
}

function contractorToDb(data: Partial<ContractorInput>) {
  const row: Partial<TablesInsert<'contractors'>> = {};
  if (data.name !== undefined) row.name = data.name.trim();
  if (data.skills !== undefined) row.skills = data.skills.map((s) => s.trim()).filter(Boolean);
  if (data.email !== undefined) row.email = nul(data.email);
  if (data.phone !== undefined) row.phone = nul(data.phone);
  if (data.location !== undefined) row.location = nul(data.location);
  if (data.rate !== undefined) row.rate = data.rate ?? null;
  if (data.rateUnit !== undefined) row.rate_unit = data.rateUnit;
  if (data.currency !== undefined) row.currency = data.currency;
  if (data.agreementSignedOn !== undefined) row.agreement_signed_on = data.agreementSignedOn || null;
  if (data.confidentialitySigned !== undefined) row.confidentiality_signed = data.confidentialitySigned;
  if (data.ipAssignmentSigned !== undefined) row.ip_assignment_signed = data.ipAssignmentSigned;
  if (data.active !== undefined) row.active = data.active;
  if (data.notes !== undefined) row.notes = nul(data.notes);
  return row;
}

function mapSystem(db: Tables<'client_systems'>): ClientSystem {
  return {
    id: db.id,
    clientId: opt(db.client_id),
    kind: db.kind as ClientSystem['kind'],
    name: db.name,
    url: opt(db.url),
    provider: opt(db.provider),
    status: db.status as ClientSystem['status'],
    renewsOn: opt(db.renews_on),
    renewalCost: num(db.renewal_cost),
    currency: db.currency as Currency,
    paidBy: db.paid_by as ClientSystem['paidBy'],
    onCarePlan: db.on_care_plan,
    notes: opt(db.notes),
  };
}

function systemToDb(data: Partial<ClientSystemInput>) {
  const row: Partial<TablesInsert<'client_systems'>> = {};
  if (data.clientId !== undefined) row.client_id = data.clientId || null;
  if (data.kind !== undefined) row.kind = data.kind;
  if (data.name !== undefined) row.name = data.name.trim();
  if (data.url !== undefined) row.url = nul(data.url);
  if (data.provider !== undefined) row.provider = nul(data.provider);
  if (data.status !== undefined) row.status = data.status;
  if (data.renewsOn !== undefined) row.renews_on = data.renewsOn || null;
  if (data.renewalCost !== undefined) row.renewal_cost = data.renewalCost ?? null;
  if (data.currency !== undefined) row.currency = data.currency;
  if (data.paidBy !== undefined) row.paid_by = data.paidBy;
  if (data.onCarePlan !== undefined) row.on_care_plan = data.onCarePlan;
  if (data.notes !== undefined) row.notes = nul(data.notes);
  return row;
}

// Database constraint names → what to fix.
export function hqErrorMessage(error: { message?: string; code?: string } | null, fallback: string) {
  const message = error?.message || '';
  if (/prospects_problem_needs_evidence/.test(message)) return 'Add the evidence for that problem (how you know it)';
  if (/prospects_contact_needs_consent_basis/.test(message)) return 'Record why contacting them is allowed (consent basis) first';
  if (/prospects_disqualified_needs_reason/.test(message)) return 'Say why this prospect is disqualified';
  if (/prospects_website_unique/.test(message)) return 'A prospect with this website already exists';
  if (/services_name_unique/.test(message)) return 'A service with this name already exists';
  if (/services_approved_needs_price/.test(message)) return 'An approved price needs an amount';
  if (/sales_activities_contact_needs_channel/.test(message)) return 'Say how you contacted them (channel)';
  if (/onboarding_plans_one_active/.test(message)) return 'This person already has an active onboarding plan';
  if (/sales_targets_unique/.test(message)) return 'That target already exists';
  if (/row-level security|permission/i.test(message)) return 'You do not have permission to do that';
  if (message && !/violates|syntax|column/i.test(message)) return message;
  return fallback;
}

export function useHqStore() {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [systems, setSystems] = useState<ClientSystem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async (silent = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);
    try {
      const [p, s, w, c, sys] = await Promise.all([
        supabase.from('prospects').select('*').order('created_at', { ascending: false }),
        supabase.from('services').select('*').order('sort_order').order('name'),
        supabase.from('weekly_reviews').select('*').order('week_ending', { ascending: false }),
        supabase.from('contractors').select('*').order('name'),
        supabase.from('client_systems').select('*').order('name'),
      ]);
      if (p.data) setProspects(p.data.map(mapProspect));
      if (s.data) setServices(s.data.map(mapService));
      if (w.data) setWeeklyReviews(w.data.map(mapReview));
      if (c.data) setContractors(c.data.map(mapContractor));
      if (sys.data) setSystems(sys.data.map(mapSystem));
    } catch (error) {
      console.error('Error fetching HQ data:', error);
      toast.error('Failed to load HQ data');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Prospects --------------------------------------------------------------

  const replaceProspect = (row: Tables<'prospects'>) => {
    const mapped = mapProspect(row);
    setProspects((prev) => (prev.some((p) => p.id === mapped.id) ? prev.map((p) => (p.id === mapped.id ? mapped : p)) : [mapped, ...prev]));
    return mapped;
  };

  const addProspect = useCallback(async (data: ProspectInput, options: { silent?: boolean } = {}) => {
    if (!user) return null;
    const { data: row, error } = await supabase
      .from('prospects')
      .insert({ ...prospectToDb(data), business_name: data.businessName.trim(), created_by: user.id })
      .select()
      .single();
    if (error) {
      if (!options.silent) toast.error(hqErrorMessage(error, 'Failed to add prospect'));
      return { error: hqErrorMessage(error, 'Failed to add prospect') };
    }
    if (!options.silent) toast.success('Prospect added');
    return { prospect: replaceProspect(row) };
  }, [user]);

  const updateProspect = useCallback(async (id: string, data: Partial<ProspectInput>, options: { silent?: boolean } = {}) => {
    if (!user) return null;
    const { data: row, error } = await supabase.from('prospects').update(prospectToDb(data)).eq('id', id).select().single();
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to update prospect'));
      return null;
    }
    if (!options.silent) toast.success('Prospect updated');
    return replaceProspect(row);
  }, [user]);

  const setProspectStage = useCallback(
    (id: string, stage: ProspectStage, extra: Partial<ProspectInput> = {}) => updateProspect(id, { stage, ...extra }, { silent: true }),
    [updateProspect],
  );

  const deleteProspect = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('prospects').delete().eq('id', id);
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to delete prospect'));
      return;
    }
    setProspects((prev) => prev.filter((p) => p.id !== id));
    toast.success('Prospect deleted');
  }, [user]);

  // Creates the account + deal; callers refresh the main and sales stores.
  const convertProspect = useCallback(async (id: string, dealTitle?: string, contactName?: string) => {
    if (!user) return null;
    const { data: dealId, error } = await supabase.rpc('convert_prospect', {
      _prospect_id: id,
      _deal_title: dealTitle || null,
      _contact_name: contactName || null,
    });
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to convert the prospect'));
      return null;
    }
    const { data: row } = await supabase.from('prospects').select('*').eq('id', id).single();
    if (row) replaceProspect(row);
    toast.success('Converted: account and deal created');
    return dealId as string;
  }, [user]);

  // Website check runs in the site-check edge function (browsers cannot fetch
  // other sites). Returns null when the function is not deployed.
  const checkWebsite = useCallback(async (id: string) => {
    const prospect = prospects.find((p) => p.id === id);
    if (!user || !prospect?.website) return null;
    const { data, error } = await supabase.functions.invoke('site-check', { body: { url: prospect.website } });
    if (error || !data) {
      toast.error('Website check is not available yet (the site-check function is not deployed)');
      return null;
    }
    const { data: row, error: saveError } = await supabase
      .from('prospects')
      .update({ site_check: data as Json, site_checked_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (saveError) {
      toast.error(hqErrorMessage(saveError, 'Failed to save the website check'));
      return null;
    }
    toast.success('Website checked');
    return replaceProspect(row);
  }, [user, prospects]);

  // Sales desk: both actions run in the database so the activity log, stage
  // and next action change together (log_sales_contact / book_discovery).
  const reloadProspect = async (id: string) => {
    const { data: row } = await supabase.from('prospects').select('*').eq('id', id).single();
    return row ? replaceProspect(row) : null;
  };

  const logContact = useCallback(async (id: string, data: LogContactInput) => {
    if (!user) return null;
    const { error } = await supabase.rpc('log_sales_contact', {
      _prospect_id: id,
      _kind: data.kind,
      _channel: data.channel || null,
      _outcome: data.outcome || null,
      _objection: data.objection || null,
      _offer: data.offer || null,
      _notes: data.notes || null,
      _next_action: data.nextAction || null,
      _next_action_date: data.nextActionDate || null,
    });
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to log the contact'));
      return null;
    }
    toast.success(data.kind === 'note' ? 'Note added' : 'Logged');
    return reloadProspect(id);
  }, [user]);

  const bookDiscovery = useCallback(async (id: string, at: string, notes?: string) => {
    if (!user) return null;
    const { error } = await supabase.rpc('book_discovery', { _prospect_id: id, _at: at, _notes: notes || null });
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to book the call'));
      return null;
    }
    toast.success('Discovery call booked');
    return reloadProspect(id);
  }, [user]);

  // Services ---------------------------------------------------------------

  const saveService = useCallback(async (data: ServiceInput, id?: string) => {
    if (!user) return null;
    const query = id
      ? supabase.from('services').update(serviceToDb(data)).eq('id', id)
      : supabase.from('services').insert({ ...serviceToDb(data), name: data.name.trim() });
    const { data: row, error } = await query.select().single();
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to save service'));
      return null;
    }
    const mapped = mapService(row);
    setServices((prev) => {
      const next = prev.some((s) => s.id === mapped.id) ? prev.map((s) => (s.id === mapped.id ? mapped : s)) : [...prev, mapped];
      return next.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    });
    toast.success(id ? 'Service updated' : 'Service added');
    return mapped;
  }, [user]);

  const deleteService = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to delete service'));
      return;
    }
    setServices((prev) => prev.filter((s) => s.id !== id));
    toast.success('Service deleted');
  }, [user]);

  // Weekly reviews ---------------------------------------------------------

  // Creates the review if needed and refreshes its metrics from live data.
  const openWeeklyReview = useCallback(async (weekEnding: string) => {
    if (!user) return null;
    const { data: id, error } = await supabase.rpc('refresh_weekly_review', { _week_ending: weekEnding });
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to load the weekly review'));
      return null;
    }
    const { data: row } = await supabase.from('weekly_reviews').select('*').eq('id', id as string).single();
    if (!row) return null;
    const mapped = mapReview(row);
    setWeeklyReviews((prev) =>
      (prev.some((r) => r.id === mapped.id) ? prev.map((r) => (r.id === mapped.id ? mapped : r)) : [mapped, ...prev])
        .sort((a, b) => b.weekEnding.localeCompare(a.weekEnding)));
    return mapped;
  }, [user]);

  const saveWeeklyReview = useCallback(async (id: string, data: WeeklyReviewInput) => {
    if (!user) return null;
    const row: Partial<TablesInsert<'weekly_reviews'>> = {};
    if (data.hoursSales !== undefined) row.hours_sales = data.hoursSales ?? null;
    if (data.hoursDelivery !== undefined) row.hours_delivery = data.hoursDelivery ?? null;
    if (data.hoursAdmin !== undefined) row.hours_admin = data.hoursAdmin ?? null;
    if (data.completed !== undefined) row.completed = nul(data.completed);
    if (data.blockers !== undefined) row.blockers = nul(data.blockers);
    if (data.marketing !== undefined) row.marketing = nul(data.marketing);
    if (data.notes !== undefined) row.notes = nul(data.notes);
    if (data.priorities !== undefined) {
      row.priorities = data.priorities
        .filter((p: WeeklyPriority) => p.title.trim())
        .slice(0, 3)
        .map((p) => ({ title: p.title.trim(), why: p.why || '', outcome: p.outcome || '', next_step: p.nextStep || '' }));
    }
    const { data: updated, error } = await supabase.from('weekly_reviews').update(row).eq('id', id).select().single();
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to save the review'));
      return null;
    }
    const mapped = mapReview(updated);
    setWeeklyReviews((prev) => prev.map((r) => (r.id === id ? mapped : r)));
    toast.success('Review saved');
    return mapped;
  }, [user]);

  // Contractors ------------------------------------------------------------

  const saveContractor = useCallback(async (data: ContractorInput, id?: string) => {
    if (!user) return null;
    const query = id
      ? supabase.from('contractors').update(contractorToDb(data)).eq('id', id)
      : supabase.from('contractors').insert({ ...contractorToDb(data), name: data.name.trim() });
    const { data: row, error } = await query.select().single();
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to save contractor'));
      return null;
    }
    const mapped = mapContractor(row);
    setContractors((prev) =>
      (prev.some((c) => c.id === mapped.id) ? prev.map((c) => (c.id === mapped.id ? mapped : c)) : [...prev, mapped])
        .sort((a, b) => a.name.localeCompare(b.name)));
    toast.success(id ? 'Contractor updated' : 'Contractor added');
    return mapped;
  }, [user]);

  const deleteContractor = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('contractors').delete().eq('id', id);
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to delete contractor'));
      return;
    }
    setContractors((prev) => prev.filter((c) => c.id !== id));
    toast.success('Contractor deleted');
  }, [user]);

  const getContractor = useCallback((id?: string) => (id ? contractors.find((c) => c.id === id) : undefined), [contractors]);

  // Client systems ---------------------------------------------------------

  const saveSystem = useCallback(async (data: ClientSystemInput, id?: string) => {
    if (!user) return null;
    const query = id
      ? supabase.from('client_systems').update(systemToDb(data)).eq('id', id)
      : supabase.from('client_systems').insert({ ...systemToDb(data), kind: data.kind, name: data.name.trim() });
    const { data: row, error } = await query.select().single();
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to save system'));
      return null;
    }
    const mapped = mapSystem(row);
    setSystems((prev) =>
      (prev.some((s) => s.id === mapped.id) ? prev.map((s) => (s.id === mapped.id ? mapped : s)) : [...prev, mapped])
        .sort((a, b) => a.name.localeCompare(b.name)));
    toast.success(id ? 'System updated' : 'System added');
    return mapped;
  }, [user]);

  const deleteSystem = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('client_systems').delete().eq('id', id);
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to delete system'));
      return;
    }
    setSystems((prev) => prev.filter((s) => s.id !== id));
    toast.success('System deleted');
  }, [user]);

  return {
    prospects,
    services,
    weeklyReviews,
    contractors,
    systems,
    isLoading,
    refetch: useCallback(() => fetchAll(true), [fetchAll]),
    addProspect,
    updateProspect,
    setProspectStage,
    deleteProspect,
    convertProspect,
    checkWebsite,
    logContact,
    bookDiscovery,
    saveService,
    deleteService,
    openWeeklyReview,
    saveWeeklyReview,
    saveContractor,
    deleteContractor,
    getContractor,
    saveSystem,
    deleteSystem,
  };
}
