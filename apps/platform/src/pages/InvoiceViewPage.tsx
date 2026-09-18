import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { ArrowLeft, Printer, Edit, Plus, Building2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useAppStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@company-web/shared/ui';
import { StatusBadge, CurrencyDisplay } from '@/components/invoice/InvoiceHelpers';
import { useToast } from '@company-web/shared/utils';
import { CURRENCY_SYMBOLS } from '@/types/invoice';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@company-web/shared/ui';
import { Input } from '@company-web/shared/ui';
import { Label } from '@company-web/shared/ui';

export default function InvoiceViewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getInvoice, getClient, company, addPayment, deletePayment } = useAppStore();
  const { toast } = useToast();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  const invoice = getInvoice(id!);
  const client = invoice ? getClient(invoice.clientId) : null;
  const totalPaid = invoice?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const balance = invoice ? invoice.total - totalPaid : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleOpenPaymentDialog = () => {
    if (invoice) {
      // Default to remaining balance
      setPaymentAmount(balance.toString());
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setPaymentReference('');
      setShowPaymentDialog(true);
    }
  };

  const handleConfirmPayment = async () => {
    if (invoice && paymentAmount) {
      const amount = parseFloat(paymentAmount);
      if (amount <= 0) {
        toast({ title: 'Invalid amount', description: 'Payment amount must be greater than 0', variant: 'destructive' });
        return;
      }
      await addPayment(invoice.id, {
        paymentDate,
        amount,
        reference: paymentReference.trim() || undefined,
      });
      setShowPaymentDialog(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (invoice) {
      await deletePayment(paymentId, invoice.id);
    }
  };

  if (!invoice) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Invoice not found</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title={invoice.invoiceNumber}
        description={`Invoice for ${client?.name || 'Unknown Client'}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/invoices')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {invoice.status !== 'paid' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={handleOpenPaymentDialog}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Record Payment
                </Button>
              </>
            )}
            <Button onClick={handlePrint} className="gap-2 bg-primary hover:bg-primary/90">
              <Printer className="h-4 w-4" />
              Print Invoice
            </Button>
          </div>
        }
      />

      {/* Invoice Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-card rounded-xl shadow-card-hover overflow-hidden"
      >
        <div
          ref={invoiceRef}
          id="invoice-print-area"
          className="bg-white p-8 lg:p-12"
          style={{ minHeight: '900px' }}
        >
          {/* Header with Brand Stripe */}
          <div className="relative mb-8">
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#ea0027] rounded-t-lg -mx-8 lg:-mx-12 -mt-8 lg:-mt-12" />
            
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pt-6">
              {/* Company Info */}
              <div className="flex items-start gap-4">
                {company.logo ? (
                  <img
                    src={company.logo}
                    alt={company.name}
                    className="h-20 w-20 rounded-lg object-contain border border-gray-100"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-[#ea0027] text-white">
                    <Building2 className="h-10 w-10" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {company.name || 'Your Company'}
                  </h2>
                  <p className="text-sm text-gray-600 whitespace-pre-line mt-1 max-w-xs">
                    {company.address || 'Company Address'}
                  </p>
                  {company.email && (
                    <p className="text-sm text-gray-600">{company.email}</p>
                  )}
                  {company.phone && (
                    <p className="text-sm text-gray-600">{company.phone}</p>
                  )}
                  {company.website && (
                    <p className="text-sm text-gray-600">{company.website}</p>
                  )}
                  {company.taxNumber && (
                    <p className="text-sm text-gray-500 mt-1">BR No: {company.taxNumber}</p>
                  )}
                </div>
              </div>

              {/* Invoice Title */}
              <div className="text-right">
                <h1 className="text-4xl font-bold text-[#ea0027] tracking-tight">INVOICE</h1>
                <p className="text-xl font-mono font-semibold text-gray-900 mt-2">
                  {invoice.invoiceNumber}
                </p>
                <div className="mt-3">
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-b-2 border-gray-100 mb-8" />

          {/* Bill To & Dates */}
          <div className="grid sm:grid-cols-2 gap-8 mb-10">
            <div className="bg-gray-50 rounded-lg p-5">
              <h3 className="text-xs font-bold text-[#ea0027] uppercase tracking-widest mb-3">
                Bill To
              </h3>
              <p className="text-lg font-semibold text-gray-900">{client?.name || 'Client Name'}</p>
              {client?.companyName && (
                <p className="text-gray-700 font-medium">{client.companyName}</p>
              )}
              <p className="text-gray-600 whitespace-pre-line mt-1">{client?.address}</p>
              {client?.email && <p className="text-gray-600">{client.email}</p>}
              {client?.phone && <p className="text-gray-600">{client.phone}</p>}
            </div>
            <div className="sm:text-right">
              <div className="inline-block text-left bg-gray-50 rounded-lg p-5">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice Date</p>
                    <p className="text-lg font-medium text-gray-900">
                      {format(new Date(invoice.invoiceDate), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Due Date</p>
                    <p className="text-lg font-medium text-gray-900">
                      {format(new Date(invoice.dueDate), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Services Table */}
          <div className="mb-10">
            <table className="w-full">
              <thead>
                <tr className="bg-[#ea0027]">
                  <th className="text-left py-4 px-5 text-sm font-bold text-white uppercase tracking-wider rounded-tl-lg">
                    Service Description
                  </th>
                  <th className="text-right py-4 px-5 text-sm font-bold text-white uppercase tracking-wider rounded-tr-lg w-40">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-4 px-5 text-gray-800 font-medium border-b border-gray-100">
                      {item.description}
                    </td>
                    <td className="py-4 px-5 text-right font-semibold text-gray-900 border-b border-gray-100">
                      <CurrencyDisplay amount={item.amount} currency={invoice.currency} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-10">
            <div className="w-80">
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <div className="flex justify-between py-3 px-5 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Subtotal</span>
                  <span className="font-semibold text-gray-900">
                    <CurrencyDisplay amount={invoice.subtotal} currency={invoice.currency} />
                  </span>
                </div>
                <div className="flex justify-between py-3 px-5 border-b border-gray-200 bg-[#ea0027]">
                  <span className="text-lg font-bold text-white">Total</span>
                  <span className="text-lg font-bold text-white">
                    {CURRENCY_SYMBOLS[invoice.currency]} {invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {invoice.status === 'paid' && (
                  <>
                    <div className="flex justify-between py-3 px-5 border-b border-gray-200">
                      <span className="text-gray-600 font-medium">Total Received</span>
                      <span className="font-semibold text-green-600">
                        <CurrencyDisplay amount={totalPaid} currency={invoice.currency} />
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between py-4 px-5 bg-gray-800">
                  <span className="text-lg font-bold text-white">
                    {invoice.status === 'paid' ? 'Balance' : 'Amount Due'}
                  </span>
                  <span className="text-lg font-bold text-white">
                    {CURRENCY_SYMBOLS[invoice.currency]} {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 mb-8">
              <h3 className="text-xs font-bold text-green-700 uppercase tracking-widest mb-3">
                Payment History
              </h3>
              <div className="space-y-2">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-2 px-3 bg-white rounded border border-green-100">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        {format(new Date(payment.paymentDate), 'MMMM d, yyyy')}
                      </span>
                      {payment.reference && (
                        <span className="text-sm text-gray-500 ml-2">• Ref: {payment.reference}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-green-600">
                        <CurrencyDisplay amount={payment.amount} currency={invoice.currency} />
                      </span>
                      {invoice.status !== 'paid' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePayment(payment.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 print:hidden"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-gray-50 rounded-lg p-5 mb-8">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                Notes & Payment Terms
              </h3>
              <p className="text-gray-700 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

          {/* Bank Details - Only show for unpaid invoices */}
          {invoice.status !== 'paid' && (
            <div className="bg-gray-50 rounded-lg p-5 mb-8">
              <h3 className="text-xs font-bold text-[#ea0027] uppercase tracking-widest mb-3">
                Bank Details for Payment
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-gray-600">Bank Name:</p>
                <p className="text-gray-900 font-medium">{company.bankDetails?.bankName || '-'}</p>
                <p className="text-gray-600">Account Name:</p>
                <p className="text-gray-900 font-medium">{company.bankDetails?.accountName || '-'}</p>
                <p className="text-gray-600">Account Type:</p>
                <p className="text-gray-900 font-medium">{company.bankDetails?.accountType || '-'}</p>
                <p className="text-gray-600">Account Number:</p>
                <p className="text-gray-900 font-medium">{company.bankDetails?.accountNumber || '-'}</p>
                <p className="text-gray-600">Branch:</p>
                <p className="text-gray-900 font-medium">{company.bankDetails?.branch || '-'}</p>
              </div>
            </div>
          )}

          {/* Signature */}
          {company.signature && (
            <div className="flex justify-end mb-8">
              <div className="text-center">
                <img 
                  src={company.signature} 
                  alt="Authorized Signature" 
                  className="h-16 object-contain mb-2"
                />
                <div className="border-t border-gray-300 pt-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Authorized Signature</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Confirmation for Paid Invoices */}
          {invoice.status === 'paid' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 mb-8 text-center">
              <p className="text-green-700 font-semibold text-lg">Thank you for your payment!</p>
              <p className="text-green-600 text-sm mt-1">
                Full payment of <CurrencyDisplay amount={totalPaid} currency={invoice.currency} /> received
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t-2 border-gray-100 pt-6 text-center">
            <p className="text-gray-500 text-sm">
              This is a system-generated invoice and is valid without a signature.
            </p>
            <p className="text-gray-600 text-sm mt-3">
              Thank you for your business.
            </p>
            <p className="text-gray-700 font-semibold text-sm mt-1">
              {company.name || 'Oreece Business Solutions'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">
                Amount ({CURRENCY_SYMBOLS[invoice?.currency || 'LKR']})
                <span className="text-muted-foreground font-normal ml-2">
                  Balance: {CURRENCY_SYMBOLS[invoice?.currency || 'LKR']}{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={balance}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={balance.toString()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentReference">Reference Number (Optional)</Label>
              <Input
                id="paymentReference"
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g., Bank transfer ref, check number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentReference">Reference Number (Optional)</Label>
              <Input
                id="paymentReference"
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g., Bank transfer ref, check number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayment} className="bg-primary hover:bg-primary/90">
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
