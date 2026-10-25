export interface BankDetails {
  bankName: string;
  accountName: string;
  accountType: string;
  accountNumber: string;
  branch: string;
}

export interface Company {
  id: string;
  name: string;
  logo?: string;
  address: string;
  email: string;
  phone: string;
  website?: string;
  taxNumber?: string;
  signature?: string;
  bankDetails?: BankDetails;
  defaultCurrency?: Currency;
  quoteTerms?: string;
}

export type ClientStatus = 'lead' | 'prospect' | 'active' | 'inactive';

export interface Client {
  id: string;
  name: string;
  companyName?: string;
  address: string;
  email: string;
  phone: string;
  status: ClientStatus;
  source?: string;
  estimatedValue?: number;
  lastContactedAt?: string;
  industry?: string;
  website?: string;
  country?: string;
  notes?: string;
  ownerId?: string;
  createdAt: string;
}

export interface ClientActivity {
  id: string;
  clientId: string;
  dealId?: string;
  contactId?: string;
  type: 'call' | 'email' | 'meeting' | 'note';
  note: string;
  createdBy?: string;
  createdAt: string;
}

export interface LineItem {
  id: string;
  description: string;
  amount: number;
}

export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid';

export type Currency = 'LKR' | 'NZD' | 'AUD' | 'USD' | 'EUR' | 'GBP';

export interface Payment {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amount: number;
  reference?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  projectId?: string;
  invoiceDate: string;
  dueDate: string;
  currency: Currency;
  lineItems: LineItem[];
  subtotal: number;
  total: number;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Payment tracking (aggregated)
  paymentDate?: string;
  amountReceived?: number;
  paymentReference?: string;
  // Multiple payments
  payments?: Payment[];
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  LKR: 'Rs.',
  NZD: 'NZ$',
  AUD: 'A$',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export const CURRENCIES: Currency[] = ['LKR', 'NZD', 'AUD', 'USD', 'EUR', 'GBP'];
