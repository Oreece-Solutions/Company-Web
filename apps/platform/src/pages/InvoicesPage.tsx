import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Plus, Search, FileText, Eye, Edit, Trash2 } from 'lucide-react';
import { useAppStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@company-web/shared/ui';
import { Input } from '@company-web/shared/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@company-web/shared/ui';
import {
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
import { StatusBadge, CurrencyDisplay } from '@/components/invoice/InvoiceHelpers';
import { useToast } from '@company-web/shared/utils';

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { invoices, clients, getClient, deleteInvoice } = useAppStore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const filteredInvoices = useMemo(() => {
    if (!search.trim()) return invoices;
    
    const searchLower = search.toLowerCase();
    return invoices.filter(invoice => {
      const client = getClient(invoice.clientId);
      return (
        invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
        client?.name.toLowerCase().includes(searchLower) ||
        client?.companyName?.toLowerCase().includes(searchLower)
      );
    });
  }, [invoices, search, getClient]);

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredInvoices]);

  const handleDelete = (id: string) => {
    deleteInvoice(id);
    toast({
      title: 'Invoice deleted',
      description: 'The invoice has been permanently deleted.',
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Invoices"
        description="Create and manage your invoices"
        actions={
          <Button onClick={() => navigate('/invoices/new')} className="gap-2 bg-accent hover:bg-accent/90">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        }
      />

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Invoice List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
      >
        {sortedInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No invoices yet</h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'No invoices match your search' : 'Create your first invoice to get started'}
            </p>
            {!search && (
              <Button onClick={() => navigate('/invoices/new')} className="gap-2 bg-accent hover:bg-accent/90">
                <Plus className="h-4 w-4" />
                Create Invoice
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvoices.map((invoice) => {
                const client = getClient(invoice.clientId);
                return (
                  <TableRow key={invoice.id} className="group">
                    <TableCell className="font-mono font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{client?.name || 'Unknown Client'}</p>
                        {client?.companyName && (
                          <p className="text-sm text-muted-foreground">{client.companyName}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <CurrencyDisplay amount={invoice.total} currency={invoice.currency} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {invoice.status !== 'paid' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Delete">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete invoice {invoice.invoiceNumber}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(invoice.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </motion.div>
    </AppLayout>
  );
}
