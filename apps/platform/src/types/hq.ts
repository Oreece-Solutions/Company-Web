import { Currency } from '@/types/invoice';
import { Segment } from '@/types/sales';

// Oreece HQ (supabase/migrations/20261025000001_hq_operations.sql).

export type ProspectStage =
  | 'researching'
  | 'ready'
  | 'contacted'
  | 'follow_up_due'
  | 'conversation_booked'
  | 'nurture'
  | 'converted'
  | 'disqualified';

export const PROSPECT_STAGES: ProspectStage[] = [
  'researching', 'ready', 'contacted', 'follow_up_due', 'conversation_booked', 'nurture', 'converted', 'disqualified',
];

export const PROSPECT_STAGE_LABELS: Record<ProspectStage, string> = {
  researching: 'Researching',
  ready: 'Ready to contact',
  contacted: 'Contacted',
  follow_up_due: 'Follow-up due',
  conversation_booked: 'Conversation booked',
  nurture: 'Nurture',
  converted: 'Converted',
  disqualified: 'Disqualified',
};

// Stages that count as reaching out; the database requires a consent basis for them.
export const OUTREACH_STAGES: ProspectStage[] = ['contacted', 'follow_up_due', 'conversation_booked', 'nurture', 'converted'];

export type ProspectTier = 'A' | 'B' | 'C';

export interface SiteCheck {
  status?: string;
  finalUrl?: string;
  seconds?: number;
  kb?: number;
  https?: boolean;
  viewport?: boolean;
  form?: boolean;
  quoteWords?: boolean;
  onlineBooking?: boolean;
  telLink?: boolean;
  whatsapp?: boolean;
  copyright?: number | null;
  title?: string | null;
  metaDescription?: boolean;
  platform?: string;
  privateSite?: boolean;
  issues?: string[];
  error?: string;
}

export interface Prospect {
  id: string;
  businessName: string;
  website?: string;
  industry?: string;
  location?: string;
  contactChannel?: string;
  leadSource?: string;
  observedProblem?: string;
  evidence?: string;
  tier?: ProspectTier;
  stage: ProspectStage;
  consentBasis?: string;
  nextAction?: string;
  nextActionDate?: string;
  lastContactedAt?: string;
  estimatedValue?: number;
  currency: Currency;
  notes?: string;
  siteCheck?: SiteCheck;
  siteCheckedAt?: string;
  disqualifiedReason?: string;
  clientId?: string;
  dealId?: string;
  segment?: Segment;
  assignedTo?: string;
  discoveryAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProspectInput = Omit<Prospect, 'id' | 'createdAt' | 'updatedAt' | 'clientId' | 'dealId' | 'siteCheck' | 'siteCheckedAt' | 'lastContactedAt' | 'segment' | 'assignedTo' | 'discoveryAt'> & {
  lastContactedAt?: string;
  segment?: Segment | '';
  assignedTo?: string;
};

export type ServiceCategory = 'project' | 'recurring' | 'hourly' | 'add_on';
export type ServiceUnit = 'fixed' | 'month' | 'hour';

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  project: 'Project',
  recurring: 'Recurring',
  hourly: 'Hourly',
  add_on: 'Add-on',
};

export const SERVICE_UNIT_LABELS: Record<ServiceUnit, string> = {
  fixed: 'fixed',
  month: '/ month',
  hour: '/ hour',
};

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  description?: string;
  deliverables?: string;
  exclusions?: string;
  price?: number;
  priceApproved: boolean;
  currency: Currency;
  unit: ServiceUnit;
  estimatedHours?: number;
  estimatedCost?: number;
  active: boolean;
  sortOrder: number;
  notes?: string;
}

export type ServiceInput = Omit<Service, 'id'>;

export interface WeeklyPriority {
  title: string;
  why?: string;
  outcome?: string;
  nextStep?: string;
}

export type MoneyByCurrency = Partial<Record<Currency, number>>;

export interface WeeklyMetrics {
  week_start?: string;
  week_ending?: string;
  prospects_added?: number;
  prospects_contacted?: number;
  conversations?: number;
  deals_created?: number;
  deals_won?: number;
  deals_lost?: number;
  quotes_sent?: number;
  invoiced?: MoneyByCurrency;
  cash_received?: MoneyByCurrency;
  outstanding?: MoneyByCurrency;
  open_pipeline?: MoneyByCurrency;
  follow_ups_overdue?: number;
  projects_at_risk?: number;
  tasks_done?: number;
}

export interface WeeklyReview {
  id: string;
  weekEnding: string;
  metrics: WeeklyMetrics;
  hoursSales?: number;
  hoursDelivery?: number;
  hoursAdmin?: number;
  completed?: string;
  blockers?: string;
  marketing?: string;
  notes?: string;
  priorities: WeeklyPriority[];
  updatedAt: string;
}

export type WeeklyReviewInput = Partial<Omit<WeeklyReview, 'id' | 'weekEnding' | 'metrics' | 'updatedAt'>>;

export type RateUnit = 'hour' | 'day' | 'fixed';

export interface Contractor {
  id: string;
  name: string;
  skills: string[];
  email?: string;
  phone?: string;
  location?: string;
  rate?: number;
  rateUnit: RateUnit;
  currency: Currency;
  agreementSignedOn?: string;
  confidentialitySigned: boolean;
  ipAssignmentSigned: boolean;
  active: boolean;
  notes?: string;
}

export type ContractorInput = Omit<Contractor, 'id'>;

export type SystemKind =
  | 'website' | 'web_app' | 'domain' | 'hosting' | 'repository' | 'database' | 'email' | 'automation' | 'social' | 'other';

export const SYSTEM_KIND_LABELS: Record<SystemKind, string> = {
  website: 'Website',
  web_app: 'Web app',
  domain: 'Domain',
  hosting: 'Hosting',
  repository: 'Repository',
  database: 'Database',
  email: 'Email',
  automation: 'Automation',
  social: 'Social account',
  other: 'Other',
};

export type SystemStatus = 'building' | 'live' | 'paused' | 'retired';

export const SYSTEM_STATUS_LABELS: Record<SystemStatus, string> = {
  building: 'Building',
  live: 'Live',
  paused: 'Paused',
  retired: 'Retired',
};

export interface ClientSystem {
  id: string;
  clientId?: string;
  kind: SystemKind;
  name: string;
  url?: string;
  provider?: string;
  status: SystemStatus;
  renewsOn?: string;
  renewalCost?: number;
  currency: Currency;
  paidBy: 'client' | 'oreece';
  onCarePlan: boolean;
  notes?: string;
}

export type ClientSystemInput = Omit<ClientSystem, 'id'>;

export interface SocialQueueItem {
  contentId: string;
  approvalId?: string;
  brand: string;
  platform: string;
  format: string;
  status: string;
  headline?: string;
  hook?: string;
  caption?: string;
  cta?: string;
  hashtags: string[];
  linkUrl?: string;
  revision: number;
  feedback?: string;
  slotAt?: string;
  updatedAt: string;
}
