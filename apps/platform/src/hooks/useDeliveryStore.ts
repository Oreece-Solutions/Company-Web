import { useState, useEffect, useCallback } from 'react';
import { supabase, Tables, TablesInsert } from '@company-web/shared/data-access';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { hqErrorMessage } from '@/hooks/useHqStore';
import { SupportChannel, SupportPriority, SupportRequest, SupportRequestInput, SupportStatus, TimeEntry, TimeEntryInput } from '@/types/delivery';

// Time entries and support requests. The team can read both; people log their
// own time and the founder can correct it (RLS).

const opt = (v: string | null | undefined) => v || undefined;
const nul = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

function mapTime(db: Tables<'time_entries'>): TimeEntry {
  return {
    id: db.id, userId: db.user_id, projectId: db.project_id, taskId: opt(db.task_id), workedOn: db.worked_on,
    minutes: db.minutes, description: opt(db.description), billable: db.billable,
  };
}

function mapSupport(db: Tables<'support_requests'>): SupportRequest {
  return {
    id: db.id, clientId: db.client_id, projectId: opt(db.project_id), systemId: opt(db.system_id), retainerId: opt(db.retainer_id),
    title: db.title, details: opt(db.details), reportedBy: opt(db.reported_by), channel: db.channel as SupportChannel,
    priority: db.priority as SupportPriority, status: db.status as SupportStatus, billable: db.billable, assignedTo: opt(db.assigned_to),
    openedAt: db.opened_at, firstResponseAt: opt(db.first_response_at), resolvedAt: opt(db.resolved_at), resolution: opt(db.resolution),
  };
}

export function useDeliveryStore() {
  const { user, roles } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);

  const fetchAll = useCallback(async () => {
    if (!user || !roles?.length) return;
    const [t, s] = await Promise.all([
      supabase.from('time_entries').select('*').order('worked_on', { ascending: false }),
      supabase.from('support_requests').select('*').order('opened_at', { ascending: false }),
    ]);
    if (t.error || s.error) toast.error('Failed to load delivery data');
    if (t.data) setTimeEntries(t.data.map(mapTime));
    if (s.data) setSupportRequests(s.data.map(mapSupport));
  }, [user, roles]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveTime = useCallback(async (d: TimeEntryInput, id?: string) => {
    const row: TablesInsert<'time_entries'> = {
      project_id: d.projectId, task_id: d.taskId || null, worked_on: d.workedOn, minutes: d.minutes,
      description: nul(d.description), billable: d.billable,
    };
    const query = id ? supabase.from('time_entries').update(row).eq('id', id) : supabase.from('time_entries').insert(row);
    const { data, error } = await query.select().single();
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to save time'));
      return null;
    }
    const saved = mapTime(data);
    setTimeEntries((prev) => (id ? prev.map((x) => (x.id === id ? saved : x)) : [saved, ...prev]).sort((a, b) => b.workedOn.localeCompare(a.workedOn)));
    return saved;
  }, []);

  const deleteTime = useCallback(async (id: string) => {
    const { error } = await supabase.from('time_entries').delete().eq('id', id);
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to delete time'));
      return;
    }
    setTimeEntries((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const saveSupport = useCallback(async (d: Partial<SupportRequestInput>, id?: string) => {
    const row: Partial<TablesInsert<'support_requests'>> = {};
    if (d.clientId !== undefined) row.client_id = d.clientId;
    if (d.projectId !== undefined) row.project_id = d.projectId || null;
    if (d.systemId !== undefined) row.system_id = d.systemId || null;
    if (d.retainerId !== undefined) row.retainer_id = d.retainerId || null;
    if (d.title !== undefined) row.title = d.title.trim();
    if (d.details !== undefined) row.details = nul(d.details);
    if (d.reportedBy !== undefined) row.reported_by = nul(d.reportedBy);
    if (d.channel !== undefined) row.channel = d.channel;
    if (d.priority !== undefined) row.priority = d.priority;
    if (d.status !== undefined) row.status = d.status;
    if (d.billable !== undefined) row.billable = d.billable;
    if (d.assignedTo !== undefined) row.assigned_to = d.assignedTo || null;
    if (d.resolution !== undefined) row.resolution = nul(d.resolution);
    const query = id
      ? supabase.from('support_requests').update(row).eq('id', id)
      : supabase.from('support_requests').insert(row as TablesInsert<'support_requests'>);
    const { data, error } = await query.select().single();
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to save the support request'));
      return null;
    }
    const saved = mapSupport(data);
    setSupportRequests((prev) => (id ? prev.map((x) => (x.id === id ? saved : x)) : [saved, ...prev]));
    return saved;
  }, []);

  const deleteSupport = useCallback(async (id: string) => {
    const { error } = await supabase.from('support_requests').delete().eq('id', id);
    if (error) {
      toast.error(hqErrorMessage(error, 'Failed to delete'));
      return;
    }
    setSupportRequests((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { timeEntries, supportRequests, refetch: fetchAll, saveTime, deleteTime, saveSupport, deleteSupport };
}
