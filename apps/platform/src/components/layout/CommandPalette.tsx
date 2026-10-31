import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSignature, FileText, FolderKanban, Handshake, Plus, Radar, Users } from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@company-web/shared/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/contexts/StoreContext';
import { useSales } from '@/contexts/SalesContext';
import { useHq } from '@/contexts/HqContext';
import { Access, hasAccess } from '@/lib/access';
import { sections } from './nav';

const OPEN_EVENT = 'oreece:open-search';

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const ACTIONS: { name: string; href: string; need: Access }[] = [
  { name: 'Add a lead', href: '/leads?new=1', need: 'sell' },
  { name: 'New deal', href: '/pipeline?new=1', need: 'sell' },
  { name: 'New quote', href: '/quotes/new', need: 'sell' },
  { name: 'New invoice', href: '/invoices/new', need: 'bill' },
];

// ⌘K / Ctrl+K: jump to any screen, record or common action from anywhere.
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const { clients, invoices, projects } = useAppStore();
  const { deals, quotes } = useSales();
  const { prospects } = useHq();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  if (!user || !roles?.length) return null;

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };
  const can = (need: Access) => hasAccess(roles, need);
  const clientName = (id: string) => {
    const c = clients.find((x) => x.id === id);
    return c?.companyName || c?.name || '';
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search clients, leads, deals, invoices, projects or screens…" />
      <CommandList>
        <CommandEmpty>Nothing found.</CommandEmpty>
        <CommandGroup heading="Go to">
          {sections.flatMap((s) => s.items).filter((i) => can(i.need ?? 'team')).map((i) => (
            <CommandItem key={i.href} value={`screen ${i.name}`} onSelect={() => go(i.href)}>
              <i.icon className="mr-2 h-4 w-4" />{i.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Create">
          {ACTIONS.filter((a) => can(a.need)).map((a) => (
            <CommandItem key={a.href} value={`create ${a.name}`} onSelect={() => go(a.href)}>
              <Plus className="mr-2 h-4 w-4" />{a.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        {can('bill') && (
          <CommandGroup heading="Clients">
            {clients.map((c) => (
              <CommandItem key={c.id} value={`client ${c.companyName ?? ''} ${c.name} ${c.email ?? ''} ${c.id}`} onSelect={() => go(`/clients/${c.id}`)}>
                <Users className="mr-2 h-4 w-4" />{c.companyName || c.name}
                {c.companyName && <span className="ml-2 text-xs text-muted-foreground">{c.name}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {can('sell') && (
          <>
            <CommandGroup heading="Leads">
              {prospects.map((p) => (
                <CommandItem key={p.id} value={`lead ${p.businessName} ${p.location ?? ''} ${p.id}`} onSelect={() => go(`/leads?view=all&open=${p.id}`)}>
                  <Radar className="mr-2 h-4 w-4" />{p.businessName}
                  {p.location && <span className="ml-2 text-xs text-muted-foreground">{p.location}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Deals">
              {deals.map((d) => (
                <CommandItem key={d.id} value={`deal ${d.title} ${clientName(d.clientId)} ${d.id}`} onSelect={() => go(`/deals/${d.id}`)}>
                  <Handshake className="mr-2 h-4 w-4" />{d.title}
                  <span className="ml-2 text-xs text-muted-foreground">{clientName(d.clientId)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Quotes">
              {quotes.map((q) => (
                <CommandItem key={q.id} value={`quote ${q.quoteNumber} ${q.title ?? ''} ${clientName(q.clientId)} ${q.id}`} onSelect={() => go(`/quotes/${q.id}`)}>
                  <FileSignature className="mr-2 h-4 w-4" />{q.quoteNumber}
                  <span className="ml-2 text-xs text-muted-foreground">{q.title || clientName(q.clientId)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Projects">
              {projects.map((p) => (
                <CommandItem key={p.id} value={`project ${p.name} ${clientName(p.clientId)} ${p.id}`} onSelect={() => go(`/projects/${p.id}`)}>
                  <FolderKanban className="mr-2 h-4 w-4" />{p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {can('bill') && (
          <CommandGroup heading="Invoices">
            {invoices.map((inv) => (
              <CommandItem key={inv.id} value={`invoice ${inv.invoiceNumber} ${clientName(inv.clientId)} ${inv.id}`} onSelect={() => go(`/invoices/${inv.id}`)}>
                <FileText className="mr-2 h-4 w-4" />{inv.invoiceNumber}
                <span className="ml-2 text-xs text-muted-foreground">{clientName(inv.clientId)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
