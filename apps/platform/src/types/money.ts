import { Currency } from '@/types/invoice';

// Money: retainers, expenses and GST (supabase/migrations/20261101000001_money.sql).

export type BillingInterval = 'monthly' | 'quarterly' | 'yearly';
export const INTERVAL_LABELS: Record<BillingInterval, string> = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };
// Months per period, to turn any retainer into monthly recurring revenue.
export const INTERVAL_MONTHS: Record<BillingInterval, number> = { monthly: 1, quarterly: 3, yearly: 12 };

export type RetainerStatus = 'active' | 'paused' | 'ended';
export const RETAINER_STATUS_LABELS: Record<RetainerStatus, string> = { active: 'Active', paused: 'Paused', ended: 'Ended' };

export interface Retainer {
  id: string;
  clientId: string;
  serviceId?: string;
  name: string;
  description?: string;
  amount: number;
  currency: Currency;
  interval: BillingInterval;
  nextInvoiceDate: string;
  paymentTermsDays: number;
  status: RetainerStatus;
  startDate: string;
  endDate?: string;
  lastInvoiceId?: string;
  notes?: string;
}
export type RetainerInput = Omit<Retainer, 'id' | 'lastInvoiceId'>;

export type ExpenseCategory = 'software' | 'hosting' | 'contractors' | 'marketing' | 'equipment' | 'office' | 'travel' | 'professional_fees' | 'bank_fees' | 'other';
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  software: 'Software & subscriptions',
  hosting: 'Hosting & domains',
  contractors: 'Contractors',
  marketing: 'Marketing & ads',
  equipment: 'Equipment',
  office: 'Office & phone',
  travel: 'Travel',
  professional_fees: 'Accounting & legal',
  bank_fees: 'Bank fees',
  other: 'Other',
};

export interface Expense {
  id: string;
  spentOn: string;
  supplier: string;
  description?: string;
  category: ExpenseCategory;
  amount: number;
  currency: Currency;
  gstClaimable: boolean;
  projectId?: string;
  contractorId?: string;
  receiptUrl?: string;
  notes?: string;
  createdBy?: string;
}
export type ExpenseInput = Omit<Expense, 'id' | 'createdBy'>;

export interface GstSummary {
  registered: boolean;
  rate: number;
  basis: 'payments' | 'invoice';
  sales_incl: number;
  zero_rated_sales: number;
  purchases_incl: number;
  purchases_not_claimable: number;
  gst_on_sales: number;
  gst_on_purchases: number;
  gst_to_pay: number;
}
