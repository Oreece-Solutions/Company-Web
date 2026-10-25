import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Users, Edit, Trash2, MessageSquareText, Upload, Download } from 'lucide-react';
import { downloadCsv } from '@/lib/csv';
import { CsvImportDialog } from '@/components/hq/CsvImportDialog';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { format, formatDistanceToNow } from 'date-fns';
import { ClientStatusBadge } from '@/components/client/ClientStatusBadge';
import { ClientActivityLog } from '@/components/client/ClientActivityLog';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@company-web/shared/ui';
import { ClientForm } from '@/components/client/ClientForm';
import { useToast } from '@company-web/shared/utils';
import { Client, ClientStatus } from '@/types/invoice';

const STATUS_TABS: { value: ClientStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'lead', label: 'Leads' },
  { value: 'prospect', label: 'Prospects' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function ClientsPage() {
  const navigate = useNavigate();
  const { clients, addClient, updateClient, deleteClient, invoices } = useAppStore();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const { refetchContacts, quotes, getMemberName } = useSales();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [activityClient, setActivityClient] = useState<Client | null>(null);

  const filteredClients = useMemo(() => {
    let result = clients;
    if (statusFilter !== 'all') {
      result = result.filter(client => client.status === statusFilter);
    }
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(client =>
        client.name.toLowerCase().includes(searchLower) ||
        client.companyName?.toLowerCase().includes(searchLower) ||
        client.email.toLowerCase().includes(searchLower)
      );
    }
    return result;
  }, [clients, search, statusFilter]);

  const getClientInvoiceCount = (clientId: string) => {
    return invoices.filter(inv => inv.clientId === clientId).length;
  };

  const handleAddClient = async (data: Omit<Client, 'id' | 'createdAt'>) => {
    const created = await addClient(data);
    setIsAddOpen(false);
    if (created) {
      // The database adds the primary contact; load it, then open the account.
      await refetchContacts();
      navigate(`/clients/${created.id}`);
    }
    toast({
      title: 'Client added',
      description: `${data.name} has been added to your clients.`,
    });
  };

  const handleUpdateClient = (data: Omit<Client, 'id' | 'createdAt'>) => {
    if (editingClient) {
      updateClient(editingClient.id, data);
      setEditingClient(null);
      toast({
        title: 'Client updated',
        description: 'Client information has been updated.',
      });
    }
  };

  const handleDeleteClient = (client: Client) => {
    const invoiceCount = getClientInvoiceCount(client.id);
    const quoteCount = quotes.filter(q => q.clientId === client.id).length;
    if (invoiceCount > 0 || quoteCount > 0) {
      toast({
        title: 'Cannot delete client',
        description: `This client has ${invoiceCount} invoice(s) and ${quoteCount} quote(s). Set it to Inactive instead.`,
        variant: 'destructive',
      });
      return;
    }
    deleteClient(client.id);
    toast({
      title: 'Client deleted',
      description: 'The client has been permanently deleted.',
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Clients"
        description="Manage your client database"
        actions={
          <>
          <Button variant="outline" className="gap-2" onClick={() => downloadCsv(`oreece-clients-${format(new Date(), 'yyyy-MM-dd')}.csv`, filteredClients.map((c) => ({ company_name: c.companyName, contact_name: c.name, email: c.email, phone: c.phone, website: c.website, industry: c.industry, status: c.status, source: c.source, country: c.country, notes: c.notes })))}>
              <Download className="h-4 w-4" />Export
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setIsImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent hover:bg-accent/90">
                <Plus className="h-4 w-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>
                  Enter the client's information below.
                </DialogDescription>
              </DialogHeader>
              <ClientForm onSubmit={handleAddClient} onCancel={() => setIsAddOpen(false)} />
            </DialogContent>
          </Dialog>
          </>
        }
      />

      {/* Search + pipeline filter */}
      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
      >
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No clients yet</h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'No clients match your search' : 'Add your first client to get started'}
            </p>
            {!search && (
              <Button onClick={() => setIsAddOpen(true)} className="gap-2 bg-accent hover:bg-accent/90">
                <Plus className="h-4 w-4" />
                Add Client
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Last contact</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id} className="group cursor-pointer" onClick={() => navigate(`/clients/${client.id}`)}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.companyName || '-'}
                  </TableCell>
                  <TableCell><ClientStatusBadge status={client.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{client.email}</TableCell>
                  <TableCell className="text-muted-foreground">{getMemberName(client.ownerId)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.lastContactedAt ? formatDistanceToNow(new Date(client.lastContactedAt), { addSuffix: true }) : 'Never'}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-muted text-sm font-medium">
                      {getClientInvoiceCount(client.id)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActivityClient(client)}
                        title="Activity"
                      >
                        <MessageSquareText className="h-4 w-4" />
                      </Button>
                      <Dialog open={editingClient?.id === client.id} onOpenChange={(open) => !open && setEditingClient(null)}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingClient(client)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]" onClick={(e) => e.stopPropagation()}>
                          <DialogHeader>
                            <DialogTitle>Edit Client</DialogTitle>
                            <DialogDescription>
                              Update the client's information below.
                            </DialogDescription>
                          </DialogHeader>
                          <ClientForm
                            initialData={editingClient || undefined}
                            onSubmit={handleUpdateClient}
                            onCancel={() => setEditingClient(null)}
                          />
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Client</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {client.name}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteClient(client)}
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
              ))}
            </TableBody>
          </Table>
        )}
      </motion.div>

      {activityClient && (
        <ClientActivityLog
          client={activityClient}
          open={!!activityClient}
          onOpenChange={(open) => !open && setActivityClient(null)}
        />
      )}
      <CsvImportDialog<Parameters<typeof addClient>[0]>
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        title="Import clients"
        description="Columns: company_name, contact_name, email, phone, website, industry, status (lead/prospect/active/inactive), source, country, notes. Clients that already exist (same company name) are skipped."
        parseRow={(r) => {
          const company = r.company_name || r.company || '';
          const contact = r.contact_name || r.name || company;
          if (!contact) return { ok: false, label: '', error: 'No company or contact name' };
          if (company && clients.some((c) => (c.companyName || c.name).toLowerCase() === company.toLowerCase())) {
            return { ok: false, label: company, error: 'Already exists' };
          }
          const status = (r.status || 'active').toLowerCase() as ClientStatus;
          if (!['lead', 'prospect', 'active', 'inactive'].includes(status)) return { ok: false, label: company || contact, error: `Unknown status "${r.status}"` };
          return {
            ok: true,
            label: company || contact,
            data: {
              name: contact, companyName: company || undefined, email: r.email || '', phone: r.phone || '', address: r.address || '',
              website: r.website || undefined, industry: r.industry || undefined, status, source: r.source || undefined,
              country: r.country || undefined, notes: r.notes || undefined,
            },
          };
        }}
        saveRow={async (d) => ((await addClient(d)) ? null : 'Could not save')}
      />
    </AppLayout>
  );
}
