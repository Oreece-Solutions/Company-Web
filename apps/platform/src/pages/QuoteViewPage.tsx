import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Building2, Check, Edit, FileText, Printer, Send, Trash2, X } from 'lucide-react';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@company-web/shared/ui';
import { QuoteStatusBadge } from '@/components/crm/Badges';
import { effectiveQuoteStatus } from '@/types/crm';
import { formatMoney } from '@/lib/money';

export default function QuoteViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getClient, company, refetch, getInvoice } = useAppStore();
  const { getQuote, getDeal, contacts, setQuoteStatus, convertQuoteToInvoice, deleteQuote, isLoading } = useSales();
  const [isWorking, setIsWorking] = useState(false);

  const quote = id ? getQuote(id) : undefined;
  if (!quote) {
    return (
      <AppLayout>
        <PageHeader title={isLoading ? 'Loading…' : 'Quote not found'} />
        <Link to="/quotes" className="text-accent hover:underline">Back to Quotes</Link>
      </AppLayout>
    );
  }

  const client = getClient(quote.clientId);
  const deal = quote.dealId ? getDeal(quote.dealId) : undefined;
  const contact = quote.contactId ? contacts.find((c) => c.id === quote.contactId) : undefined;
  const invoice = quote.invoiceId ? getInvoice(quote.invoiceId) : undefined;
  const status = effectiveQuoteStatus(quote);
  const invoiced = !!quote.invoiceId;

  const run = async (fn: () => Promise<unknown>) => {
    setIsWorking(true);
    await fn();
    setIsWorking(false);
  };

  const handleConvert = () => run(async () => {
    const invoiceId = await convertQuoteToInvoice(quote.id);
    if (invoiceId) {
      await refetch();
      navigate(`/invoices/${invoiceId}`);
    }
  });

  const handleDelete = () => run(async () => {
    if (await deleteQuote(quote.id)) navigate('/quotes');
  });

  return (
    <AppLayout>
      <Link to="/quotes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden">
        <ArrowLeft className="h-4 w-4" />
        Back to Quotes
      </Link>
      <PageHeader
        title={quote.quoteNumber}
        description={client ? `For ${client.companyName || client.name}` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!invoiced && quote.status === 'draft' && (
              <Button variant="outline" className="gap-2" disabled={isWorking} onClick={() => run(() => setQuoteStatus(quote.id, 'sent'))}>
                <Send className="h-4 w-4" />
                Mark as sent
              </Button>
            )}
            {!invoiced && (quote.status === 'sent' || quote.status === 'expired') && (
              <>
                <Button variant="outline" className="gap-2 text-success" disabled={isWorking} onClick={() => run(() => setQuoteStatus(quote.id, 'accepted'))}>
                  <Check className="h-4 w-4" />
                  Accepted
                </Button>
                <Button variant="outline" className="gap-2 text-destructive" disabled={isWorking} onClick={() => run(() => setQuoteStatus(quote.id, 'declined'))}>
                  <X className="h-4 w-4" />
                  Declined
                </Button>
              </>
            )}
            {!invoiced && (quote.status === 'sent' || quote.status === 'accepted') && (
              <Button className="gap-2 bg-accent hover:bg-accent/90" disabled={isWorking} onClick={handleConvert}>
                <FileText className="h-4 w-4" />
                Create invoice
              </Button>
            )}
            {!invoiced && (
              <Button variant="outline" className="gap-2" onClick={() => navigate(`/quotes/${quote.id}/edit`)}>
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            {!invoiced && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" title="Delete quote">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete quote</AlertDialogTitle>
                    <AlertDialogDescription>Delete {quote.quoteNumber}? This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        }
      />

      {/* Links and status, not printed */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-card p-4 text-sm shadow-card print:hidden">
        <QuoteStatusBadge status={status} />
        {quote.sentAt && <span className="text-muted-foreground">Sent {format(new Date(quote.sentAt), 'MMM d, yyyy')}</span>}
        {quote.decidedAt && <span className="text-muted-foreground">{quote.status === 'accepted' ? 'Accepted' : 'Declined'} {format(new Date(quote.decidedAt), 'MMM d, yyyy')}</span>}
        {deal && <Link to={`/deals/${deal.id}`} className="text-accent hover:underline">Deal: {deal.title}</Link>}
        {quote.invoiceId && (
          <Link to={`/invoices/${quote.invoiceId}`} className="text-accent hover:underline">
            Invoice: {invoice?.invoiceNumber || 'view'}
          </Link>
        )}
      </div>

      {/* Printable document (shares the invoice print styles) */}
      <div className="overflow-hidden rounded-xl bg-card shadow-card-hover">
        <div id="invoice-print-area" className="bg-white p-8 lg:p-12">
          <div className="relative mb-8">
            <div className="absolute -mx-8 -mt-8 left-0 right-0 top-0 h-2 rounded-t-lg bg-[#ea0027] lg:-mx-12 lg:-mt-12" />
            <div className="flex flex-col gap-6 pt-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                {company.logo ? (
                  <img src={company.logo} alt={company.name} className="h-20 w-20 rounded-lg border border-gray-100 object-contain" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-[#ea0027] text-white">
                    <Building2 className="h-10 w-10" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{company.name || 'Your Company'}</h2>
                  <p className="mt-1 max-w-xs whitespace-pre-line text-sm text-gray-600">{company.address}</p>
                  {company.email && <p className="text-sm text-gray-600">{company.email}</p>}
                  {company.phone && <p className="text-sm text-gray-600">{company.phone}</p>}
                  {company.website && <p className="text-sm text-gray-600">{company.website}</p>}
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-4xl font-bold tracking-tight text-[#ea0027]">QUOTATION</h1>
                <p className="mt-2 font-mono text-xl font-semibold text-gray-900">{quote.quoteNumber}</p>
                {quote.title && <p className="mt-1 text-sm text-gray-600">{quote.title}</p>}
              </div>
            </div>
          </div>

          <div className="mb-8 border-b-2 border-gray-100" />

          <div className="mb-10 grid gap-8 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#ea0027]">Prepared for</h3>
              <p className="text-lg font-semibold text-gray-900">{client?.companyName || client?.name}</p>
              {contact && <p className="font-medium text-gray-700">Attn: {contact.fullName}{contact.jobTitle ? `, ${contact.jobTitle}` : ''}</p>}
              {client?.address && <p className="mt-1 whitespace-pre-line text-gray-600">{client.address}</p>}
              {(contact?.email || client?.email) && <p className="text-gray-600">{contact?.email || client?.email}</p>}
            </div>
            <div className="sm:text-right">
              <div className="inline-block space-y-3 rounded-lg bg-gray-50 p-5 text-left">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Date</p>
                  <p className="text-lg font-medium text-gray-900">{format(parseISO(quote.issueDate), 'MMMM d, yyyy')}</p>
                </div>
                {quote.validUntil && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Valid until</p>
                    <p className="text-lg font-medium text-gray-900">{format(parseISO(quote.validUntil), 'MMMM d, yyyy')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <table className="mb-10 w-full">
            <thead>
              <tr className="bg-[#ea0027]">
                <th className="rounded-tl-lg px-5 py-4 text-left text-sm font-bold uppercase tracking-wider text-white">Description</th>
                <th className="w-24 px-5 py-4 text-right text-sm font-bold uppercase tracking-wider text-white">Qty</th>
                <th className="w-36 px-5 py-4 text-right text-sm font-bold uppercase tracking-wider text-white">Unit price</th>
                <th className="w-40 rounded-tr-lg px-5 py-4 text-right text-sm font-bold uppercase tracking-wider text-white">Amount</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="whitespace-pre-line border-b border-gray-100 px-5 py-4 font-medium text-gray-800">{item.description}</td>
                  <td className="border-b border-gray-100 px-5 py-4 text-right text-gray-700">{item.quantity}</td>
                  <td className="border-b border-gray-100 px-5 py-4 text-right font-mono text-gray-700">{formatMoney(item.unitPrice, quote.currency)}</td>
                  <td className="border-b border-gray-100 px-5 py-4 text-right font-mono font-semibold text-gray-900">
                    {formatMoney(Math.round(item.quantity * item.unitPrice * 100) / 100, quote.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mb-10 flex justify-end">
            <div className="w-80 overflow-hidden rounded-lg bg-gray-50">
              <div className="flex justify-between border-b border-gray-200 px-5 py-3">
                <span className="font-medium text-gray-600">Subtotal</span>
                <span className="font-mono font-semibold text-gray-900">{formatMoney(quote.subtotal, quote.currency)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between border-b border-gray-200 px-5 py-3">
                  <span className="font-medium text-gray-600">Discount</span>
                  <span className="font-mono font-semibold text-gray-900">−{formatMoney(quote.discount, quote.currency)}</span>
                </div>
              )}
              {quote.taxRate > 0 && (
                <div className="flex justify-between border-b border-gray-200 px-5 py-3">
                  <span className="font-medium text-gray-600">Tax ({quote.taxRate}%)</span>
                  <span className="font-mono font-semibold text-gray-900">{formatMoney(quote.taxAmount, quote.currency)}</span>
                </div>
              )}
              <div className="flex justify-between bg-[#ea0027] px-5 py-4">
                <span className="text-lg font-bold text-white">Total</span>
                <span className="font-mono text-lg font-bold text-white">{formatMoney(quote.total, quote.currency)}</span>
              </div>
            </div>
          </div>

          {quote.notes && (
            <div className="mb-6 rounded-lg bg-gray-50 p-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Notes</h3>
              <p className="whitespace-pre-line text-gray-700">{quote.notes}</p>
            </div>
          )}
          {quote.terms && (
            <div className="rounded-lg bg-gray-50 p-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Terms</h3>
              <p className="whitespace-pre-line text-sm text-gray-700">{quote.terms}</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
