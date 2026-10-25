import { Currency } from './invoice';

export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export const OPEN_DEAL_STAGES: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation'];
export const DEAL_STAGES: DealStage[] = [...OPEN_DEAL_STAGES, 'won', 'lost'];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

// Mirrors public.deal_stage_probability() in the database.
export const DEAL_STAGE_PROBABILITY: Record<DealStage, number> = {
  lead: 10,
  qualified: 25,
  proposal: 50,
  negotiation: 75,
  won: 100,
  lost: 0,
};

export const SERVICE_TYPES = [
  'Web development',
  'Mobile app',
  'Custom software',
  'Cloud & DevOps',
  'IT support',
  'Cybersecurity',
  'Consulting',
  'Other',
];

export const LEAD_SOURCES = ['Website', 'Referral', 'LinkedIn', 'Social media', 'Cold outreach', 'Event', 'Partner', 'Other'];

export interface Contact {
  id: string;
  clientId: string;
  fullName: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
  notes?: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  clientId: string;
  contactId?: string;
  title: string;
  stage: DealStage;
  value: number;
  currency: Currency;
  probability: number;
  serviceType?: string;
  source?: string;
  expectedCloseDate?: string;
  ownerId?: string;
  lostReason?: string;
  closedAt?: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DealStageChange {
  id: string;
  dealId: string;
  fromStage?: DealStage;
  toStage: DealStage;
  changedBy?: string;
  changedAt: string;
}

export interface FollowUp {
  id: string;
  clientId: string;
  dealId?: string;
  title: string;
  dueDate: string;
  assignedTo?: string;
  completedAt?: string;
  createdAt: string;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
};

export interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  clientId: string;
  dealId?: string;
  contactId?: string;
  title: string;
  status: QuoteStatus;
  issueDate: string;
  validUntil?: string;
  currency: Currency;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  terms?: string;
  invoiceId?: string;
  sentAt?: string;
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type QuoteInput = Pick<
  Quote,
  'clientId' | 'dealId' | 'contactId' | 'title' | 'issueDate' | 'validUntil' | 'currency' | 'items' | 'discount' | 'taxRate' | 'notes' | 'terms'
>;

export interface TeamMember {
  userId: string;
  fullName: string;
}

// Mirrors the totals computed by public.quotes_before_write().
export function computeQuoteTotals(items: QuoteItem[], discount: number, taxRate: number) {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const subtotal = items.reduce((sum, item) => sum + round2((item.quantity || 0) * (item.unitPrice || 0)), 0);
  const taxAmount = round2((subtotal - (discount || 0)) * (taxRate || 0) / 100);
  return { subtotal, taxAmount, total: round2(subtotal - (discount || 0) + taxAmount) };
}

// A sent quote past its valid-until date is shown as expired.
export function effectiveQuoteStatus(quote: Quote, today = new Date().toISOString().slice(0, 10)): QuoteStatus {
  if (quote.status === 'sent' && quote.validUntil && quote.validUntil < today) return 'expired';
  return quote.status;
}
