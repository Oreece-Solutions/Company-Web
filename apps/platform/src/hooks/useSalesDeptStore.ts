import { useState, useEffect, useCallback } from 'react';
import { addDays, format } from 'date-fns';
import { supabase, Json, Tables, TablesInsert } from '@company-web/shared/data-access';
import { useAuth } from '@/contexts/AuthContext';
import { hqErrorMessage } from '@/hooks/useHqStore';
import {
  OnboardingAssessment,
  OnboardingItem,
  OnboardingPlan,
  PlaybookSection,
  SalesActivity,
  SalesTarget,
  SalesTemplate,
  SalesTemplateInput,
  ScoreMetrics,
  ScoreRow,
  TargetMetric,
  TeamMember,
} from '@/types/sales';
import { toast } from 'sonner';

// Sales department data (supabase/migrations/20261031000001_sales_department.sql):
// activity log, weekly targets, outreach templates, the playbook and 30-day
// onboarding. Who may change what (admin approves templates, sets targets,
// edits the playbook) is enforced by RLS; the UI only hides what would fail.

const opt = (v: string | null | undefined) => v || undefined;
const nul = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export function mapActivity(db: Tables<'sales_activities'>): SalesActivity {
  return {
    id: db.id,
    prospectId: db.prospect_id,
    userId: opt(db.user_id),
    kind: db.kind as SalesActivity['kind'],
    channel: (db.channel as SalesActivity['channel']) || undefined,
    outcome: opt(db.outcome),
    objection: opt(db.objection),
    offer: opt(db.offer),
    notes: opt(db.notes),
    occurredAt: db.occurred_at,
  };
}

function mapTarget(db: Tables<'sales_targets'>): SalesTarget {
  return {
    id: db.id,
    metric: db.metric as TargetMetric,
    userId: opt(db.user_id),
    weeklyMin: db.weekly_min,
    weeklyMax: db.weekly_max ?? undefined,
    note: opt(db.note),
  };
}

function mapTemplate(db: Tables<'sales_templates'>): SalesTemplate {
  return {
    id: db.id,
    name: db.name,
    kind: db.kind as SalesTemplate['kind'],
    segment: opt(db.segment),
    subject: opt(db.subject),
    body: db.body,
    status: db.status as SalesTemplate['status'],
    approvedAt: opt(db.approved_at),
    sortOrder: db.sort_order,
  };
}

function mapSection(db: Tables<'playbook_sections'>): PlaybookSection {
  return { id: db.id, slug: db.slug, title: db.title, body: db.body, sortOrder: db.sort_order, updatedAt: db.updated_at };
}

function mapPlan(db: Tables<'onboarding_plans'>): OnboardingPlan {
  const a = (db.assessment || {}) as Record<string, string>;
  return {
    id: db.id,
    userId: db.user_id,
    roleTitle: db.role_title,
    startDate: db.start_date,
    status: db.status as OnboardingPlan['status'],
    assessment: {
      prospects: a.prospects, responses: a.responses, meetings: a.meetings,
      objections: a.objections, bestOffer: a.best_offer, changes: a.changes,
    },
    completedAt: opt(db.completed_at),
  };
}

function mapItem(db: Tables<'onboarding_items'>): OnboardingItem {
  return {
    id: db.id,
    planId: db.plan_id,
    week: db.week,
    owner: db.owner as OnboardingItem['owner'],
    title: db.title,
    detail: opt(db.detail),
    link: opt(db.link),
    sortOrder: db.sort_order,
    doneAt: opt(db.done_at),
    doneBy: opt(db.done_by),
  };
}

// The weekly target that applies to someone: their own row, else the team default.
export function targetFor(targets: SalesTarget[], metric: TargetMetric, userId?: string) {
  return targets.find((t) => t.metric === metric && t.userId && t.userId === userId)
    ?? targets.find((t) => t.metric === metric && !t.userId);
}

export function useSalesDeptStore() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [templates, setTemplates] = useState<SalesTemplate[]>([]);
  const [playbook, setPlaybook] = useState<PlaybookSection[]>([]);
  // The last five weeks: enough for today, this week and last week on the desk.
  const [recentActivities, setRecentActivities] = useState<SalesActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async (silent = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);
    try {
      const since = format(addDays(new Date(), -35), 'yyyy-MM-dd');
      const [admin, dir, t, tpl, pb, act] = await Promise.all([
        supabase.rpc('is_admin', { _user_id: user.id }),
        supabase.rpc('team_directory'),
        supabase.from('sales_targets').select('*'),
        supabase.from('sales_templates').select('*').order('sort_order').order('name'),
        supabase.from('playbook_sections').select('*').order('sort_order'),
        supabase.from('sales_activities').select('*').gte('occurred_at', since).order('occurred_at', { ascending: false }),
      ]);
      setIsAdmin(admin.data === true);
      if (dir.data) setTeam(dir.data.map((m) => ({ userId: m.user_id, fullName: opt(m.full_name), role: m.role })));
      if (t.data) setTargets(t.data.map(mapTarget));
      if (tpl.data) setTemplates(tpl.data.map(mapTemplate));
      if (pb.data) setPlaybook(pb.data.map(mapSection));
      if (act.data) setRecentActivities(act.data.map(mapActivity));
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast.error('Failed to load sales data');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const memberName = useCallback((id?: string) => {
    if (!id) return undefined;
    if (id === user?.id) return 'You';
    return team.find((m) => m.userId === id)?.fullName || 'Team member';
  }, [team, user?.id]);

  // Activities -------------------------------------------------------------

  const activitiesFor = useCallback(async (prospectId: string) => {
    const { data } = await supabase.from('sales_activities').select('*')
      .eq('prospect_id', prospectId).order('occurred_at', { ascending: false });
    return (data || []).map(mapActivity);
  }, []);

  const scoreboard = useCallback(async (from: string, to: string): Promise<ScoreRow[]> => {
    const { data, error } = await supabase.rpc('sales_scoreboard', { _from: from, _to: to });
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to load the scoreboard'));
      return [];
    }
    return (data || []).map((r) => ({ userId: r.user_id, fullName: opt(r.full_name), metrics: r.metrics as unknown as ScoreMetrics }));
  }, []);

  // Targets ----------------------------------------------------------------

  const saveTarget = useCallback(async (metric: TargetMetric, weeklyMin: number, weeklyMax: number | undefined, userId?: string) => {
    const existing = targets.find((t) => t.metric === metric && (t.userId ?? null) === (userId ?? null));
    const row = { metric, user_id: userId ?? null, weekly_min: weeklyMin, weekly_max: weeklyMax ?? null, updated_at: new Date().toISOString() };
    const query = existing
      ? supabase.from('sales_targets').update(row).eq('id', existing.id)
      : supabase.from('sales_targets').insert(row);
    const { data, error } = await query.select().single();
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to save the target'));
      return null;
    }
    const mapped = mapTarget(data);
    setTargets((prev) => (existing ? prev.map((t) => (t.id === existing.id ? mapped : t)) : [...prev, mapped]));
    return mapped;
  }, [targets]);

  // Templates --------------------------------------------------------------

  const saveTemplate = useCallback(async (data: SalesTemplateInput, id?: string) => {
    const row: Partial<TablesInsert<'sales_templates'>> = {
      name: data.name.trim(),
      kind: data.kind,
      segment: nul(data.segment),
      subject: nul(data.subject),
      body: data.body.trim(),
      status: data.status,
      sort_order: data.sortOrder,
    };
    const query = id
      ? supabase.from('sales_templates').update(row).eq('id', id)
      : supabase.from('sales_templates').insert(row as TablesInsert<'sales_templates'>);
    const { data: saved, error } = await query.select().single();
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to save the template'));
      return null;
    }
    const mapped = mapTemplate(saved);
    setTemplates((prev) =>
      (prev.some((t) => t.id === mapped.id) ? prev.map((t) => (t.id === mapped.id ? mapped : t)) : [...prev, mapped])
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
    if (id && data.status === 'approved' && mapped.status === 'draft') {
      toast.info('Saved as a draft: the founder needs to approve the new wording');
    } else {
      toast.success(id ? 'Template saved' : 'Template added');
    }
    return mapped;
  }, []);

  const setTemplateStatus = useCallback(async (template: SalesTemplate, status: SalesTemplate['status']) => {
    const { data, error } = await supabase.from('sales_templates').update({ status }).eq('id', template.id).select().single();
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to update the template'));
      return null;
    }
    const mapped = mapTemplate(data);
    setTemplates((prev) => prev.map((t) => (t.id === mapped.id ? mapped : t)));
    toast.success(status === 'approved' ? 'Approved for use' : status === 'retired' ? 'Retired' : 'Back to draft');
    return mapped;
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    const { error } = await supabase.from('sales_templates').delete().eq('id', id);
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to delete the template'));
      return;
    }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success('Template deleted');
  }, []);

  // Playbook ---------------------------------------------------------------

  const saveSection = useCallback(async (section: { title: string; body: string; slug?: string; sortOrder?: number }, id?: string) => {
    const slug = section.slug || section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    const row = { title: section.title.trim(), body: section.body, updated_by: user?.id ?? null, updated_at: new Date().toISOString() };
    const query = id
      ? supabase.from('playbook_sections').update(row).eq('id', id)
      : supabase.from('playbook_sections').insert({ ...row, slug: `${slug}-${Date.now().toString(36)}`, sort_order: section.sortOrder ?? 999 });
    const { data, error } = await query.select().single();
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to save the section'));
      return null;
    }
    const mapped = mapSection(data);
    setPlaybook((prev) =>
      (prev.some((s) => s.id === mapped.id) ? prev.map((s) => (s.id === mapped.id ? mapped : s)) : [...prev, mapped])
        .sort((a, b) => a.sortOrder - b.sortOrder));
    toast.success('Playbook saved');
    return mapped;
  }, [user?.id]);

  const deleteSection = useCallback(async (id: string) => {
    const { error } = await supabase.from('playbook_sections').delete().eq('id', id);
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to delete the section'));
      return;
    }
    setPlaybook((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Onboarding -------------------------------------------------------------

  const loadOnboarding = useCallback(async () => {
    const [plans, items] = await Promise.all([
      supabase.from('onboarding_plans').select('*').order('start_date', { ascending: false }),
      supabase.from('onboarding_items').select('*').order('week').order('sort_order'),
    ]);
    return { plans: (plans.data || []).map(mapPlan), items: (items.data || []).map(mapItem) };
  }, []);

  const startOnboarding = useCallback(async (userId: string, startDate: string) => {
    const { data, error } = await supabase.rpc('start_sales_onboarding', { _user_id: userId, _start_date: startDate });
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to start onboarding'));
      return null;
    }
    toast.success('30-day plan created');
    return data as string;
  }, []);

  const tickItem = useCallback(async (item: OnboardingItem, done: boolean) => {
    const { data, error } = await supabase.from('onboarding_items')
      .update({ done_at: done ? new Date().toISOString() : null }).eq('id', item.id).select().single();
    if (error || !data) {
      toast.error(hqErrorMessage(error, 'Only the founder can tick founder items'));
      return null;
    }
    return mapItem(data);
  }, []);

  const savePlan = useCallback(async (id: string, data: { assessment?: OnboardingAssessment; status?: OnboardingPlan['status'] }) => {
    const row: Partial<TablesInsert<'onboarding_plans'>> = { updated_at: new Date().toISOString() };
    if (data.assessment) {
      const a = data.assessment;
      row.assessment = {
        prospects: a.prospects || '', responses: a.responses || '', meetings: a.meetings || '',
        objections: a.objections || '', best_offer: a.bestOffer || '', changes: a.changes || '',
      } as Json;
    }
    if (data.status) {
      row.status = data.status;
      row.completed_at = data.status === 'completed' ? new Date().toISOString() : null;
    }
    const { data: saved, error } = await supabase.from('onboarding_plans').update(row).eq('id', id).select().single();
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to save the plan'));
      return null;
    }
    toast.success(data.status === 'completed' ? 'Onboarding completed' : 'Saved');
    return mapPlan(saved);
  }, []);

  return {
    isAdmin,
    team,
    targets,
    templates,
    playbook,
    recentActivities,
    isLoading,
    refetch: useCallback(() => fetchAll(true), [fetchAll]),
    memberName,
    activitiesFor,
    scoreboard,
    saveTarget,
    saveTemplate,
    setTemplateStatus,
    deleteTemplate,
    saveSection,
    deleteSection,
    loadOnboarding,
    startOnboarding,
    tickItem,
    savePlan,
  };
}
