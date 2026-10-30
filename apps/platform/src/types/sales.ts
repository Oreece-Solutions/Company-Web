// Sales department (supabase/migrations/20261031000001_sales_department.sql).

export type Segment =
  | 'commercial_cleaning' | 'residential_cleaning' | 'specialist_cleaning' | 'automotive' | 'handyman' | 'other';

export const SEGMENT_LABELS: Record<Segment, string> = {
  commercial_cleaning: 'Commercial cleaning',
  residential_cleaning: 'Residential cleaning',
  specialist_cleaning: 'Specialist cleaning',
  automotive: 'Automotive',
  handyman: 'Handyman',
  other: 'Other',
};

// Cleaning first; the others open up once the process repeats.
export const FOCUS_SEGMENTS: Segment[] = ['commercial_cleaning', 'residential_cleaning', 'specialist_cleaning'];

export type ActivityKind =
  | 'researched' | 'qualified' | 'first_contact' | 'follow_up' | 'conversation' | 'meeting_booked' | 'note';

export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  researched: 'Researched',
  qualified: 'Qualified (ready to contact)',
  first_contact: 'First contact',
  follow_up: 'Follow-up',
  conversation: 'Conversation',
  meeting_booked: 'Discovery call booked',
  note: 'Note',
};

export type Channel = 'email' | 'phone' | 'linkedin' | 'contact_form' | 'in_person' | 'other';

export const CHANNEL_LABELS: Record<Channel, string> = {
  email: 'Email',
  phone: 'Phone',
  linkedin: 'LinkedIn',
  contact_form: 'Contact form',
  in_person: 'In person',
  other: 'Other',
};

export interface SalesActivity {
  id: string;
  prospectId: string;
  userId?: string;
  kind: ActivityKind;
  channel?: Channel;
  outcome?: string;
  objection?: string;
  offer?: string;
  notes?: string;
  occurredAt: string;
}

// The six weekly numbers, in the order of the daily workflow.
export type TargetMetric = 'researched' | 'qualified' | 'first_contact' | 'follow_up' | 'conversation' | 'meeting_booked';

export const TARGET_METRICS: TargetMetric[] = ['researched', 'qualified', 'first_contact', 'follow_up', 'conversation', 'meeting_booked'];

export const TARGET_LABELS: Record<TargetMetric, string> = {
  researched: 'Businesses researched',
  qualified: 'Qualified prospects added',
  first_contact: 'Personalised first contacts',
  follow_up: 'Follow-ups',
  conversation: 'Meaningful conversations',
  meeting_booked: 'Discovery meetings booked',
};

export interface SalesTarget {
  id: string;
  metric: TargetMetric;
  userId?: string;
  weeklyMin: number;
  weeklyMax?: number;
  note?: string;
}

export type ScoreMetrics = Record<TargetMetric, number> & {
  with_evidence: number;
  tier_ab: number;
  disqualified: number;
  with_segment: number;
  open: number;
  no_next_action: number;
  overdue: number;
};

export interface ScoreRow {
  userId: string;
  fullName?: string;
  metrics: ScoreMetrics;
}

export interface TeamMember {
  userId: string;
  fullName?: string;
  role: string;
}

export type TemplateKind = 'email' | 'phone_script' | 'follow_up' | 'booking' | 'objection' | 'other';

export const TEMPLATE_KIND_LABELS: Record<TemplateKind, string> = {
  email: 'First email',
  phone_script: 'Phone script',
  follow_up: 'Follow-up',
  booking: 'Booking a call',
  objection: 'Objection',
  other: 'Other',
};

export type TemplateStatus = 'draft' | 'approved' | 'retired';

export interface SalesTemplate {
  id: string;
  name: string;
  kind: TemplateKind;
  segment?: string;
  subject?: string;
  body: string;
  status: TemplateStatus;
  approvedAt?: string;
  sortOrder: number;
}

export type SalesTemplateInput = Omit<SalesTemplate, 'id' | 'approvedAt'>;

export interface PlaybookSection {
  id: string;
  slug: string;
  title: string;
  body: string;
  sortOrder: number;
  updatedAt: string;
}

export interface OnboardingAssessment {
  prospects?: string;
  responses?: string;
  meetings?: string;
  objections?: string;
  bestOffer?: string;
  changes?: string;
}

export interface OnboardingPlan {
  id: string;
  userId: string;
  roleTitle: string;
  startDate: string;
  status: 'active' | 'completed' | 'cancelled';
  assessment: OnboardingAssessment;
  completedAt?: string;
}

export interface OnboardingItem {
  id: string;
  planId: string;
  week: number;
  owner: 'founder' | 'rep';
  title: string;
  detail?: string;
  link?: string;
  sortOrder: number;
  doneAt?: string;
  doneBy?: string;
}

export const ONBOARDING_WEEKS: Record<number, string> = {
  0: 'Before day one',
  1: 'Week 1 · Learn Oreece, services, portfolio and sales process',
  2: 'Week 2 · Research prospects and begin approved outreach',
  3: 'Week 3 · Build conversations and book discovery meetings',
  4: 'Week 4 · Review pipeline, improve messaging, generate qualified opportunities',
};

// Fills {placeholders} in a template; unknown ones stay visible so nothing is sent half-filled.
export function fillTemplate(text: string, values: Record<string, string | undefined>) {
  return text.replace(/\{(\w+)\}/g, (m, key) => values[key]?.trim() || m);
}

export interface LogContactInput {
  // "contact" is stored as first_contact or follow_up by the database.
  kind: 'contact' | 'conversation' | 'note';
  channel?: Channel | '';
  outcome?: string;
  objection?: string;
  offer?: string;
  notes?: string;
  nextAction?: string;
  nextActionDate?: string;
}
