// Time on projects and client support (supabase/migrations/20261101000002_delivery_people.sql).

export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  taskId?: string;
  workedOn: string;
  minutes: number;
  description?: string;
  billable: boolean;
}
export type TimeEntryInput = Omit<TimeEntry, 'id' | 'userId'>;

export type SupportPriority = 'low' | 'normal' | 'urgent';
export type SupportStatus = 'open' | 'in_progress' | 'waiting_on_client' | 'resolved';
export type SupportChannel = 'email' | 'phone' | 'message' | 'meeting' | 'other';

export const SUPPORT_PRIORITY_LABELS: Record<SupportPriority, string> = { low: 'Low', normal: 'Normal', urgent: 'Urgent' };
export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  open: 'Open', in_progress: 'In progress', waiting_on_client: 'Waiting on client', resolved: 'Resolved',
};
export const SUPPORT_CHANNEL_LABELS: Record<SupportChannel, string> = { email: 'Email', phone: 'Phone', message: 'Message', meeting: 'Meeting', other: 'Other' };
// How quickly a client should hear back, by priority (hours from opening).
export const RESPONSE_TARGET_HOURS: Record<SupportPriority, number> = { urgent: 4, normal: 24, low: 72 };

export interface SupportRequest {
  id: string;
  clientId: string;
  projectId?: string;
  systemId?: string;
  retainerId?: string;
  title: string;
  details?: string;
  reportedBy?: string;
  channel: SupportChannel;
  priority: SupportPriority;
  status: SupportStatus;
  billable: boolean;
  assignedTo?: string;
  openedAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  resolution?: string;
}
export type SupportRequestInput = Omit<SupportRequest, 'id' | 'openedAt' | 'firstResponseAt' | 'resolvedAt'>;

export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

// Response due time for an open request, or undefined once answered.
export function responseDue(r: SupportRequest) {
  if (r.firstResponseAt || r.status !== 'open') return undefined;
  return new Date(new Date(r.openedAt).getTime() + RESPONSE_TARGET_HOURS[r.priority] * 3600_000);
}
