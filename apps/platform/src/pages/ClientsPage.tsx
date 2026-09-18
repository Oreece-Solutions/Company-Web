import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Users, Edit, Trash2 } from 'lucide-react';
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
import { Client } from '@/types/invoice';

export default function ClientsPage() {
  const { clients, addClient, updateClient, deleteClient, invoices } = useAppStore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    
    const searchLower = search.toLowerCase();
    return clients.filter(client => 
      client.name.toLowerCase().includes(searchLower) ||
      client.companyName?.toLowerCase().includes(searchLower) ||
      client.email.toLowerCase().includes(searchLower)
    );
  }, [clients, search]);

  const getClientInvoiceCount = (clientId: string) => {
    return invoices.filter(inv => inv.clientId === clientId).length;
  };

  const handleAddClient = (data: Omit<Client, 'id' | 'createdAt'>) => {
    addClient(data);
    setIsAddOpen(false);
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
    if (invoiceCount > 0) {
      toast({
        title: 'Cannot delete client',
        description: `This client has ${invoiceCount} invoice(s). Delete the invoices first.`,
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
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent hover:bg-accent/90">
                <Plus className="h-4 w-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>
                  Enter the client's information below.
                </DialogDescription>
              </DialogHeader>
              <ClientForm onSubmit={handleAddClient} onCancel={() => setIsAddOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
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
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id} className="group">
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.companyName || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.email}</TableCell>
                  <TableCell className="text-muted-foreground">{client.phone}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-muted text-sm font-medium">
                      {getClientInvoiceCount(client.id)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <DialogContent className="sm:max-w-[500px]">
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
    </AppLayout>
  );
}
