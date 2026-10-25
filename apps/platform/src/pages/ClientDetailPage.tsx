import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Edit, Trash2, Plus, Star, Mail, Phone, Globe, FileText, FolderKanban, Handshake } from 'lucide-react';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { ClientForm } from '@/components/client/ClientForm';
import { ClientStatusBadge } from '@/components/client/ClientStatusBadge';
import { StatusBadge } from '@/components/invoice/InvoiceHelpers';
import { ProjectStatusBadge } from '@/components/project/ProjectStatusBadge';
import { ContactForm } from '@/components/crm/ContactForm';
import { DealForm } from '@/components/crm/DealForm';
import { DealStageBadge, QuoteStatusBadge } from '@/components/crm/Badges';
import { ActivityFeed } from '@/components/crm/ActivityFeed';
import { FollowUpPanel } from '@/components/crm/FollowUpPanel';
import { Contact, OPEN_DEAL_STAGES, effectiveQuoteStatus } from '@/types/crm';
import { Client } from '@/types/invoice';
import { formatMoney, formatTotals, sumByCurrency } from '@/lib/money';
import { DealInput } from '@/hooks/useSalesStore';

function Section({ title, icon: Icon, action, children }: { title: string; icon: typeof FileText; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h2>
        {action}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="p-5 text-center text-sm text-muted-foreground">{children}</p>;
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getClient, updateClient, deleteClient, invoices, projects, company, isLoading } = useAppStore();
  const { deals, quotes, addDeal, getContactsForClient, addContact, updateContact, deleteContact, getMemberName } = useSales();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDealOpen, setIsDealOpen] = useState(false);
  const [contactDialog, setContactDialog] = useState<{ open: boolean; contact?: Contact }>({ open: false });

  const client = id ? getClient(id) : undefined;

  const related = useMemo(() => {
    if (!id) return null;
    const clientInvoices = invoices.filter((i) => i.clientId === id);
    const clientDeals = deals.filter((d) => d.clientId === id);
    return {
      invoices: clientInvoices,
      deals: clientDeals,
      quotes: quotes.filter((q) => q.clientId === id),
      projects: projects.filter((p) => p.clientId === id),
      billed: sumByCurrency(clientInvoices, (i) => i.total, (i) => i.currency),
      received: sumByCurrency(clientInvoices, (i) => i.amountReceived || 0, (i) => i.currency),
      openPipeline: sumByCurrency(clientDeals.filter((d) => OPEN_DEAL_STAGES.includes(d.stage)), (d) => d.value, (d) => d.currency),
    };
  }, [id, invoices, deals, quotes, projects]);

  if (!client || !related || !id) {
    return (
      <AppLayout>
        <PageHeader title={isLoading ? 'Loading…' : 'Account not found'} />
        <Link to="/clients" className="text-accent hover:underline">Back to Clients</Link>
      </AppLayout>
    );
  }

  const contacts = getContactsForClient(id);
  const fallback = company.defaultCurrency || 'LKR';
  const displayName = client.companyName || client.name;

  const handleUpdate = (data: Omit<Client, 'id' | 'createdAt'>) => {
    updateClient(id, data);
    setIsEditOpen(false);
  };

  const handleAddDeal = async (data: DealInput) => {
    const created = await addDeal(data);
    if (created) {
      setIsDealOpen(false);
      navigate(`/deals/${created.id}`);
    }
  };

  const handleSaveContact = async (data: Omit<Contact, 'id' | 'clientId' | 'createdAt'>) => {
    if (contactDialog.contact) await updateContact(contactDialog.contact.id, data);
    else await addContact(id, data);
    setContactDialog({ open: false });
  };

  const handleDelete = () => {
    if (related.invoices.length > 0 || related.quotes.length > 0) return;
    deleteClient(id);
    navigate('/clients');
  };
  const canDelete = related.invoices.length === 0 && related.quotes.length === 0;

  const facts = [
    { label: 'Owner', value: getMemberName(client.ownerId) },
    { label: 'Industry', value: client.industry },
    { label: 'Country', value: client.country },
    { label: 'Source', value: client.source },
    { label: 'Last contacted', value: client.lastContactedAt ? formatDistanceToNow(new Date(client.lastContactedAt), { addSuffix: true }) : 'Never' },
    { label: 'Customer since', value: format(new Date(client.createdAt), 'MMM yyyy') },
  ].filter((f) => f.value);

  return (
    <AppLayout>
      <Link to="/clients" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Clients
      </Link>

      <PageHeader
        title={displayName}
        description={client.companyName && client.name !== client.companyName ? client.name : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button className="gap-2 bg-accent hover:bg-accent/90" onClick={() => setIsDealOpen(true)}>
              <Plus className="h-4 w-4" />
              New Deal
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setIsEditOpen(true)}>
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Delete account">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete account</AlertDialogTitle>
                  <AlertDialogDescription>
                    {canDelete
                      ? `Delete ${displayName} with its contacts, deals, activities and follow-ups? This cannot be undone.`
                      : `${displayName} has invoices or quotes, which are financial records. Delete those first, or set the account to Inactive instead.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  {canDelete && (
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      {/* Summary strip */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-border bg-card p-4 shadow-card text-sm">
        <ClientStatusBadge status={client.status} />
        {client.email && (
          <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <Mail className="h-4 w-4" />{client.email}
          </a>
        )}
        {client.phone && (
          <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <Phone className="h-4 w-4" />{client.phone}
          </a>
        )}
        {client.website && (
          <a href={/^https?:\/\//.test(client.website) ? client.website : `https://${client.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <Globe className="h-4 w-4" />{client.website}
          </a>
        )}
        <span className="ml-auto flex flex-wrap gap-x-6 gap-y-1">
          <span><span className="text-muted-foreground">Open pipeline </span><span className="font-semibold">{formatTotals(related.openPipeline, fallback)}</span></span>
          <span><span className="text-muted-foreground">Billed </span><span className="font-semibold">{formatTotals(related.billed, fallback)}</span></span>
          <span><span className="text-muted-foreground">Received </span><span className="font-semibold">{formatTotals(related.received, fallback)}</span></span>
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section
            title="Deals"
            icon={Handshake}
            action={<Button size="sm" variant="outline" className="gap-1" onClick={() => setIsDealOpen(true)}><Plus className="h-3.5 w-3.5" />Add</Button>}
          >
            {related.deals.length === 0 ? <Empty>No deals yet.</Empty> : related.deals.map((d) => (
              <Link key={d.id} to={`/deals/${d.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/50">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{d.title}</span>
                  <span className="text-xs text-muted-foreground">{getMemberName(d.ownerId)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-sm">{formatMoney(d.value, d.currency)}</span>
                  <DealStageBadge stage={d.stage} />
                </span>
              </Link>
            ))}
          </Section>

          <ActivityFeed clientId={id} />

          <div className="grid gap-6 md:grid-cols-2">
            <Section
              title="Quotes"
              icon={FileText}
              action={<Button size="sm" variant="outline" className="gap-1" onClick={() => navigate(`/quotes/new?clientId=${id}`)}><Plus className="h-3.5 w-3.5" />New</Button>}
            >
              {related.quotes.length === 0 ? <Empty>No quotes.</Empty> : related.quotes.map((q) => (
                <Link key={q.id} to={`/quotes/${q.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/50">
                  <span className="text-sm font-medium">{q.quoteNumber}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-sm">{formatMoney(q.total, q.currency)}</span>
                    <QuoteStatusBadge status={effectiveQuoteStatus(q)} />
                  </span>
                </Link>
              ))}
            </Section>
            <Section title="Invoices" icon={FileText}>
              {related.invoices.length === 0 ? <Empty>No invoices.</Empty> : related.invoices.map((inv) => (
                <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/50">
                  <span className="text-sm font-medium">{inv.invoiceNumber}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-sm">{formatMoney(inv.total, inv.currency)}</span>
                    <StatusBadge status={inv.status} />
                  </span>
                </Link>
              ))}
            </Section>
          </div>
        </div>

        <div className="space-y-6">
          <Section
            title="Contacts"
            icon={Star}
            action={<Button size="sm" variant="outline" className="gap-1" onClick={() => setContactDialog({ open: true })}><Plus className="h-3.5 w-3.5" />Add</Button>}
          >
            {contacts.length === 0 ? <Empty>No contacts.</Empty> : contacts.map((c) => (
              <div key={c.id} className="group px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      {c.fullName}
                      {c.isPrimary && <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-label="Primary contact" />}
                    </p>
                    {c.jobTitle && <p className="text-xs text-muted-foreground">{c.jobTitle}</p>}
                    {c.email && <a href={`mailto:${c.email}`} className="block truncate text-xs text-muted-foreground hover:underline">{c.email}</a>}
                    {c.phone && <a href={`tel:${c.phone}`} className="block text-xs text-muted-foreground hover:underline">{c.phone}</a>}
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => setContactDialog({ open: true, contact: c })} title="Edit contact">
                      <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => deleteContact(c.id)} title="Delete contact">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </Section>

          <FollowUpPanel clientId={id} />

          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-3 font-semibold">Details</h2>
            <dl className="space-y-2 text-sm">
              {facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="text-right font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
            {client.address && <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{client.address}</p>}
            {client.notes && <p className="mt-3 whitespace-pre-line border-t border-border pt-3 text-sm">{client.notes}</p>}
          </div>

          <Section title="Projects" icon={FolderKanban}>
            {related.projects.length === 0 ? <Empty>No projects.</Empty> : related.projects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/50">
                <span className="truncate text-sm font-medium">{p.name}</span>
                <ProjectStatusBadge status={p.status} />
              </Link>
            ))}
          </Section>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>Update the account's details.</DialogDescription>
          </DialogHeader>
          <ClientForm initialData={client} onSubmit={handleUpdate} onCancel={() => setIsEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isDealOpen} onOpenChange={setIsDealOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>New Deal</DialogTitle>
            <DialogDescription>For {displayName}</DialogDescription>
          </DialogHeader>
          <DealForm clientId={id} onSubmit={handleAddDeal} onCancel={() => setIsDealOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={contactDialog.open} onOpenChange={(open) => !open && setContactDialog({ open: false })}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{contactDialog.contact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
            <DialogDescription>A person at {displayName}</DialogDescription>
          </DialogHeader>
          <ContactForm
            key={contactDialog.contact?.id || 'new'}
            initialData={contactDialog.contact}
            onSubmit={handleSaveContact}
            onCancel={() => setContactDialog({ open: false })}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
